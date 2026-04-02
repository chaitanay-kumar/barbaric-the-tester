using LoadForge.Core.Entities;

namespace LoadForge.Core.Interfaces;

/// <summary>
/// Service for executing load tests
/// </summary>
public interface ILoadTestExecutor
{
    Task<TestRun> StartRunAsync(Guid scenarioId, Guid environmentId, Guid? userId, CancellationToken cancellationToken = default);
    Task StopRunAsync(Guid runId, CancellationToken cancellationToken = default);
    Task<RunStatus> GetRunStatusAsync(Guid runId, CancellationToken cancellationToken = default);
}

/// <summary>
/// Service for managing distributed runners
/// </summary>
public interface IRunnerManager
{
    Task<Runner> RegisterRunnerAsync(string name, string token, int maxVUs, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Runner>> GetAvailableRunnersAsync(Guid organizationId, CancellationToken cancellationToken = default);
    Task<bool> HeartbeatAsync(Guid runnerId, CancellationToken cancellationToken = default);
    Task AssignWorkAsync(Guid runnerId, Guid runId, int vus, CancellationToken cancellationToken = default);
    Task UnassignWorkAsync(Guid runnerId, CancellationToken cancellationToken = default);
}

/// <summary>
/// Service for aggregating and storing metrics
/// </summary>
public interface IMetricsAggregator
{
    Task RecordRequestAsync(Guid runId, RequestMetric metric, CancellationToken cancellationToken = default);
    Task<RunMetrics> GetAggregatedMetricsAsync(Guid runId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<RunMetrics>> GetTimeSeriesAsync(Guid runId, DateTime from, DateTime to, CancellationToken cancellationToken = default);
}

/// <summary>
/// Individual request metric from runner
/// </summary>
public record RequestMetric
{
    public Guid EndpointId { get; init; }
    public DateTime Timestamp { get; init; }
    public double LatencyMs { get; init; }
    public int StatusCode { get; init; }
    public bool Success { get; init; }
    public long BytesSent { get; init; }
    public long BytesReceived { get; init; }
    public string? ErrorMessage { get; init; }
}

/// <summary>
/// Service for encrypting/decrypting secrets
/// </summary>
public interface ISecretEncryption
{
    string Encrypt(string plainText);
    string Decrypt(string cipherText);
}

/// <summary>
/// Service for importing API collections
/// </summary>
public interface ICollectionImporter
{
    Task<ApiCollection> ImportPostmanAsync(Guid projectId, string json, CancellationToken cancellationToken = default);
    Task<ApiCollection> ImportOpenApiAsync(Guid projectId, string json, CancellationToken cancellationToken = default);
}

/// <summary>
/// Service for baseline comparison
/// </summary>
public interface IBaselineComparer
{
    Task<BaselineComparison> CompareAsync(Guid runId, Guid baselineRunId, CancellationToken cancellationToken = default);
}

public record BaselineComparison
{
    public Guid RunId { get; init; }
    public Guid BaselineRunId { get; init; }
    public double LatencyChangePercent { get; init; }
    public double ThroughputChangePercent { get; init; }
    public double ErrorRateChangePercent { get; init; }
    public bool HasRegression { get; init; }
    public IReadOnlyList<string> RegressionDetails { get; init; } = new List<string>();
}

/// <summary>
/// Service for scheduling tests
/// </summary>
public interface IScheduleService
{
    Task<Schedule> CreateScheduleAsync(Schedule schedule, CancellationToken cancellationToken = default);
    Task UpdateScheduleAsync(Schedule schedule, CancellationToken cancellationToken = default);
    Task DeleteScheduleAsync(Guid scheduleId, CancellationToken cancellationToken = default);
    Task<DateTime?> GetNextRunTimeAsync(string cronExpression, string timezone);
}

/// <summary>
/// Service for real-time metrics streaming
/// </summary>
public interface IMetricsStreamService
{
    Task PublishMetricsAsync(Guid runId, RunMetrics metrics, CancellationToken cancellationToken = default);
    IAsyncEnumerable<RunMetrics> SubscribeAsync(Guid runId, CancellationToken cancellationToken = default);
}

