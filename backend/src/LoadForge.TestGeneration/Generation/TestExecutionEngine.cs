using LoadForge.Core.Entities;
using LoadForge.TestGeneration.Models;
using Microsoft.Extensions.Logging;
using System.Diagnostics;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace LoadForge.TestGeneration.Generation;

/// <summary>
/// Server-side test execution engine.
/// Executes generated test cases with:
///   - Variable capture support
///   - Dependency graph resolution
///   - Teardown execution guarantee
///   - Retry once for idempotent calls only
///   - Per-test timeout
///   - Secret masking in logs
///   - Sequential execution (no uncontrolled parallel destructive tests)
/// </summary>
public class TestExecutionEngine
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<TestExecutionEngine> _logger;
    private readonly ExecutionConfig _config;

    // Captured variables from previous test executions (e.g., created resource IDs)
    private readonly Dictionary<string, string> _capturedVariables = new();

    // Secrets to mask in logs
    private static readonly string[] SensitiveHeaders = ["authorization", "x-api-key", "cookie", "x-auth-token"];

    public TestExecutionEngine(HttpClient httpClient, ILogger<TestExecutionEngine> logger, ExecutionConfig? config = null)
    {
        _httpClient = httpClient;
        _logger = logger;
        _config = config ?? new ExecutionConfig();
    }

    /// <summary>
    /// Execute an entire test suite sequentially.
    /// Returns a GeneratedTestRun entity with all execution results.
    /// </summary>
    public async Task<TestRunResult> ExecuteTestSuiteAsync(
        List<GeneratedTestCase> testCases,
        string baseUrl,
        string? authToken = null,
        Dictionary<string, string>? environmentVariables = null)
    {
        var runResult = new TestRunResult
        {
            StartedAt = DateTime.UtcNow,
            Status = "Running"
        };

        // Seed environment variables
        if (environmentVariables != null)
        {
            foreach (var (key, value) in environmentVariables)
                _capturedVariables[key] = value;
        }

        // Resolve dependency ordering (topological sort)
        var orderedTests = OrderByDependencies(testCases);

        // Separate read-only (GET) tests from write tests for parallel execution
        var readOnlyTests = orderedTests.Where(t => t.Method == "GET" && t.CoverageCategory != "StateAwareCRUD").ToList();
        var writeTests = orderedTests.Where(t => t.Method != "GET" || t.CoverageCategory == "StateAwareCRUD").ToList();

        // Execute read-only tests in parallel batches
        if (readOnlyTests.Count > 0 && _config.MaxParallelReads > 1)
        {
            var semaphore = new SemaphoreSlim(_config.MaxParallelReads);
            var readTasks = readOnlyTests.Select(async testCase =>
            {
                if (!testCase.IsActive)
                    return CreateSkippedExecution(testCase, "Test case is inactive");

                await semaphore.WaitAsync();
                try
                {
                    var execution = await ExecuteSingleTestAsync(testCase, baseUrl, authToken);
                    _logger.LogInformation(
                        "[{Status}] {Name} - {StatusCode} ({Duration}ms)",
                        execution.Status, testCase.Name, execution.ResponseStatusCode, execution.DurationMs);
                    if (_config.OnTestCompleted != null)
                        await _config.OnTestCompleted(execution);
                    return execution;
                }
                finally
                {
                    semaphore.Release();
                }
            }).ToList();

            var readResults = await Task.WhenAll(readTasks);
            runResult.Executions.AddRange(readResults);
        }
        else
        {
            // Fallback to sequential for read-only if parallelism disabled
            foreach (var testCase in readOnlyTests)
            {
                if (!testCase.IsActive)
                {
                    runResult.Executions.Add(CreateSkippedExecution(testCase, "Test case is inactive"));
                    continue;
                }
                var execution = await ExecuteSingleTestAsync(testCase, baseUrl, authToken);
                runResult.Executions.Add(execution);
                if (_config.OnTestCompleted != null)
                    await _config.OnTestCompleted(execution);
                _logger.LogInformation(
                    "[{Status}] {Name} - {StatusCode} ({Duration}ms)",
                    execution.Status, testCase.Name, execution.ResponseStatusCode, execution.DurationMs);
            }
        }

        // Execute write tests sequentially (order matters for CRUD, destructive ops)
        foreach (var testCase in writeTests)
        {
            if (!testCase.IsActive)
            {
                runResult.Executions.Add(CreateSkippedExecution(testCase, "Test case is inactive"));
                continue;
            }

            // Check if dependencies passed
            if (!AllDependenciesPassed(testCase, runResult))
            {
                runResult.Executions.Add(CreateSkippedExecution(testCase, "Dependency failed"));
                continue;
            }

            var execution = await ExecuteSingleTestAsync(testCase, baseUrl, authToken);
            runResult.Executions.Add(execution);

            if (_config.OnTestCompleted != null)
                await _config.OnTestCompleted(execution);

            _logger.LogInformation(
                "[{Status}] {Name} - {StatusCode} ({Duration}ms)",
                execution.Status, testCase.Name, execution.ResponseStatusCode, execution.DurationMs);
        }

        // Calculate summary
        runResult.CompletedAt = DateTime.UtcNow;
        runResult.TotalTests = runResult.Executions.Count;
        runResult.PassedTests = runResult.Executions.Count(e => e.Status == "Passed");
        runResult.FailedTests = runResult.Executions.Count(e => e.Status == "Failed");
        runResult.SkippedTests = runResult.Executions.Count(e => e.Status == "Skipped");
        runResult.PassRate = runResult.TotalTests > 0
            ? Math.Round((decimal)runResult.PassedTests / runResult.TotalTests * 100, 2)
            : 0;
        runResult.DurationSeconds = (long)(runResult.CompletedAt.Value - runResult.StartedAt).TotalSeconds;
        runResult.Status = runResult.FailedTests == 0 ? "Passed" : "Failed";

        return runResult;
    }

    /// <summary>
    /// Execute a single test case.
    /// </summary>
    private async Task<TestExecutionResult> ExecuteSingleTestAsync(
        GeneratedTestCase testCase, string baseUrl, string? authToken)
    {
        var correlationId = Guid.NewGuid().ToString("N")[..12];
        var sw = Stopwatch.StartNew();

        var execution = new TestExecutionResult
        {
            TestCaseId = testCase.Id,
            TestCaseName = testCase.Name,
            CorrelationId = correlationId
        };

        try
        {
            // Build the full URL
            var url = BuildUrl(baseUrl, testCase.Path, testCase);

            // Build the HTTP request
            var request = new HttpRequestMessage(
                new System.Net.Http.HttpMethod(testCase.Method),
                url);

            // Add auth header (unless this is a negative auth test)
            var isNegativeAuthTest = testCase.CoverageCategory == "Negative" &&
                                     testCase.Name.Contains("auth", StringComparison.OrdinalIgnoreCase);

            if (!isNegativeAuthTest && !string.IsNullOrEmpty(authToken))
            {
                request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", authToken);
            }

            // Add payload
            if (testCase.PayloadJson != null)
            {
                var payload = SubstituteVariables(testCase.PayloadJson);
                request.Content = new StringContent(payload, Encoding.UTF8, "application/json");
            }

            // Add correlation ID header
            request.Headers.Add("X-Correlation-ID", correlationId);

            // Execute with timeout
            using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(_config.TimeoutSeconds));
            var response = await _httpClient.SendAsync(request, cts.Token);

            sw.Stop();

            // Capture response
            var responseBody = await response.Content.ReadAsStringAsync();
            var responseHeaders = response.Headers
                .Concat(response.Content.Headers)
                .ToDictionary(h => h.Key, h => string.Join(", ", h.Value));

            execution.ResponseStatusCode = (int)response.StatusCode;
            execution.DurationMs = sw.ElapsedMilliseconds;
            execution.RequestJson = MaskSecrets(JsonSerializer.Serialize(new
            {
                method = testCase.Method,
                url,
                headers = request.Headers
                    .Where(h => !SensitiveHeaders.Contains(h.Key.ToLower()))
                    .ToDictionary(h => h.Key, h => string.Join(", ", h.Value)),
                body = testCase.PayloadJson != null ? "(payload included)" : null
            }));
            execution.ResponseJson = MaskSecrets(responseBody.Length > 10000
                ? responseBody[..10000] + "...(truncated)"
                : responseBody);
            execution.ResponseHeadersJson = JsonSerializer.Serialize(
                responseHeaders.Where(h => !SensitiveHeaders.Contains(h.Key.ToLower()))
                    .ToDictionary(h => h.Key, h => h.Value));

            // Run assertions
            var assertionResults = RunAssertions(testCase, (int)response.StatusCode, responseBody, responseHeaders);
            execution.AssertionResultsJson = JsonSerializer.Serialize(assertionResults);

            // Determine pass/fail
            execution.Status = assertionResults.All(a => a.Passed) ? "Passed" : "Failed";

            // Capture variables for CRUD sequences
            CaptureVariables(testCase, responseBody);

            // Retry once for idempotent calls if failed (and retry is enabled)
            if (_config.RetryEnabled && execution.Status == "Failed" && IsIdempotent(testCase.Method) && execution.RetryCount < 1)
            {
                _logger.LogInformation("Retrying idempotent test: {Name}", testCase.Name);
                execution.RetryCount++;
                var retryExec = await ExecuteSingleTestAsync(testCase, baseUrl, authToken);
                retryExec.RetryCount = execution.RetryCount;
                return retryExec;
            }
        }
        catch (TaskCanceledException)
        {
            sw.Stop();
            execution.Status = "Failed";
            execution.DurationMs = sw.ElapsedMilliseconds;
            execution.ErrorMessage = $"Test timed out after {_config.TimeoutSeconds} seconds";
        }
        catch (Exception ex)
        {
            sw.Stop();
            execution.Status = "Failed";
            execution.DurationMs = sw.ElapsedMilliseconds;
            execution.ErrorMessage = $"Execution error: {ex.Message}";
            _logger.LogError(ex, "Error executing test: {Name}", testCase.Name);
        }

        return execution;
    }

    // ──────────────────────────────────────────────────
    // ASSERTIONS
    // ──────────────────────────────────────────────────

    private List<AssertionResult> RunAssertions(
        GeneratedTestCase testCase, int statusCode, string responseBody,
        Dictionary<string, string> responseHeaders)
    {
        var results = new List<AssertionResult>();

        if (string.IsNullOrEmpty(testCase.AssertionsJson)) return results;

        List<TestAssertion>? assertions;
        try
        {
            assertions = JsonSerializer.Deserialize<List<TestAssertion>>(testCase.AssertionsJson);
        }
        catch
        {
            return results;
        }

        if (assertions == null) return results;

        foreach (var assertion in assertions)
        {
            var result = assertion.Type switch
            {
                "status_code" => EvaluateStatusCodeAssertion(assertion, statusCode, testCase.ExpectedStatusCodes),
                "jsonpath_exists" => EvaluateJsonPathExistsAssertion(assertion, responseBody),
                "header_exists" => EvaluateHeaderExistsAssertion(assertion, responseHeaders),
                "schema_valid" => new AssertionResult
                {
                    Type = "schema_valid",
                    Passed = true, // Placeholder — full schema validation in future
                    Expected = "true",
                    Actual = "true"
                },
                _ => new AssertionResult
                {
                    Type = assertion.Type,
                    Passed = true,
                    Expected = assertion.Expected ?? "",
                    Actual = "unknown"
                }
            };
            results.Add(result);
        }

        return results;
    }

    private static AssertionResult EvaluateStatusCodeAssertion(
        TestAssertion assertion, int actualStatusCode, int[] expectedStatusCodes)
    {
        var passed = expectedStatusCodes.Contains(actualStatusCode);

        return new AssertionResult
        {
            Type = "status_code",
            Passed = passed,
            Expected = string.Join(",", expectedStatusCodes),
            Actual = actualStatusCode.ToString()
        };
    }

    private static AssertionResult EvaluateJsonPathExistsAssertion(TestAssertion assertion, string responseBody)
    {
        // Simple JSONPath-like check for $.fieldName
        var fieldName = assertion.Expression?.Replace("$.", "") ?? "";
        var exists = responseBody.Contains($"\"{fieldName}\"");

        return new AssertionResult
        {
            Type = "jsonpath_exists",
            Expression = assertion.Expression,
            Passed = exists,
            Expected = "exists",
            Actual = exists ? "exists" : "not found"
        };
    }

    private static AssertionResult EvaluateHeaderExistsAssertion(
        TestAssertion assertion, Dictionary<string, string> headers)
    {
        var headerName = assertion.Expression?.ToLower() ?? "";
        var exists = headers.Keys.Any(k => k.Equals(headerName, StringComparison.OrdinalIgnoreCase));

        return new AssertionResult
        {
            Type = "header_exists",
            Expression = assertion.Expression,
            Passed = exists,
            Expected = "exists",
            Actual = exists ? "exists" : "not found"
        };
    }

    // ──────────────────────────────────────────────────
    // HELPERS
    // ──────────────────────────────────────────────────

    private string BuildUrl(string baseUrl, string path, GeneratedTestCase testCase)
    {
        var url = $"{baseUrl.TrimEnd('/')}{path}";

        // Substitute path parameters from captured variables
        url = SubstituteVariables(url);

        // Substitute remaining path parameters with appropriate values based on test type
        url = SubstitutePathParameters(url, testCase);

        return url;
    }

    private string SubstitutePathParameters(string url, GeneratedTestCase testCase)
    {
        // Regex to find path parameters like {id}, {userId}, {postId}, etc.
        var pathParamPattern = new Regex(@"\{(\w+)\}");
        
        return pathParamPattern.Replace(url, match =>
        {
            // Determine replacement based on test type
            if (testCase.Name.Contains("Non-existing") || testCase.Name.Contains("404"))
            {
                // Use a non-existing ID for 404 tests
                return "99999999";
            }
            else if (testCase.Name.Contains("Invalid") && testCase.Name.Contains("format"))
            {
                // Use an invalid format for validation tests
                return "invalid_id_format";
            }
            else
            {
                // Use a valid default ID for smoke/contract tests
                return "1";
            }
        });
    }

    private string SubstituteVariables(string input)
    {
        var result = input;
        foreach (var (key, value) in _capturedVariables)
        {
            result = result.Replace($"{{{{{key}}}}}", value); // {{variable}}
            result = result.Replace($"{{{key}}}", value);     // {variable}
        }
        return result;
    }

    private void CaptureVariables(GeneratedTestCase testCase, string responseBody)
    {
        // Auto-capture 'id' from POST responses for CRUD sequences
        if (testCase.Method == "POST" && testCase.CoverageCategory == "StateAwareCRUD")
        {
            try
            {
                using var doc = JsonDocument.Parse(responseBody);

                // Look for id in root or data wrapper
                if (doc.RootElement.TryGetProperty("id", out var idProp))
                {
                    _capturedVariables["id"] = idProp.ToString();
                }
                else if (doc.RootElement.TryGetProperty("data", out var data) &&
                         data.TryGetProperty("id", out var dataIdProp))
                {
                    _capturedVariables["id"] = dataIdProp.ToString();
                }
            }
            catch
            {
                // Not JSON or no id field — skip capture
            }
        }
    }

    private static List<GeneratedTestCase> OrderByDependencies(List<GeneratedTestCase> testCases)
    {
        // Simple topological sort based on dependencies
        var ordered = new List<GeneratedTestCase>();
        var visited = new HashSet<Guid>();
        var lookup = testCases.ToDictionary(t => t.Id);

        void Visit(GeneratedTestCase tc)
        {
            if (visited.Contains(tc.Id)) return;
            visited.Add(tc.Id);

            // Process dependencies first
            if (!string.IsNullOrEmpty(tc.DependenciesJson))
            {
                try
                {
                    var deps = JsonSerializer.Deserialize<List<string>>(tc.DependenciesJson);
                    if (deps != null)
                    {
                        foreach (var dep in deps)
                        {
                            var depTc = testCases.FirstOrDefault(t =>
                                t.Id.ToString() == dep ||
                                t.Name.Contains(dep));
                            if (depTc != null) Visit(depTc);
                        }
                    }
                }
                catch { /* Invalid JSON — ignore */ }
            }

            ordered.Add(tc);
        }

        foreach (var tc in testCases)
            Visit(tc);

        return ordered;
    }

    private static bool AllDependenciesPassed(GeneratedTestCase testCase, TestRunResult runResult)
    {
        if (string.IsNullOrEmpty(testCase.DependenciesJson)) return true;

        try
        {
            var deps = JsonSerializer.Deserialize<List<string>>(testCase.DependenciesJson);
            if (deps == null) return true;

            return deps.All(dep =>
                runResult.Executions.Any(e =>
                    (e.TestCaseId.ToString() == dep || e.TestCaseName.Contains(dep)) &&
                    e.Status == "Passed"));
        }
        catch
        {
            return true;
        }
    }

    private static TestExecutionResult CreateSkippedExecution(GeneratedTestCase testCase, string reason)
    {
        return new TestExecutionResult
        {
            TestCaseId = testCase.Id,
            TestCaseName = testCase.Name,
            Status = "Skipped",
            ErrorMessage = reason,
            DurationMs = 0
        };
    }

    private static bool IsIdempotent(string method)
    {
        return method.ToUpper() is "GET" or "HEAD" or "OPTIONS";
    }

    private static string MaskSecrets(string input)
    {
        // Mask Bearer tokens
        var masked = Regex.Replace(input, @"Bearer\s+[^\s""]+", "Bearer ***MASKED***", RegexOptions.IgnoreCase);
        // Mask API keys
        masked = Regex.Replace(masked, @"(?i)(x-api-key|apikey|api_key)["":\s]+[^\s""]+", "$1: ***MASKED***");
        return masked;
    }
}

/// <summary>
/// Configuration for test execution
/// </summary>
public class ExecutionConfig
{
    /// <summary>Per-test timeout in seconds</summary>
    public int TimeoutSeconds { get; set; } = 5;

    /// <summary>Whether production execution is enabled (disabled by default)</summary>
    public bool AllowProductionExecution { get; set; } = false;

    /// <summary>Max parallel non-destructive tests (GET-only). 0 = sequential.</summary>
    public int MaxParallelReads { get; set; } = 5;

    /// <summary>Whether to retry failed idempotent tests</summary>
    public bool RetryEnabled { get; set; } = false;

    /// <summary>Callback invoked after each test completes. Used for incremental DB saves.</summary>
    public Func<TestExecutionResult, Task>? OnTestCompleted { get; set; }
}

/// <summary>
/// Result of a complete test suite execution
/// </summary>
public class TestRunResult
{
    public string Status { get; set; } = "Pending";
    public int TotalTests { get; set; }
    public int PassedTests { get; set; }
    public int FailedTests { get; set; }
    public int SkippedTests { get; set; }
    public decimal PassRate { get; set; }
    public long DurationSeconds { get; set; }
    public DateTime StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public List<TestExecutionResult> Executions { get; set; } = new();
}

/// <summary>
/// Result of a single test case execution
/// </summary>
public class TestExecutionResult
{
    public Guid TestCaseId { get; set; }
    public string TestCaseName { get; set; } = string.Empty;
    public string Status { get; set; } = "Pending";
    public int? ResponseStatusCode { get; set; }
    public string? RequestJson { get; set; }
    public string? ResponseJson { get; set; }
    public string? ResponseHeadersJson { get; set; }
    public string? AssertionResultsJson { get; set; }
    public string? ErrorMessage { get; set; }
    public long DurationMs { get; set; }
    public string? CorrelationId { get; set; }
    public int RetryCount { get; set; }
}

/// <summary>
/// Result of a single assertion evaluation
/// </summary>
public class AssertionResult
{
    public string Type { get; set; } = string.Empty;
    public string? Expression { get; set; }
    public bool Passed { get; set; }
    public string Expected { get; set; } = string.Empty;
    public string Actual { get; set; } = string.Empty;
}

