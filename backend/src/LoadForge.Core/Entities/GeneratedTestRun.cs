namespace LoadForge.Core.Entities;

/// <summary>
/// Represents a complete test execution run (collection of test cases)
/// </summary>
public class GeneratedTestRun
{
    /// <summary>Unique identifier</summary>
    public Guid Id { get; set; }

    /// <summary>API Collection this run executes tests from</summary>
    public Guid CollectionId { get; set; }
    public ApiCollection? Collection { get; set; }

    /// <summary>User who triggered the test run</summary>
    public Guid ExecutedById { get; set; }
    public User? ExecutedBy { get; set; }

    /// <summary>Environment used for execution (base URL, headers, etc)</summary>
    public Guid EnvironmentId { get; set; }
    public Environment? Environment { get; set; }

    /// <summary>Overall test run status: Pending|Running|Passed|Failed|Partial</summary>
    public string Status { get; set; } = "Pending";

    /// <summary>User-provided description of why this test run was executed</summary>
    public string? Description { get; set; }

    /// <summary>Total number of test cases in this run</summary>
    public int TotalTests { get; set; }

    /// <summary>Number of passed tests</summary>
    public int PassedTests { get; set; }

    /// <summary>Number of failed tests</summary>
    public int FailedTests { get; set; }

    /// <summary>Number of skipped tests</summary>
    public int SkippedTests { get; set; }

    /// <summary>Overall pass rate percentage</summary>
    public decimal PassRate { get; set; }

    /// <summary>Total duration in seconds</summary>
    public long DurationSeconds { get; set; }

    /// <summary>JSON-serialized test summary</summary>
    public string? SummaryJson { get; set; }

    /// <summary>JSON-serialized full report (with request/response evidence)</summary>
    public string? ReportJson { get; set; }

    /// <summary>Aggregated metrics from all test executions</summary>
    public string? MetricsJson { get; set; }

    /// <summary>All test executions in this run</summary>
    public ICollection<GeneratedTestExecution> Executions { get; set; } = new List<GeneratedTestExecution>();

    /// <summary>When the test run was created</summary>
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>When the test run started executing</summary>
    public DateTime? StartedAt { get; set; }

    /// <summary>When the test run completed</summary>
    public DateTime? CompletedAt { get; set; }
}

