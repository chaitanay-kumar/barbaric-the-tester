namespace LoadForge.Core.Entities;

/// <summary>
/// Performance test scenario - the heart of the system
/// </summary>
public class Scenario
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    
    // Test Configuration
    public ExecutionType ExecutionType { get; set; } = ExecutionType.Load;
    public LoadModel LoadModel { get; set; } = LoadModel.VirtualUsers;
    
    // Request Distribution
    public RequestDistribution Distribution { get; set; } = RequestDistribution.Weighted;
    
    // Think Time (ms)
    public int ThinkTimeMinMs { get; set; } = 0;
    public int ThinkTimeMaxMs { get; set; } = 0;
    
    // Data Feed
    public DataFeedType? DataFeedType { get; set; }
    public string? DataFeedConfig { get; set; } // JSON config for CSV/JSON/Random
    
    // Project & Environment
    public Guid ProjectId { get; set; }
    public Project Project { get; set; } = null!;
    
    public Guid? DefaultEnvironmentId { get; set; }
    public Environment? DefaultEnvironment { get; set; }
    
    // Status
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    
    // Navigation
    public ICollection<ScenarioStage> Stages { get; set; } = new List<ScenarioStage>();
    public ICollection<ScenarioRequest> Requests { get; set; } = new List<ScenarioRequest>();
    public ICollection<ScenarioThreshold> Thresholds { get; set; } = new List<ScenarioThreshold>();
    public ICollection<TestRun> TestRuns { get; set; } = new List<TestRun>();
}

public enum ExecutionType
{
    Load = 0,      // Constant load
    Ramp = 1,      // Gradual increase
    Spike = 2,     // Sudden burst
    Stress = 3,    // Beyond capacity
    Soak = 4       // Extended duration
}

public enum LoadModel
{
    VirtualUsers = 0,      // Simulated concurrent users
    ConstantArrivalRate = 1 // Fixed requests per second
}

public enum RequestDistribution
{
    Sequential = 0,   // In order
    Random = 1,       // Random selection
    Weighted = 2      // Based on weights
}

public enum DataFeedType
{
    None = 0,
    CsvFile = 1,
    JsonDataset = 2,
    RandomGeneration = 3
}

/// <summary>
/// Stage in a scenario (ramp, hold, spike, etc.)
/// </summary>
public class ScenarioStage
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    
    // Stage Configuration
    public int SortOrder { get; set; } = 0;
    public int DurationSeconds { get; set; }
    public int TargetVUs { get; set; }           // For VU model
    public int? TargetRPS { get; set; }          // For constant arrival rate
    
    // Ramp Strategy
    public RampStrategy RampStrategy { get; set; } = RampStrategy.Linear;
    
    // Scenario
    public Guid ScenarioId { get; set; }
    public Scenario Scenario { get; set; } = null!;
}

public enum RampStrategy
{
    Linear = 0,
    Exponential = 1,
    Step = 2,
    Immediate = 3
}

/// <summary>
/// Request included in scenario with weight
/// </summary>
public class ScenarioRequest
{
    public Guid Id { get; set; }
    
    // Weight for distribution (e.g., 50 = 50%)
    public int Weight { get; set; } = 100;
    public int SortOrder { get; set; } = 0;
    
    // Optional overrides
    public string? UrlOverride { get; set; }
    public string? BodyOverride { get; set; }
    public string? HeadersOverrideJson { get; set; }
    
    // References
    public Guid ScenarioId { get; set; }
    public Scenario Scenario { get; set; } = null!;
    
    public Guid EndpointId { get; set; }
    public ApiEndpoint Endpoint { get; set; } = null!;
}

/// <summary>
/// Pass/fail threshold for a scenario
/// </summary>
public class ScenarioThreshold
{
    public Guid Id { get; set; }
    public ThresholdMetric Metric { get; set; }
    public ThresholdOperator Operator { get; set; }
    public double Value { get; set; }
    
    // e.g., p95 < 300, error_rate < 1, rps > 2000
    
    public Guid ScenarioId { get; set; }
    public Scenario Scenario { get; set; } = null!;
}

public enum ThresholdMetric
{
    P50Latency = 0,
    P90Latency = 1,
    P95Latency = 2,
    P99Latency = 3,
    AvgLatency = 4,
    MaxLatency = 5,
    ErrorRate = 6,
    RPS = 7
}

public enum ThresholdOperator
{
    LessThan = 0,
    LessThanOrEqual = 1,
    GreaterThan = 2,
    GreaterThanOrEqual = 3,
    Equals = 4
}

