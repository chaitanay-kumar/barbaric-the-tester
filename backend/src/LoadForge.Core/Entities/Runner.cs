namespace LoadForge.Core.Entities;

/// <summary>
/// Distributed load generator agent
/// </summary>
public class Runner
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    
    // Registration
    public string RegistrationToken { get; set; } = string.Empty;
    public string? Hostname { get; set; }
    public string? IpAddress { get; set; }
    public string? Version { get; set; }
    
    // Capabilities
    public int MaxVUs { get; set; } = 1000;
    public string? Tags { get; set; } // JSON array of tags
    
    // Status
    public RunnerStatus Status { get; set; } = RunnerStatus.Offline;
    public DateTime? LastHeartbeat { get; set; }
    public DateTime? RegisteredAt { get; set; }
    
    // Current work
    public int ActiveVUs { get; set; } = 0;
    public Guid? CurrentRunId { get; set; }
    
    // Organization
    public Guid OrganizationId { get; set; }
    public Organization Organization { get; set; } = null!;
    
    // Timestamps
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    
    // Navigation
    public ICollection<RunnerAssignment> Assignments { get; set; } = new List<RunnerAssignment>();
}

public enum RunnerStatus
{
    Offline = 0,
    Online = 1,
    Busy = 2,
    Draining = 3,
    Error = 4
}

/// <summary>
/// Assignment of a runner to a test run
/// </summary>
public class RunnerAssignment
{
    public Guid Id { get; set; }
    
    // Assigned workload
    public int AssignedVUs { get; set; }
    public int AssignedRPS { get; set; }
    
    // Status
    public RunnerAssignmentStatus Status { get; set; } = RunnerAssignmentStatus.Pending;
    public DateTime? StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    
    // Metrics summary from this runner
    public long TotalRequests { get; set; }
    public long FailedRequests { get; set; }
    public double AvgLatencyMs { get; set; }
    
    // Error
    public string? ErrorMessage { get; set; }
    
    // References
    public Guid RunnerId { get; set; }
    public Runner Runner { get; set; } = null!;
    
    public Guid TestRunId { get; set; }
    public TestRun TestRun { get; set; } = null!;
}

public enum RunnerAssignmentStatus
{
    Pending = 0,
    Assigned = 1,
    Running = 2,
    Completed = 3,
    Failed = 4,
    Cancelled = 5
}

