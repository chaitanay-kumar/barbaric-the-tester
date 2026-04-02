namespace LoadForge.Core.Entities;

/// <summary>
/// Test run execution instance
/// </summary>
public class TestRun
{
    public Guid Id { get; set; }
    public string RunNumber { get; set; } = string.Empty; // e.g., "RUN-2024-001"
    
    // Status
    public RunStatus Status { get; set; } = RunStatus.Pending;
    public RunResult? Result { get; set; }
    
    // Timing
    public DateTime? StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public int? DurationSeconds { get; set; }
    
    // Trigger
    public RunTrigger Trigger { get; set; } = RunTrigger.Manual;
    public string? TriggerSource { get; set; } // CI job ID, schedule name, etc.
    
    // Configuration snapshot (JSON)
    public string ScenarioSnapshot { get; set; } = "{}"; // Full scenario config at run time
    public string EnvironmentSnapshot { get; set; } = "{}"; // Environment config snapshot
    
    // Baseline
    public bool IsBaseline { get; set; } = false;
    public Guid? ComparedToBaselineId { get; set; }
    public TestRun? ComparedToBaseline { get; set; }
    
    // Error info
    public string? ErrorMessage { get; set; }
    
    // References
    public Guid ScenarioId { get; set; }
    public Scenario Scenario { get; set; } = null!;
    
    public Guid ProjectId { get; set; }
    public Project Project { get; set; } = null!;
    
    public Guid EnvironmentId { get; set; }
    public Environment Environment { get; set; } = null!;
    
    public Guid? TriggeredById { get; set; }
    public User? TriggeredBy { get; set; }
    
    // Timestamps
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    
    // Navigation
    public ICollection<RunMetrics> Metrics { get; set; } = new List<RunMetrics>();
    public ICollection<RunThresholdResult> ThresholdResults { get; set; } = new List<RunThresholdResult>();
    public ICollection<RunnerAssignment> RunnerAssignments { get; set; } = new List<RunnerAssignment>();
}

public enum RunStatus
{
    Pending = 0,
    Queued = 1,
    Initializing = 2,
    Running = 3,
    Stopping = 4,
    Completed = 5,
    Failed = 6,
    Cancelled = 7
}

public enum RunResult
{
    Pass = 0,
    Fail = 1,
    Error = 2
}

public enum RunTrigger
{
    Manual = 0,
    Api = 1,
    Cli = 2,
    Schedule = 3,
    CiCd = 4
}

/// <summary>
/// Aggregated metrics for a test run
/// </summary>
public class RunMetrics
{
    public Guid Id { get; set; }
    
    // Time bucket (for time-series data)
    public DateTime Timestamp { get; set; }
    public int IntervalSeconds { get; set; } = 1; // Aggregation interval
    
    // Request metrics
    public long TotalRequests { get; set; }
    public long SuccessfulRequests { get; set; }
    public long FailedRequests { get; set; }
    
    // Latency (in milliseconds)
    public double MinLatencyMs { get; set; }
    public double MaxLatencyMs { get; set; }
    public double AvgLatencyMs { get; set; }
    public double P50LatencyMs { get; set; }
    public double P90LatencyMs { get; set; }
    public double P95LatencyMs { get; set; }
    public double P99LatencyMs { get; set; }
    
    // Throughput
    public double RequestsPerSecond { get; set; }
    public double BytesSent { get; set; }
    public double BytesReceived { get; set; }
    
    // Virtual Users
    public int ActiveVUs { get; set; }
    
    // Status codes
    public string StatusCodeDistribution { get; set; } = "{}"; // JSON: {"200": 950, "500": 50}
    
    // Errors
    public string ErrorDistribution { get; set; } = "{}"; // JSON: {"timeout": 10, "connection_refused": 5}
    
    // Test Run
    public Guid TestRunId { get; set; }
    public TestRun TestRun { get; set; } = null!;
    
    // Optional: per-endpoint breakdown
    public Guid? EndpointId { get; set; }
    public ApiEndpoint? Endpoint { get; set; }
}

/// <summary>
/// Threshold evaluation result for a run
/// </summary>
public class RunThresholdResult
{
    public Guid Id { get; set; }
    
    public ThresholdMetric Metric { get; set; }
    public ThresholdOperator Operator { get; set; }
    public double ExpectedValue { get; set; }
    public double ActualValue { get; set; }
    public bool Passed { get; set; }
    
    public Guid TestRunId { get; set; }
    public TestRun TestRun { get; set; } = null!;
}

