using LoadForge.Core.Entities;
using LoadForge.Infrastructure.Data;
using LoadForge.TestGeneration.Generation;
using LoadForge.TestGeneration.Models;
using LoadForge.TestGeneration.Parsing;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace LoadForge.Api.Controllers;

/// <summary>
/// Coverage-focused test generation and management.
/// Ingests OpenAPI specs, generates deterministic test suites,
/// executes tests server-side, and produces structured reports.
/// </summary>
[Authorize]
[Route("api/projects/{projectId:guid}/test-suites")]
public class TestSuitesController : BaseApiController
{
    private readonly LoadForgeDbContext _db;
    private readonly ILogger<TestSuitesController> _logger;
    private readonly IServiceScopeFactory _serviceScopeFactory;

    public TestSuitesController(LoadForgeDbContext db, ILogger<TestSuitesController> logger, IServiceScopeFactory serviceScopeFactory)
    {
        _db = db;
        _logger = logger;
        _serviceScopeFactory = serviceScopeFactory;
    }

    // ──────────────────────────────────────────────────
    // OPENAPI INGESTION
    // ──────────────────────────────────────────────────

    /// <summary>
    /// Upload an OpenAPI spec and create/update a collection from it.
    /// POST /api/projects/{projectId}/test-suites/import-openapi
    /// </summary>
    [HttpPost("import-openapi")]
    public async Task<IActionResult> ImportOpenApi(Guid projectId, [FromBody] ImportOpenApiRequest request)
    {
        var orgId = GetOrganizationId();
        var project = await _db.Projects
            .FirstOrDefaultAsync(p => p.Id == projectId && p.OrganizationId == orgId && p.IsActive);

        if (project == null)
            return ApiError("Project not found", 404);

        try
        {
            var parser = new OpenApiParser();
            var spec = parser.Parse(request.OpenApiContent);

            // Create or update API collection
            var collection = await _db.ApiCollections
                .FirstOrDefaultAsync(c => c.ProjectId == projectId && c.Name == spec.Title && c.IsActive);

            if (collection == null)
            {
                collection = new ApiCollection
                {
                    Id = Guid.NewGuid(),
                    Name = spec.Title,
                    Description = spec.Description,
                    ImportedFrom = ImportSource.OpenApi,
                    ImportedFileName = request.FileName,
                    ProjectId = projectId
                };
                _db.ApiCollections.Add(collection);
            }
            else
            {
                collection.Description = spec.Description;
                collection.UpdatedAt = DateTime.UtcNow;
            }

            // Store endpoints
            foreach (var endpoint in spec.Endpoints)
            {
                var existingEndpoint = await _db.ApiEndpoints
                    .FirstOrDefaultAsync(e => e.CollectionId == collection.Id
                        && e.Url == endpoint.Path
                        && e.Method.ToString() == endpoint.Method
                        && e.IsActive);

                if (existingEndpoint == null)
                {
                    var apiEndpoint = new ApiEndpoint
                    {
                        Id = Guid.NewGuid(),
                        Name = endpoint.Summary ?? endpoint.OperationId,
                        Description = endpoint.Description,
                        Method = Enum.TryParse<LoadForge.Core.Entities.HttpMethod>(endpoint.Method, true, out var m) ? m : LoadForge.Core.Entities.HttpMethod.GET,
                        Url = endpoint.Path,
                        CollectionId = collection.Id,
                        RequestBody = endpoint.RequestBody != null ? JsonSerializer.Serialize(endpoint.RequestBody) : null
                    };
                    _db.ApiEndpoints.Add(apiEndpoint);
                }
            }

            await _db.SaveChangesAsync();

            return ApiResponse(new ImportOpenApiResponse
            {
                CollectionId = collection.Id,
                CollectionName = collection.Name,
                EndpointCount = spec.Endpoints.Count,
                Title = spec.Title,
                Version = spec.Version,
                Servers = spec.Servers
            });
        }
        catch (OpenApiParseException ex)
        {
            return ApiError($"OpenAPI parse error: {ex.Message}", 400);
        }
    }

    // ──────────────────────────────────────────────────
    // TEST GENERATION (Deterministic)
    // ──────────────────────────────────────────────────

    /// <summary>
    /// Generate a deterministic test suite from an OpenAPI spec.
    /// POST /api/projects/{projectId}/test-suites/generate
    /// </summary>
    [HttpPost("generate")]
    public async Task<IActionResult> GenerateTestSuite(Guid projectId, [FromBody] GenerateTestSuiteRequest request)
    {
        var orgId = GetOrganizationId();
        var project = await _db.Projects
            .FirstOrDefaultAsync(p => p.Id == projectId && p.OrganizationId == orgId && p.IsActive);

        if (project == null)
            return ApiError("Project not found", 404);

        try
        {
            // Parse OpenAPI
            var parser = new OpenApiParser();
            var spec = parser.Parse(request.OpenApiContent);

            // Configure generator
            var config = new TestGenerationConfig
            {
                Seed = request.Seed ?? 42,
                GenerateSmokeTests = request.GenerateSmoke ?? true,
                GenerateValidationTests = request.GenerateValidation ?? true,
                GenerateBoundaryTests = request.GenerateBoundary ?? true,
                GenerateNegativeTests = request.GenerateNegative ?? true,
                GenerateContractTests = request.GenerateContract ?? true,
                GenerateCrudTests = request.GenerateCrud ?? true,
                TestDataPrefix = request.TestDataPrefix ?? "loadforge_test_"
            };

            // Generate deterministic test suite
            var assembler = new TestAssembler(config);
            var testCases = assembler.GenerateTestSuite(spec);

            // Ensure collection exists
            var collection = await _db.ApiCollections
                .FirstOrDefaultAsync(c => c.ProjectId == projectId && c.Name == spec.Title && c.IsActive);

            if (collection == null)
            {
                collection = new ApiCollection
                {
                    Id = Guid.NewGuid(),
                    Name = spec.Title,
                    Description = spec.Description,
                    ImportedFrom = ImportSource.OpenApi,
                    ProjectId = projectId
                };
                _db.ApiCollections.Add(collection);
                await _db.SaveChangesAsync();
            }

            // Remove old auto-generated tests for this collection
            var oldTests = await _db.GeneratedTestCases
                .Where(t => t.CollectionId == collection.Id && t.AutoGenerated)
                .ToListAsync();
            _db.GeneratedTestCases.RemoveRange(oldTests);

            // Save new generated test cases
            var entities = testCases.Select(tc => new GeneratedTestCase
            {
                Id = Guid.NewGuid(),
                CollectionId = collection.Id,
                Name = tc.Name,
                Severity = tc.Severity,
                Method = tc.Method,
                Path = tc.Path,
                PayloadJson = tc.Payload != null ? JsonSerializer.Serialize(tc.Payload) : null,
                ExpectedStatusCodes = tc.ExpectedStatusCodes,
                AssertionsJson = JsonSerializer.Serialize(tc.Assertions),
                SetupJson = tc.Setup.Count > 0 ? JsonSerializer.Serialize(tc.Setup) : null,
                TeardownJson = tc.Teardown.Count > 0 ? JsonSerializer.Serialize(tc.Teardown) : null,
                DependenciesJson = tc.Dependencies.Count > 0 ? JsonSerializer.Serialize(tc.Dependencies) : null,
                AutoGenerated = tc.AutoGenerated,
                NeedsReview = tc.NeedsReview,
                CoverageCategory = tc.CoverageCategory,
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            }).ToList();

            _db.GeneratedTestCases.AddRange(entities);
            await _db.SaveChangesAsync();

            // Build coverage summary
            var summary = new GenerationSummaryDto
            {
                CollectionId = collection.Id,
                CollectionName = collection.Name,
                TotalTestsGenerated = testCases.Count,
                SmokeTests = testCases.Count(t => t.CoverageCategory == "Smoke"),
                ValidationTests = testCases.Count(t => t.CoverageCategory == "Validation"),
                BoundaryTests = testCases.Count(t => t.CoverageCategory == "Boundary"),
                NegativeTests = testCases.Count(t => t.CoverageCategory == "Negative"),
                ContractTests = testCases.Count(t => t.CoverageCategory == "Contract"),
                CrudTests = testCases.Count(t => t.CoverageCategory == "StateAwareCRUD"),
                P0Tests = testCases.Count(t => t.Severity == "P0"),
                P1Tests = testCases.Count(t => t.Severity == "P1"),
                P2Tests = testCases.Count(t => t.Severity == "P2"),
                EndpointsCovered = testCases.Select(t => $"{t.Method} {t.Path}").Distinct().Count(),
                Seed = config.Seed
            };

            _logger.LogInformation(
                "Generated {Count} deterministic test cases for collection {Collection} in project {Project}",
                testCases.Count, collection.Name, projectId);

            return ApiResponse(summary);
        }
        catch (OpenApiParseException ex)
        {
            return ApiError($"OpenAPI parse error: {ex.Message}", 400);
        }
    }

    // ──────────────────────────────────────────────────
    // SLM-ASSISTED RULE EXTRACTION
    // ──────────────────────────────────────────────────

    /// <summary>
    /// Extract business rules from text using SLM and generate review-required test cases.
    /// POST /api/projects/{projectId}/test-suites/{collectionId}/extract-rules
    /// </summary>
    [HttpPost("{collectionId:guid}/extract-rules")]
    public async Task<IActionResult> ExtractRules(
        Guid projectId, Guid collectionId,
        [FromBody] ExtractRulesRequest request,
        [FromServices] LoadForge.TestGeneration.Slm.SlmConfig slmConfig,
        [FromServices] IHttpClientFactory httpClientFactory)
    {
        if (!slmConfig.Enabled)
            return ApiError("SLM features are not enabled. Set Slm:Enabled=true in configuration.", 400);

        if (string.IsNullOrWhiteSpace(request.InputText))
            return ApiError("Input text is required", 400);

        var collection = await _db.ApiCollections
            .FirstOrDefaultAsync(c => c.Id == collectionId && c.ProjectId == projectId && c.IsActive);

        if (collection == null)
            return ApiError("Collection not found", 404);

        // Get known endpoints for context
        var endpoints = await _db.ApiEndpoints
            .Where(e => e.CollectionId == collectionId && e.IsActive)
            .Select(e => $"{e.Method} {e.Url}")
            .ToListAsync();

        // Call SLM for rule extraction
        var httpClient = httpClientFactory.CreateClient("SlmClient");
        var extractor = new LoadForge.TestGeneration.Slm.SlmRuleExtractor(
            httpClient,
            _logger as ILogger<LoadForge.TestGeneration.Slm.SlmRuleExtractor>
                ?? Microsoft.Extensions.Logging.LoggerFactory.Create(b => b.AddConsole())
                    .CreateLogger<LoadForge.TestGeneration.Slm.SlmRuleExtractor>(),
            slmConfig);

        var extraction = await extractor.ExtractRulesAsync(request.InputText, endpoints);

        if (extraction.Rules.Count == 0)
            return ApiResponse(new ExtractRulesResponse
            {
                RulesExtracted = 0,
                TestsGenerated = 0,
                Confidence = extraction.Confidence,
                Message = "No structured rules could be extracted from the input text."
            });

        // Generate test cases from rules
        var applier = new LoadForge.TestGeneration.Slm.SlmRuleApplier();
        var testCases = applier.GenerateTestsFromRules(extraction);

        // Save to database (all with needs_review: true)
        var entities = testCases.Select(tc => new Core.Entities.GeneratedTestCase
        {
            Id = Guid.NewGuid(),
            CollectionId = collectionId,
            Name = tc.Name,
            Severity = tc.Severity,
            Method = tc.Method,
            Path = tc.Path,
            ExpectedStatusCodes = tc.ExpectedStatusCodes,
            AssertionsJson = JsonSerializer.Serialize(tc.Assertions),
            AutoGenerated = true,
            NeedsReview = true, // ALWAYS true for SLM tests
            CoverageCategory = "SLM-Assisted",
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        }).ToList();

        _db.GeneratedTestCases.AddRange(entities);
        await _db.SaveChangesAsync();

        _logger.LogInformation(
            "SLM extracted {RuleCount} rules → {TestCount} test cases (needs_review=true) for collection {Col}",
            extraction.Rules.Count, testCases.Count, collectionId);

        return ApiResponse(new ExtractRulesResponse
        {
            RulesExtracted = extraction.Rules.Count,
            TestsGenerated = testCases.Count,
            Confidence = extraction.Confidence,
            Rules = extraction.Rules.Select(r => new ExtractedRuleDto
            {
                Type = r.Type,
                Description = r.Description ?? "",
                LeftField = r.LeftField,
                RightField = r.RightField,
                Operator = r.Operator
            }).ToList(),
            Message = $"Extracted {extraction.Rules.Count} rules, generated {testCases.Count} test cases (all flagged for review)"
        });
    }

    // ──────────────────────────────────────────────────
    // TEST CASE MANAGEMENT (CRUD)
    // ──────────────────────────────────────────────────

    /// <summary>
    /// Get all generated test cases for a collection.
    /// GET /api/projects/{projectId}/test-suites/{collectionId}/tests
    /// </summary>
    [HttpGet("{collectionId:guid}/tests")]
    public async Task<IActionResult> GetTestCases(
        Guid projectId, Guid collectionId,
        [FromQuery] string? severity = null,
        [FromQuery] string? category = null,
        [FromQuery] bool? needsReview = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        var query = _db.GeneratedTestCases
            .Where(t => t.CollectionId == collectionId && t.IsActive);

        if (!string.IsNullOrEmpty(severity))
            query = query.Where(t => t.Severity == severity);

        if (!string.IsNullOrEmpty(category))
            query = query.Where(t => t.CoverageCategory == category);

        if (needsReview.HasValue)
            query = query.Where(t => t.NeedsReview == needsReview.Value);

        var totalCount = await query.CountAsync();
        var items = await query
            .OrderBy(t => t.Severity).ThenBy(t => t.CoverageCategory).ThenBy(t => t.Name)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(t => new TestCaseDto
            {
                Id = t.Id,
                Name = t.Name,
                Severity = t.Severity,
                Method = t.Method,
                Path = t.Path,
                CoverageCategory = t.CoverageCategory,
                ExpectedStatusCodes = t.ExpectedStatusCodes,
                AutoGenerated = t.AutoGenerated,
                NeedsReview = t.NeedsReview,
                IsActive = t.IsActive,
                CreatedAt = t.CreatedAt
            })
            .ToListAsync();

        return ApiResponse(new PaginatedResponse<TestCaseDto>
        {
            Items = items,
            TotalCount = totalCount,
            PageNumber = page,
            PageSize = pageSize
        });
    }

    /// <summary>
    /// Get a single test case with full details (payload, assertions, etc.).
    /// GET /api/projects/{projectId}/test-suites/{collectionId}/tests/{testId}
    /// </summary>
    [HttpGet("{collectionId:guid}/tests/{testId:guid}")]
    public async Task<IActionResult> GetTestCase(Guid projectId, Guid collectionId, Guid testId)
    {
        var test = await _db.GeneratedTestCases
            .FirstOrDefaultAsync(t => t.Id == testId && t.CollectionId == collectionId);

        if (test == null)
            return ApiError("Test case not found", 404);

        return ApiResponse(new TestCaseDetailDto
        {
            Id = test.Id,
            Name = test.Name,
            Severity = test.Severity,
            Method = test.Method,
            Path = test.Path,
            CoverageCategory = test.CoverageCategory,
            PayloadJson = test.PayloadJson,
            ExpectedStatusCodes = test.ExpectedStatusCodes,
            AssertionsJson = test.AssertionsJson,
            SetupJson = test.SetupJson,
            TeardownJson = test.TeardownJson,
            DependenciesJson = test.DependenciesJson,
            AutoGenerated = test.AutoGenerated,
            NeedsReview = test.NeedsReview,
            IsActive = test.IsActive,
            CreatedAt = test.CreatedAt,
            UpdatedAt = test.UpdatedAt
        });
    }

    /// <summary>
    /// Update a test case (edit payload, assertions, severity, etc.).
    /// PUT /api/projects/{projectId}/test-suites/{collectionId}/tests/{testId}
    /// </summary>
    [HttpPut("{collectionId:guid}/tests/{testId:guid}")]
    public async Task<IActionResult> UpdateTestCase(
        Guid projectId, Guid collectionId, Guid testId,
        [FromBody] UpdateTestCaseRequest request)
    {
        var test = await _db.GeneratedTestCases
            .FirstOrDefaultAsync(t => t.Id == testId && t.CollectionId == collectionId);

        if (test == null)
            return ApiError("Test case not found", 404);

        if (request.Name != null) test.Name = request.Name;
        if (request.Severity != null) test.Severity = request.Severity;
        if (request.PayloadJson != null) test.PayloadJson = request.PayloadJson;
        if (request.AssertionsJson != null) test.AssertionsJson = request.AssertionsJson;
        if (request.ExpectedStatusCodes != null) test.ExpectedStatusCodes = request.ExpectedStatusCodes;
        if (request.NeedsReview.HasValue) test.NeedsReview = request.NeedsReview.Value;
        if (request.IsActive.HasValue) test.IsActive = request.IsActive.Value;

        test.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return ApiResponse(new { message = "Test case updated", id = test.Id });
    }

    /// <summary>
    /// Get coverage summary for a collection.
    /// GET /api/projects/{projectId}/test-suites/{collectionId}/coverage
    /// </summary>
    [HttpGet("{collectionId:guid}/coverage")]
    public async Task<IActionResult> GetCoverageSummary(Guid projectId, Guid collectionId)
    {
        var tests = await _db.GeneratedTestCases
            .Where(t => t.CollectionId == collectionId && t.IsActive)
            .ToListAsync();

        var summary = new CoverageSummaryDto
        {
            CollectionId = collectionId,
            TotalTests = tests.Count,
            SmokeTests = tests.Count(t => t.CoverageCategory == "Smoke"),
            ValidationTests = tests.Count(t => t.CoverageCategory == "Validation"),
            BoundaryTests = tests.Count(t => t.CoverageCategory == "Boundary"),
            NegativeTests = tests.Count(t => t.CoverageCategory == "Negative"),
            ContractTests = tests.Count(t => t.CoverageCategory == "Contract"),
            CrudTests = tests.Count(t => t.CoverageCategory == "StateAwareCRUD"),
            P0Tests = tests.Count(t => t.Severity == "P0"),
            P1Tests = tests.Count(t => t.Severity == "P1"),
            P2Tests = tests.Count(t => t.Severity == "P2"),
            AutoGeneratedTests = tests.Count(t => t.AutoGenerated),
            ManualTests = tests.Count(t => !t.AutoGenerated),
            NeedsReviewCount = tests.Count(t => t.NeedsReview),
            EndpointsCovered = tests.Select(t => $"{t.Method} {t.Path}").Distinct().Count()
        };

        return ApiResponse(summary);
    }

    // ──────────────────────────────────────────────────
    // TEST EXECUTION
    // ──────────────────────────────────────────────────

    /// <summary>
    /// Execute a test suite against a target environment.
    /// Returns immediately with run ID. Tests execute in background.
    /// Poll GET .../runs/{runId} for status.
    /// POST /api/projects/{projectId}/test-suites/{collectionId}/execute
    /// </summary>
    [HttpPost("{collectionId:guid}/execute")]
    public async Task<IActionResult> ExecuteTestSuite(
        Guid projectId, Guid collectionId,
        [FromBody] ExecuteTestSuiteRequest request,
        [FromServices] IHttpClientFactory httpClientFactory)
    {
        var orgId = GetOrganizationId();
        var userId = GetUserId();

        // Validate environment
        var environment = await _db.Environments
            .Include(e => e.Variables)
            .Include(e => e.Headers)
            .FirstOrDefaultAsync(e => e.Id == request.EnvironmentId && e.Project.OrganizationId == orgId);

        if (environment == null)
            return ApiError("Environment not found", 404);

        // Safety: block production execution by default
        if (environment.Name.Contains("prod", StringComparison.OrdinalIgnoreCase))
            return ApiError("Production execution is disabled by default. Use a non-production environment.", 403);

        // Get test cases
        var testCases = await _db.GeneratedTestCases
            .Where(t => t.CollectionId == collectionId && t.IsActive)
            .ToListAsync();

        if (testCases.Count == 0)
            return ApiError("No active test cases found for this collection", 404);

        // Filter by severity if requested
        if (!string.IsNullOrEmpty(request.SeverityFilter))
            testCases = testCases.Where(t => t.Severity == request.SeverityFilter).ToList();

        // Filter by category if requested
        if (!string.IsNullOrEmpty(request.CategoryFilter))
            testCases = testCases.Where(t => t.CoverageCategory == request.CategoryFilter).ToList();

        // Create test run record
        var testRun = new GeneratedTestRun
        {
            Id = Guid.NewGuid(),
            CollectionId = collectionId,
            ExecutedById = userId,
            EnvironmentId = environment.Id,
            Status = "Running",
            Description = request.Description,
            TotalTests = testCases.Count,
            CreatedAt = DateTime.UtcNow,
            StartedAt = DateTime.UtcNow
        };
        _db.GeneratedTestRuns.Add(testRun);
        await _db.SaveChangesAsync();

        // Capture what we need for background execution
        var runId = testRun.Id;
        var baseUrl = environment.BaseUrl;
        var authToken = request.AuthToken;
        var envVars = environment.Variables.ToDictionary(v => v.Key, v => v.Value);
        var testCasesCopy = testCases.ToList();

        // Execute tests in background
        _ = Task.Run(async () =>
        {
            try
            {
                Console.WriteLine($"[TestExecution] Starting execution for run {runId} with {testCasesCopy.Count} tests");
                Console.WriteLine($"[TestExecution] Base URL: {baseUrl}");
                
                var httpClient = httpClientFactory.CreateClient("TestRunner");
                var loggerFactory = Microsoft.Extensions.Logging.LoggerFactory.Create(b => b.AddConsole());
                var engineLogger = loggerFactory.CreateLogger<TestExecutionEngine>();

                // Lock for thread-safe incremental DB saves
                var saveLock = new SemaphoreSlim(1, 1);

                var engine = new TestExecutionEngine(httpClient, engineLogger, new ExecutionConfig
                {
                    TimeoutSeconds = 5,
                    MaxParallelReads = 5,
                    RetryEnabled = false,
                    OnTestCompleted = async (exec) =>
                    {
                        Console.WriteLine($"[TestExecution] Test completed: {exec.TestCaseName} - {exec.Status} ({exec.DurationMs}ms)");
                        // Save each test result to DB immediately
                        await saveLock.WaitAsync();
                        try
                        {
                            using var scope = _serviceScopeFactory.CreateScope();
                            var db = scope.ServiceProvider.GetRequiredService<LoadForgeDbContext>();

                            db.GeneratedTestExecutions.Add(new GeneratedTestExecution
                            {
                                Id = Guid.NewGuid(),
                                TestCaseId = exec.TestCaseId,
                                TestRunId = runId,
                                Status = exec.Status,
                                ResponseStatusCode = exec.ResponseStatusCode,
                                RequestJson = exec.RequestJson,
                                ResponseJson = exec.ResponseJson,
                                ResponseHeadersJson = exec.ResponseHeadersJson,
                                AssertionResultsJson = exec.AssertionResultsJson,
                                ErrorMessage = exec.ErrorMessage,
                                DurationMs = exec.DurationMs,
                                CorrelationId = exec.CorrelationId,
                                RetryCount = exec.RetryCount,
                                ExecutedAt = DateTime.UtcNow
                            });

                            // Update running counts on the test run
                            var dbRun = await db.GeneratedTestRuns.FindAsync(runId);
                            if (dbRun != null)
                            {
                                var completedCount = await db.GeneratedTestExecutions
                                    .CountAsync(e => e.TestRunId == runId);
                                var passedCount = await db.GeneratedTestExecutions
                                    .CountAsync(e => e.TestRunId == runId && e.Status == "Passed");
                                var failedCount = await db.GeneratedTestExecutions
                                    .CountAsync(e => e.TestRunId == runId && e.Status == "Failed");

                                dbRun.PassedTests = passedCount;
                                dbRun.FailedTests = failedCount;
                            }

                            await db.SaveChangesAsync();
                        }
                        finally
                        {
                            saveLock.Release();
                        }
                    }
                });

                var runResult = await engine.ExecuteTestSuiteAsync(
                    testCasesCopy,
                    baseUrl,
                    authToken,
                    envVars);

                // Final update: mark run as complete
                using var finalScope = _serviceScopeFactory.CreateScope();
                var finalDb = finalScope.ServiceProvider.GetRequiredService<LoadForgeDbContext>();

                var finalRun = await finalDb.GeneratedTestRuns.FindAsync(runId);
                if (finalRun != null)
                {
                    finalRun.Status = runResult.Status;
                    finalRun.TotalTests = runResult.TotalTests;
                    finalRun.PassedTests = runResult.PassedTests;
                    finalRun.FailedTests = runResult.FailedTests;
                    finalRun.SkippedTests = runResult.SkippedTests;
                    finalRun.PassRate = runResult.PassRate;
                    finalRun.DurationSeconds = runResult.DurationSeconds;
                    finalRun.CompletedAt = runResult.CompletedAt;
                    finalRun.SummaryJson = JsonSerializer.Serialize(new
                    {
                        runResult.TotalTests,
                        runResult.PassedTests,
                        runResult.FailedTests,
                        runResult.SkippedTests,
                        runResult.PassRate,
                        runResult.DurationSeconds
                    });
                    await finalDb.SaveChangesAsync();
                }

                _logger.LogInformation(
                    "Test run completed: {Status} - {Passed}/{Total} passed ({PassRate}%) in {Duration}s",
                    runResult.Status, runResult.PassedTests, runResult.TotalTests, runResult.PassRate, runResult.DurationSeconds);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Background test execution failed for run {RunId}", runId);
                try
                {
                    using var scope = _serviceScopeFactory.CreateScope();
                    var db = scope.ServiceProvider.GetRequiredService<LoadForgeDbContext>();
                    var dbRun = await db.GeneratedTestRuns.FindAsync(runId);
                    if (dbRun != null)
                    {
                        dbRun.Status = "Failed";
                        dbRun.CompletedAt = DateTime.UtcNow;
                        dbRun.SummaryJson = JsonSerializer.Serialize(new { error = ex.Message });
                        await db.SaveChangesAsync();
                    }
                }
                catch { /* best effort */ }
            }
        });

        // Return immediately with run ID
        return ApiResponse(new ExecuteTestSuiteResponse
        {
            RunId = testRun.Id,
            Status = "Running",
            TotalTests = testCases.Count,
            PassedTests = 0,
            FailedTests = 0,
            SkippedTests = 0,
            PassRate = 0,
            DurationSeconds = 0
        }, "Test execution started. Poll GET .../runs/{runId} for progress.");
    }

    /// <summary>
    /// Get detailed results for a specific test run.
    /// GET /api/projects/{projectId}/test-suites/{collectionId}/runs/{runId}
    /// </summary>
    [HttpGet("{collectionId:guid}/runs/{runId:guid}")]
    public async Task<IActionResult> GetTestRunDetail(Guid projectId, Guid collectionId, Guid runId)
    {
        var run = await _db.GeneratedTestRuns
            .Include(r => r.Executions)
            .FirstOrDefaultAsync(r => r.Id == runId && r.CollectionId == collectionId);

        if (run == null)
            return ApiError("Test run not found", 404);

        return ApiResponse(new GeneratedTestRunDetailDto
        {
            Id = run.Id,
            Status = run.Status,
            TotalTests = run.TotalTests,
            PassedTests = run.PassedTests,
            FailedTests = run.FailedTests,
            SkippedTests = run.SkippedTests,
            PassRate = run.PassRate,
            DurationSeconds = run.DurationSeconds,
            CreatedAt = run.CreatedAt,
            StartedAt = run.StartedAt,
            CompletedAt = run.CompletedAt,
            Executions = run.Executions.Select(e => new GeneratedTestExecutionDto
            {
                Id = e.Id,
                TestCaseId = e.TestCaseId,
                Status = e.Status,
                ResponseStatusCode = e.ResponseStatusCode,
                DurationMs = e.DurationMs,
                CorrelationId = e.CorrelationId,
                ErrorMessage = e.ErrorMessage,
                RetryCount = e.RetryCount,
                RequestJson = e.RequestJson,
                ResponseJson = e.ResponseJson,
                AssertionResultsJson = e.AssertionResultsJson
            }).ToList()
        });
    }

    // ──────────────────────────────────────────────────
    // TEST RUN HISTORY
    // ──────────────────────────────────────────────────

    /// <summary>
    /// Get all test runs for a collection.
    /// GET /api/projects/{projectId}/test-suites/{collectionId}/runs
    /// </summary>
    [HttpGet("{collectionId:guid}/runs")]
    public async Task<IActionResult> GetTestRuns(
        Guid projectId, Guid collectionId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var query = _db.GeneratedTestRuns
            .Where(r => r.CollectionId == collectionId)
            .OrderByDescending(r => r.CreatedAt);

        var totalCount = await query.CountAsync();
        var items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(r => new TestRunSummaryDto
            {
                Id = r.Id,
                Status = r.Status,
                TotalTests = r.TotalTests,
                PassedTests = r.PassedTests,
                FailedTests = r.FailedTests,
                SkippedTests = r.SkippedTests,
                PassRate = r.PassRate,
                DurationSeconds = r.DurationSeconds,
                CreatedAt = r.CreatedAt,
                StartedAt = r.StartedAt,
                CompletedAt = r.CompletedAt
            })
            .ToListAsync();

        return ApiResponse(new PaginatedResponse<TestRunSummaryDto>
        {
            Items = items,
            TotalCount = totalCount,
            PageNumber = page,
            PageSize = pageSize
        });
    }

    // ──────────────────────────────────────────────────
    // REPORTS (HTML / JUnit XML / JSON)
    // ──────────────────────────────────────────────────

    /// <summary>
    /// Download a report for a specific test run.
    /// GET /api/projects/{projectId}/test-suites/{collectionId}/runs/{runId}/report?format=html|junit|json
    /// </summary>
    [HttpGet("{collectionId:guid}/runs/{runId:guid}/report")]
    public async Task<IActionResult> DownloadReport(
        Guid projectId, Guid collectionId, Guid runId,
        [FromQuery] string format = "html")
    {
        var run = await _db.GeneratedTestRuns
            .Include(r => r.Executions)
            .Include(r => r.Environment)
            .FirstOrDefaultAsync(r => r.Id == runId && r.CollectionId == collectionId);

        if (run == null)
            return ApiError("Test run not found", 404);

        // Load test cases for this collection to enrich report
        var testCaseIds = run.Executions.Select(e => e.TestCaseId).Distinct().ToList();
        var testCases = await _db.GeneratedTestCases
            .Where(t => testCaseIds.Contains(t.Id))
            .ToDictionaryAsync(t => t.Id);

        var collection = await _db.ApiCollections.FirstOrDefaultAsync(c => c.Id == collectionId);

        var reportData = LoadForge.TestGeneration.Reporting.ReportDataMapper.MapFromTestRun(
            run, run.Executions, testCases,
            run.Environment?.Name, run.Environment?.BaseUrl);

        reportData.SuiteName = collection?.Name ?? "API Test Suite";

        var reportGenerator = new LoadForge.TestGeneration.Reporting.ReportGenerator();

        return format.ToLower() switch
        {
            "junit" or "xml" => File(
                System.Text.Encoding.UTF8.GetBytes(reportGenerator.GenerateJUnitXml(reportData)),
                "application/xml",
                $"test-report-{runId:N}.xml"),

            "json" => File(
                System.Text.Encoding.UTF8.GetBytes(reportGenerator.GenerateJsonReport(reportData)),
                "application/json",
                $"test-report-{runId:N}.json"),

            _ => File(
                System.Text.Encoding.UTF8.GetBytes(reportGenerator.GenerateHtmlReport(reportData)),
                "text/html",
                $"test-report-{runId:N}.html")
        };
    }

    /// <summary>
    /// Cancel a stuck test run.
    /// POST /api/projects/{projectId}/test-suites/{collectionId}/runs/{runId}/cancel
    /// </summary>
    [HttpPost("{collectionId:guid}/runs/{runId:guid}/cancel")]
    public async Task<IActionResult> CancelTestRun(Guid projectId, Guid collectionId, Guid runId)
    {
        var run = await _db.GeneratedTestRuns
            .FirstOrDefaultAsync(r => r.Id == runId && r.CollectionId == collectionId);

        if (run == null)
            return ApiError("Test run not found", 404);

        if (run.Status != "Running" && run.Status != "Pending")
            return ApiError($"Test run is already {run.Status}", 400);

        run.Status = "Cancelled";
        run.CompletedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return ApiResponse(new { message = "Test run cancelled", runId });
    }

    /// <summary>
    /// Cancel all stuck test runs older than 1 hour.
    /// POST /api/projects/{projectId}/test-suites/cancel-stale
    /// </summary>
    [HttpPost("cancel-stale")]
    public async Task<IActionResult> CancelStaleTestRuns(Guid projectId)
    {
        var cutoff = DateTime.UtcNow.AddHours(-1);
        var staleRuns = await _db.GeneratedTestRuns
            .Where(r => r.Status == "Running" && r.StartedAt < cutoff)
            .Where(r => r.Collection != null && r.Collection.ProjectId == projectId)
            .ToListAsync();

        foreach (var run in staleRuns)
        {
            run.Status = "Cancelled";
            run.CompletedAt = DateTime.UtcNow;
        }

        await _db.SaveChangesAsync();

        return ApiResponse(new { message = $"Cancelled {staleRuns.Count} stale test runs", count = staleRuns.Count });
    }
}

// ──────────────────────────────────────────────────
// DTOs
// ──────────────────────────────────────────────────

public record ImportOpenApiRequest
{
    public string OpenApiContent { get; init; } = string.Empty;
    public string? FileName { get; init; }
}

public record ImportOpenApiResponse
{
    public Guid CollectionId { get; init; }
    public string CollectionName { get; init; } = string.Empty;
    public int EndpointCount { get; init; }
    public string Title { get; init; } = string.Empty;
    public string Version { get; init; } = string.Empty;
    public List<string> Servers { get; init; } = new();
}

public record GenerateTestSuiteRequest
{
    public string OpenApiContent { get; init; } = string.Empty;
    public int? Seed { get; init; }
    public string? TestDataPrefix { get; init; }
    public bool? GenerateSmoke { get; init; }
    public bool? GenerateValidation { get; init; }
    public bool? GenerateBoundary { get; init; }
    public bool? GenerateNegative { get; init; }
    public bool? GenerateContract { get; init; }
    public bool? GenerateCrud { get; init; }
}

public record GenerationSummaryDto
{
    public Guid CollectionId { get; init; }
    public string CollectionName { get; init; } = string.Empty;
    public int TotalTestsGenerated { get; init; }
    public int SmokeTests { get; init; }
    public int ValidationTests { get; init; }
    public int BoundaryTests { get; init; }
    public int NegativeTests { get; init; }
    public int ContractTests { get; init; }
    public int CrudTests { get; init; }
    public int P0Tests { get; init; }
    public int P1Tests { get; init; }
    public int P2Tests { get; init; }
    public int EndpointsCovered { get; init; }
    public int Seed { get; init; }
}

public record TestCaseDto
{
    public Guid Id { get; init; }
    public string Name { get; init; } = string.Empty;
    public string Severity { get; init; } = string.Empty;
    public string Method { get; init; } = string.Empty;
    public string Path { get; init; } = string.Empty;
    public string CoverageCategory { get; init; } = string.Empty;
    public int[] ExpectedStatusCodes { get; init; } = [];
    public bool AutoGenerated { get; init; }
    public bool NeedsReview { get; init; }
    public bool IsActive { get; init; }
    public DateTime CreatedAt { get; init; }
}

public record TestCaseDetailDto : TestCaseDto
{
    public string? PayloadJson { get; init; }
    public string? AssertionsJson { get; init; }
    public string? SetupJson { get; init; }
    public string? TeardownJson { get; init; }
    public string? DependenciesJson { get; init; }
    public DateTime UpdatedAt { get; init; }
}

public record UpdateTestCaseRequest
{
    public string? Name { get; init; }
    public string? Severity { get; init; }
    public string? PayloadJson { get; init; }
    public string? AssertionsJson { get; init; }
    public int[]? ExpectedStatusCodes { get; init; }
    public bool? NeedsReview { get; init; }
    public bool? IsActive { get; init; }
}

public record CoverageSummaryDto
{
    public Guid CollectionId { get; init; }
    public int TotalTests { get; init; }
    public int SmokeTests { get; init; }
    public int ValidationTests { get; init; }
    public int BoundaryTests { get; init; }
    public int NegativeTests { get; init; }
    public int ContractTests { get; init; }
    public int CrudTests { get; init; }
    public int P0Tests { get; init; }
    public int P1Tests { get; init; }
    public int P2Tests { get; init; }
    public int AutoGeneratedTests { get; init; }
    public int ManualTests { get; init; }
    public int NeedsReviewCount { get; init; }
    public int EndpointsCovered { get; init; }
}

public record TestRunSummaryDto
{
    public Guid Id { get; init; }
    public string Status { get; init; } = string.Empty;
    public int TotalTests { get; init; }
    public int PassedTests { get; init; }
    public int FailedTests { get; init; }
    public int SkippedTests { get; init; }
    public decimal PassRate { get; init; }
    public long DurationSeconds { get; init; }
    public DateTime CreatedAt { get; init; }
    public DateTime? StartedAt { get; init; }
    public DateTime? CompletedAt { get; init; }
}

public record ExecuteTestSuiteRequest
{
    public Guid EnvironmentId { get; init; }
    public string? AuthToken { get; init; }
    public string? Description { get; init; }
    public string? SeverityFilter { get; init; }
    public string? CategoryFilter { get; init; }
}

public record ExecuteTestSuiteResponse
{
    public Guid RunId { get; init; }
    public string Status { get; init; } = string.Empty;
    public int TotalTests { get; init; }
    public int PassedTests { get; init; }
    public int FailedTests { get; init; }
    public int SkippedTests { get; init; }
    public decimal PassRate { get; init; }
    public long DurationSeconds { get; init; }
}

public record GeneratedTestRunDetailDto : TestRunSummaryDto
{
    public List<GeneratedTestExecutionDto> Executions { get; init; } = new();
}

public record GeneratedTestExecutionDto
{
    public Guid Id { get; init; }
    public Guid TestCaseId { get; init; }
    public string Status { get; init; } = string.Empty;
    public int? ResponseStatusCode { get; init; }
    public long DurationMs { get; init; }
    public string? CorrelationId { get; init; }
    public string? ErrorMessage { get; init; }
    public int RetryCount { get; init; }
    public string? RequestJson { get; init; }
    public string? ResponseJson { get; init; }
    public string? AssertionResultsJson { get; init; }
}

// ──────────────────────────────────────────────────
// SLM DTOs
// ──────────────────────────────────────────────────

public record ExtractRulesRequest
{
    public string InputText { get; init; } = string.Empty;
}

public record ExtractRulesResponse
{
    public int RulesExtracted { get; init; }
    public int TestsGenerated { get; init; }
    public decimal Confidence { get; init; }
    public string Message { get; init; } = string.Empty;
    public List<ExtractedRuleDto> Rules { get; init; } = new();
}

public record ExtractedRuleDto
{
    public string Type { get; init; } = string.Empty;
    public string Description { get; init; } = string.Empty;
    public string? LeftField { get; init; }
    public string? RightField { get; init; }
    public string? Operator { get; init; }
}

