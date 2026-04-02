namespace LoadForge.Core.Entities;

/// <summary>
/// Records the execution of a single generated test case
/// </summary>
public class GeneratedTestExecution
{
    /// <summary>Unique identifier</summary>
    public Guid Id { get; set; }

    /// <summary>Reference to the test case that was executed</summary>
    public Guid TestCaseId { get; set; }
    public GeneratedTestCase? TestCase { get; set; }

    /// <summary>Reference to the test run this execution belongs to</summary>
    public Guid TestRunId { get; set; }
    public GeneratedTestRun? TestRun { get; set; }

    /// <summary>Execution status: Pending|Running|Passed|Failed|Skipped</summary>
    public string Status { get; set; } = "Pending";

    /// <summary>HTTP status code received from the server</summary>
    public int? ResponseStatusCode { get; set; }

    /// <summary>Full request sent (masked for secrets)</summary>
    public string? RequestJson { get; set; }

    /// <summary>Full response received (masked for secrets)</summary>
    public string? ResponseJson { get; set; }

    /// <summary>Response headers (masked for auth headers)</summary>
    public string? ResponseHeadersJson { get; set; }

    /// <summary>Assertion validation results: JSON array of {expression, passed, expected, actual}</summary>
    public string? AssertionResultsJson { get; set; }

    /// <summary>Error message if execution failed</summary>
    public string? ErrorMessage { get; set; }

    /// <summary>Time taken to execute in milliseconds</summary>
    public long DurationMs { get; set; }

    /// <summary>Unique correlation ID for tracing</summary>
    public string? CorrelationId { get; set; }

    /// <summary>Number of retries attempted</summary>
    public int RetryCount { get; set; } = 0;

    /// <summary>Timestamp when execution started</summary>
    public DateTime ExecutedAt { get; set; } = DateTime.UtcNow;
}

