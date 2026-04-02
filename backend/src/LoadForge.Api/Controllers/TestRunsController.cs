using LoadForge.Core.Entities;
using LoadForge.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace LoadForge.Api.Controllers;

/// <summary>
/// Test run execution and management
/// </summary>
[Authorize]
[Route("api/projects/{projectId:guid}/runs")]
public class TestRunsController : BaseApiController
{
    private readonly LoadForgeDbContext _db;
    private readonly ILogger<TestRunsController> _logger;

    public TestRunsController(LoadForgeDbContext db, ILogger<TestRunsController> logger)
    {
        _db = db;
        _logger = logger;
    }

    /// <summary>
    /// Get all test runs for a project
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetRuns(
        Guid projectId,
        [FromQuery] Guid? scenarioId = null,
        [FromQuery] RunStatus? status = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var orgId = GetOrganizationId();
        
        var query = _db.TestRuns
            .Where(r => r.ProjectId == projectId && r.Project.OrganizationId == orgId);

        if (scenarioId.HasValue)
            query = query.Where(r => r.ScenarioId == scenarioId.Value);

        if (status.HasValue)
            query = query.Where(r => r.Status == status.Value);

        query = query.OrderByDescending(r => r.CreatedAt);

        var totalCount = await query.CountAsync();
        var items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Include(r => r.Scenario)
            .Include(r => r.Environment)
            .Include(r => r.TriggeredBy)
            .Select(r => new TestRunDto
            {
                Id = r.Id,
                RunNumber = r.RunNumber,
                ScenarioId = r.ScenarioId,
                ScenarioName = r.Scenario.Name,
                EnvironmentName = r.Environment.Name,
                Status = r.Status,
                Result = r.Result,
                Trigger = r.Trigger,
                TriggeredBy = r.TriggeredBy != null ? r.TriggeredBy.Email : null,
                StartedAt = r.StartedAt,
                CompletedAt = r.CompletedAt,
                DurationSeconds = r.DurationSeconds,
                IsBaseline = r.IsBaseline,
                CreatedAt = r.CreatedAt
            })
            .ToListAsync();

        return ApiResponse(new PaginatedResponse<TestRunDto>
        {
            Items = items,
            TotalCount = totalCount,
            PageNumber = page,
            PageSize = pageSize
        });
    }

    /// <summary>
    /// Get test run details with metrics
    /// </summary>
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetRun(Guid projectId, Guid id)
    {
        var run = await _db.TestRuns
            .Include(r => r.Scenario)
            .Include(r => r.Environment)
            .Include(r => r.TriggeredBy)
            .Include(r => r.ThresholdResults)
            .Include(r => r.RunnerAssignments)
                .ThenInclude(a => a.Runner)
            .FirstOrDefaultAsync(r => r.Id == id && r.ProjectId == projectId);

        if (run == null)
            return NotFound();

        // Get aggregated metrics
        var metrics = await _db.RunMetrics
            .Where(m => m.TestRunId == id && m.EndpointId == null)
            .OrderBy(m => m.Timestamp)
            .ToListAsync();

        return ApiResponse(new TestRunDetailDto
        {
            Id = run.Id,
            RunNumber = run.RunNumber,
            ScenarioId = run.ScenarioId,
            ScenarioName = run.Scenario.Name,
            EnvironmentName = run.Environment.Name,
            Status = run.Status,
            Result = run.Result,
            Trigger = run.Trigger,
            TriggerSource = run.TriggerSource,
            TriggeredBy = run.TriggeredBy?.Email,
            StartedAt = run.StartedAt,
            CompletedAt = run.CompletedAt,
            DurationSeconds = run.DurationSeconds,
            IsBaseline = run.IsBaseline,
            ErrorMessage = run.ErrorMessage,
            ThresholdResults = run.ThresholdResults.Select(t => new ThresholdResultDto
            {
                Metric = t.Metric.ToString(),
                Operator = t.Operator.ToString(),
                ExpectedValue = t.ExpectedValue,
                ActualValue = t.ActualValue,
                Passed = t.Passed
            }).ToList(),
            Runners = run.RunnerAssignments.Select(a => new RunnerAssignmentDto
            {
                RunnerId = a.RunnerId,
                RunnerName = a.Runner.Name,
                AssignedVUs = a.AssignedVUs,
                Status = a.Status.ToString(),
                TotalRequests = a.TotalRequests,
                FailedRequests = a.FailedRequests
            }).ToList(),
            Metrics = metrics.Select(m => new MetricsTimePointDto
            {
                Timestamp = m.Timestamp,
                TotalRequests = m.TotalRequests,
                FailedRequests = m.FailedRequests,
                RPS = m.RequestsPerSecond,
                AvgLatencyMs = m.AvgLatencyMs,
                P50LatencyMs = m.P50LatencyMs,
                P95LatencyMs = m.P95LatencyMs,
                P99LatencyMs = m.P99LatencyMs,
                ActiveVUs = m.ActiveVUs
            }).ToList(),
            CreatedAt = run.CreatedAt
        });
    }

    /// <summary>
    /// Start a new test run
    /// </summary>
    [HttpPost]
    [Authorize(Policy = "Developer")]
    public async Task<IActionResult> StartRun(Guid projectId, [FromBody] StartRunRequest request)
    {
        var orgId = GetOrganizationId();
        var userId = GetUserId();

        // Validate scenario exists
        var scenario = await _db.Scenarios
            .Include(s => s.Stages)
            .Include(s => s.Requests)
            .Include(s => s.Thresholds)
            .FirstOrDefaultAsync(s => s.Id == request.ScenarioId && s.ProjectId == projectId);

        if (scenario == null)
            return NotFound("Scenario not found");

        // Validate environment
        var environment = await _db.Environments
            .Include(e => e.Variables)
            .Include(e => e.Headers)
            .FirstOrDefaultAsync(e => e.Id == request.EnvironmentId && e.ProjectId == projectId);

        if (environment == null)
            return NotFound("Environment not found");

        // Check concurrent run limits
        var org = await _db.Organizations.FindAsync(orgId);
        var activeRuns = await _db.TestRuns
            .CountAsync(r => r.Project.OrganizationId == orgId && 
                           (r.Status == RunStatus.Running || r.Status == RunStatus.Initializing));

        if (activeRuns >= (org?.MaxConcurrentRuns ?? 5))
            return ApiError("Maximum concurrent runs limit reached");

        // Generate run number
        var runCount = await _db.TestRuns.CountAsync(r => r.ProjectId == projectId) + 1;
        var runNumber = $"RUN-{DateTime.UtcNow:yyyyMMdd}-{runCount:D4}";

        // Create snapshot of configuration
        var scenarioSnapshot = JsonSerializer.Serialize(new
        {
            scenario.Name,
            scenario.ExecutionType,
            scenario.LoadModel,
            scenario.Distribution,
            scenario.ThinkTimeMinMs,
            scenario.ThinkTimeMaxMs,
            Stages = scenario.Stages.Select(s => new { s.Name, s.DurationSeconds, s.TargetVUs, s.TargetRPS, s.RampStrategy }),
            Thresholds = scenario.Thresholds.Select(t => new { t.Metric, t.Operator, t.Value })
        });

        var environmentSnapshot = JsonSerializer.Serialize(new
        {
            environment.Name,
            environment.BaseUrl,
            Variables = environment.Variables.Select(v => new { v.Key, v.Value }),
            Headers = environment.Headers.Select(h => new { h.Key, h.Value })
        });

        var run = new TestRun
        {
            Id = Guid.NewGuid(),
            RunNumber = runNumber,
            Status = RunStatus.Pending,
            Trigger = RunTrigger.Manual,
            ScenarioId = scenario.Id,
            ProjectId = projectId,
            EnvironmentId = environment.Id,
            TriggeredById = userId,
            ScenarioSnapshot = scenarioSnapshot,
            EnvironmentSnapshot = environmentSnapshot,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _db.TestRuns.Add(run);
        await _db.SaveChangesAsync();

        _logger.LogInformation("Test run {RunNumber} created for scenario {ScenarioId}", runNumber, scenario.Id);

        // TODO: Queue the run for execution by workers

        return CreatedAtAction(nameof(GetRun), new { projectId, id = run.Id }, ApiResponse(new { run.Id, run.RunNumber }));
    }

    /// <summary>
    /// Stop a running test
    /// </summary>
    [HttpPost("{id:guid}/stop")]
    [Authorize(Policy = "Developer")]
    public async Task<IActionResult> StopRun(Guid projectId, Guid id)
    {
        var run = await _db.TestRuns
            .FirstOrDefaultAsync(r => r.Id == id && r.ProjectId == projectId);

        if (run == null)
            return NotFound();

        if (run.Status != RunStatus.Running && run.Status != RunStatus.Initializing)
            return ApiError("Test is not running");

        run.Status = RunStatus.Stopping;
        run.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        _logger.LogInformation("Test run {RunId} stop requested", id);

        // TODO: Signal workers to stop

        return ApiResponse("Stop signal sent");
    }

    /// <summary>
    /// Mark a run as baseline
    /// </summary>
    [HttpPost("{id:guid}/set-baseline")]
    [Authorize(Policy = "TeamLead")]
    public async Task<IActionResult> SetBaseline(Guid projectId, Guid id)
    {
        var run = await _db.TestRuns
            .FirstOrDefaultAsync(r => r.Id == id && r.ProjectId == projectId);

        if (run == null)
            return NotFound();

        if (run.Status != RunStatus.Completed)
            return ApiError("Only completed runs can be set as baseline");

        // Clear previous baseline for this scenario
        var previousBaselines = await _db.TestRuns
            .Where(r => r.ScenarioId == run.ScenarioId && r.IsBaseline && r.Id != id)
            .ToListAsync();

        foreach (var prev in previousBaselines)
            prev.IsBaseline = false;

        run.IsBaseline = true;
        run.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        return ApiResponse("Run marked as baseline");
    }

    /// <summary>
    /// Compare run to baseline
    /// </summary>
    [HttpGet("{id:guid}/compare")]
    public async Task<IActionResult> CompareToBaseline(Guid projectId, Guid id)
    {
        var run = await _db.TestRuns
            .Include(r => r.Metrics.Where(m => m.EndpointId == null))
            .FirstOrDefaultAsync(r => r.Id == id && r.ProjectId == projectId);

        if (run == null)
            return NotFound();

        // Find baseline for this scenario
        var baseline = await _db.TestRuns
            .Include(r => r.Metrics.Where(m => m.EndpointId == null))
            .FirstOrDefaultAsync(r => r.ScenarioId == run.ScenarioId && r.IsBaseline);

        if (baseline == null)
            return ApiError("No baseline found for this scenario");

        // Calculate comparison metrics
        var runMetrics = run.Metrics.LastOrDefault();
        var baselineMetrics = baseline.Metrics.LastOrDefault();

        if (runMetrics == null || baselineMetrics == null)
            return ApiError("Insufficient metrics data for comparison");

        var comparison = new BaselineComparisonDto
        {
            RunId = run.Id,
            BaselineRunId = baseline.Id,
            BaselineRunNumber = baseline.RunNumber,
            Metrics = new ComparisonMetricsDto
            {
                P95LatencyMs = new MetricComparisonDto
                {
                    Baseline = baselineMetrics.P95LatencyMs,
                    Current = runMetrics.P95LatencyMs,
                    ChangePercent = CalculateChangePercent(baselineMetrics.P95LatencyMs, runMetrics.P95LatencyMs)
                },
                AvgLatencyMs = new MetricComparisonDto
                {
                    Baseline = baselineMetrics.AvgLatencyMs,
                    Current = runMetrics.AvgLatencyMs,
                    ChangePercent = CalculateChangePercent(baselineMetrics.AvgLatencyMs, runMetrics.AvgLatencyMs)
                },
                RPS = new MetricComparisonDto
                {
                    Baseline = baselineMetrics.RequestsPerSecond,
                    Current = runMetrics.RequestsPerSecond,
                    ChangePercent = CalculateChangePercent(baselineMetrics.RequestsPerSecond, runMetrics.RequestsPerSecond)
                },
                ErrorRate = new MetricComparisonDto
                {
                    Baseline = CalculateErrorRate(baselineMetrics),
                    Current = CalculateErrorRate(runMetrics),
                    ChangePercent = CalculateChangePercent(CalculateErrorRate(baselineMetrics), CalculateErrorRate(runMetrics))
                }
            },
            HasRegression = false // Set based on thresholds
        };

        // Check for regressions (>20% increase in latency or error rate)
        if (comparison.Metrics.P95LatencyMs.ChangePercent > 20 ||
            comparison.Metrics.ErrorRate.ChangePercent > 20)
        {
            comparison = comparison with { HasRegression = true };
        }

        return ApiResponse(comparison);
    }

    private static double CalculateChangePercent(double baseline, double current)
    {
        if (baseline == 0) return current > 0 ? 100 : 0;
        return ((current - baseline) / baseline) * 100;
    }

    private static double CalculateErrorRate(RunMetrics m)
    {
        if (m.TotalRequests == 0) return 0;
        return (double)m.FailedRequests / m.TotalRequests * 100;
    }
}

// Request DTOs
public record StartRunRequest
{
    public Guid ScenarioId { get; init; }
    public Guid EnvironmentId { get; init; }
}

// Response DTOs
public record TestRunDto
{
    public Guid Id { get; init; }
    public string RunNumber { get; init; } = string.Empty;
    public Guid ScenarioId { get; init; }
    public string ScenarioName { get; init; } = string.Empty;
    public string EnvironmentName { get; init; } = string.Empty;
    public RunStatus Status { get; init; }
    public RunResult? Result { get; init; }
    public RunTrigger Trigger { get; init; }
    public string? TriggeredBy { get; init; }
    public DateTime? StartedAt { get; init; }
    public DateTime? CompletedAt { get; init; }
    public int? DurationSeconds { get; init; }
    public bool IsBaseline { get; init; }
    public DateTime CreatedAt { get; init; }
}

public record TestRunDetailDto : TestRunDto
{
    public string? TriggerSource { get; init; }
    public string? ErrorMessage { get; init; }
    public IReadOnlyList<ThresholdResultDto> ThresholdResults { get; init; } = new List<ThresholdResultDto>();
    public IReadOnlyList<RunnerAssignmentDto> Runners { get; init; } = new List<RunnerAssignmentDto>();
    public IReadOnlyList<MetricsTimePointDto> Metrics { get; init; } = new List<MetricsTimePointDto>();
}

public record ThresholdResultDto
{
    public string Metric { get; init; } = string.Empty;
    public string Operator { get; init; } = string.Empty;
    public double ExpectedValue { get; init; }
    public double ActualValue { get; init; }
    public bool Passed { get; init; }
}

public record RunnerAssignmentDto
{
    public Guid RunnerId { get; init; }
    public string RunnerName { get; init; } = string.Empty;
    public int AssignedVUs { get; init; }
    public string Status { get; init; } = string.Empty;
    public long TotalRequests { get; init; }
    public long FailedRequests { get; init; }
}

public record MetricsTimePointDto
{
    public DateTime Timestamp { get; init; }
    public long TotalRequests { get; init; }
    public long FailedRequests { get; init; }
    public double RPS { get; init; }
    public double AvgLatencyMs { get; init; }
    public double P50LatencyMs { get; init; }
    public double P95LatencyMs { get; init; }
    public double P99LatencyMs { get; init; }
    public int ActiveVUs { get; init; }
}

public record BaselineComparisonDto
{
    public Guid RunId { get; init; }
    public Guid BaselineRunId { get; init; }
    public string BaselineRunNumber { get; init; } = string.Empty;
    public ComparisonMetricsDto Metrics { get; init; } = new();
    public bool HasRegression { get; init; }
}

public record ComparisonMetricsDto
{
    public MetricComparisonDto P95LatencyMs { get; init; } = new();
    public MetricComparisonDto AvgLatencyMs { get; init; } = new();
    public MetricComparisonDto RPS { get; init; } = new();
    public MetricComparisonDto ErrorRate { get; init; } = new();
}

public record MetricComparisonDto
{
    public double Baseline { get; init; }
    public double Current { get; init; }
    public double ChangePercent { get; init; }
}

