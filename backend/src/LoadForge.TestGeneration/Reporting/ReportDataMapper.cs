using LoadForge.Core.Entities;
using System.Text.Json;

namespace LoadForge.TestGeneration.Reporting;

/// <summary>
/// Maps database entities (GeneratedTestRun + Executions + TestCases) 
/// into the format-agnostic ReportData model for report generation.
/// </summary>
public static class ReportDataMapper
{
    /// <summary>
    /// Build a ReportData from a test run with its executions and associated test cases.
    /// </summary>
    public static ReportData MapFromTestRun(
        GeneratedTestRun run,
        IEnumerable<GeneratedTestExecution> executions,
        IDictionary<Guid, GeneratedTestCase> testCaseLookup,
        string? environmentName = null,
        string? baseUrl = null)
    {
        var reportData = new ReportData
        {
            SuiteName = $"Test Run - {run.CollectionId}",
            EnvironmentName = environmentName,
            BaseUrl = baseUrl,
            GeneratedAt = run.CompletedAt ?? DateTime.UtcNow,
            TotalTests = run.TotalTests,
            PassedTests = run.PassedTests,
            FailedTests = run.FailedTests,
            SkippedTests = run.SkippedTests,
            PassRate = run.PassRate,
            DurationSeconds = run.DurationSeconds
        };

        foreach (var exec in executions)
        {
            testCaseLookup.TryGetValue(exec.TestCaseId, out var testCase);

            var reportExec = new ReportExecution
            {
                TestName = testCase?.Name ?? $"Test {exec.TestCaseId.ToString()[..8]}",
                Method = testCase?.Method ?? "GET",
                Path = testCase?.Path ?? "/unknown",
                Severity = testCase?.Severity ?? "P1",
                CoverageCategory = testCase?.CoverageCategory ?? "Unknown",
                Status = exec.Status,
                ResponseStatusCode = exec.ResponseStatusCode ?? 0,
                DurationMs = exec.DurationMs,
                CorrelationId = exec.CorrelationId,
                ErrorMessage = exec.ErrorMessage,
                RequestSummary = FormatJson(exec.RequestJson),
                ResponseSummary = FormatJson(exec.ResponseJson),
                RetryCount = exec.RetryCount,
                AssertionFailures = ParseAssertionFailures(exec.AssertionResultsJson)
            };

            reportData.Executions.Add(reportExec);
        }

        return reportData;
    }

    private static List<ReportAssertionFailure> ParseAssertionFailures(string? assertionResultsJson)
    {
        if (string.IsNullOrEmpty(assertionResultsJson))
            return new List<ReportAssertionFailure>();

        try
        {
            var results = JsonSerializer.Deserialize<List<AssertionResultEntry>>(assertionResultsJson,
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

            if (results == null) return new List<ReportAssertionFailure>();

            return results
                .Where(r => !r.Passed)
                .Select(r => new ReportAssertionFailure
                {
                    Type = r.Type ?? "unknown",
                    Expression = r.Expression,
                    Expected = r.Expected ?? "",
                    Actual = r.Actual ?? ""
                })
                .ToList();
        }
        catch
        {
            return new List<ReportAssertionFailure>();
        }
    }

    private static string? FormatJson(string? json)
    {
        if (string.IsNullOrEmpty(json)) return null;
        try
        {
            using var doc = JsonDocument.Parse(json);
            return JsonSerializer.Serialize(doc.RootElement, new JsonSerializerOptions { WriteIndented = true });
        }
        catch
        {
            return json;
        }
    }

    /// <summary>
    /// Internal model for deserializing assertion results from JSON
    /// </summary>
    private class AssertionResultEntry
    {
        public string? Type { get; set; }
        public string? Expression { get; set; }
        public bool Passed { get; set; }
        public string? Expected { get; set; }
        public string? Actual { get; set; }
    }
}

