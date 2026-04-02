using LoadForge.Core.Entities;
using LoadForge.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LoadForge.Api.Controllers;

/// <summary>
/// Scenario management endpoints
/// </summary>
[Authorize]
[Route("api/projects/{projectId:guid}/scenarios")]
public class ScenariosController : BaseApiController
{
    private readonly LoadForgeDbContext _db;
    private readonly ILogger<ScenariosController> _logger;

    public ScenariosController(LoadForgeDbContext db, ILogger<ScenariosController> logger)
    {
        _db = db;
        _logger = logger;
    }

    /// <summary>
    /// Get all scenarios for a project
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetScenarios(Guid projectId)
    {
        var orgId = GetOrganizationId();
        
        var project = await _db.Projects
            .FirstOrDefaultAsync(p => p.Id == projectId && p.OrganizationId == orgId);
        
        if (project == null)
            return NotFound("Project not found");

        var scenarios = await _db.Scenarios
            .Where(s => s.ProjectId == projectId && s.IsActive)
            .Include(s => s.Stages)
            .Include(s => s.Requests)
            .Include(s => s.Thresholds)
            .OrderByDescending(s => s.UpdatedAt)
            .ToListAsync();

        return ApiResponse(scenarios.Select(MapToDto));
    }

    /// <summary>
    /// Get scenario by ID
    /// </summary>
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetScenario(Guid projectId, Guid id)
    {
        var scenario = await _db.Scenarios
            .Include(s => s.Stages.OrderBy(st => st.SortOrder))
            .Include(s => s.Requests.OrderBy(r => r.SortOrder))
                .ThenInclude(r => r.Endpoint)
            .Include(s => s.Thresholds)
            .Include(s => s.DefaultEnvironment)
            .FirstOrDefaultAsync(s => s.Id == id && s.ProjectId == projectId);

        if (scenario == null)
            return NotFound();

        return ApiResponse(MapToDetailDto(scenario));
    }

    /// <summary>
    /// Create a new scenario
    /// </summary>
    [HttpPost]
    [Authorize(Policy = "Developer")]
    public async Task<IActionResult> CreateScenario(Guid projectId, [FromBody] CreateScenarioRequest request)
    {
        var orgId = GetOrganizationId();
        
        var project = await _db.Projects
            .FirstOrDefaultAsync(p => p.Id == projectId && p.OrganizationId == orgId);
        
        if (project == null)
            return NotFound("Project not found");

        var scenario = new Scenario
        {
            Id = Guid.NewGuid(),
            Name = request.Name,
            Description = request.Description,
            ExecutionType = request.ExecutionType,
            LoadModel = request.LoadModel,
            Distribution = request.Distribution,
            ThinkTimeMinMs = request.ThinkTimeMinMs,
            ThinkTimeMaxMs = request.ThinkTimeMaxMs,
            ProjectId = projectId,
            DefaultEnvironmentId = request.DefaultEnvironmentId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        // Add stages
        var sortOrder = 0;
        foreach (var stageReq in request.Stages)
        {
            scenario.Stages.Add(new ScenarioStage
            {
                Id = Guid.NewGuid(),
                Name = stageReq.Name,
                SortOrder = sortOrder++,
                DurationSeconds = stageReq.DurationSeconds,
                TargetVUs = stageReq.TargetVUs,
                TargetRPS = stageReq.TargetRPS,
                RampStrategy = stageReq.RampStrategy
            });
        }

        // Add thresholds
        foreach (var thresholdReq in request.Thresholds)
        {
            scenario.Thresholds.Add(new ScenarioThreshold
            {
                Id = Guid.NewGuid(),
                Metric = thresholdReq.Metric,
                Operator = thresholdReq.Operator,
                Value = thresholdReq.Value
            });
        }

        _db.Scenarios.Add(scenario);
        await _db.SaveChangesAsync();

        _logger.LogInformation("Scenario {ScenarioId} created in project {ProjectId}", scenario.Id, projectId);

        return CreatedAtAction(nameof(GetScenario), new { projectId, id = scenario.Id }, ApiResponse(MapToDto(scenario)));
    }

    /// <summary>
    /// Add requests to scenario
    /// </summary>
    [HttpPost("{id:guid}/requests")]
    [Authorize(Policy = "Developer")]
    public async Task<IActionResult> AddRequests(Guid projectId, Guid id, [FromBody] AddRequestsRequest request)
    {
        var scenario = await _db.Scenarios
            .Include(s => s.Requests)
            .FirstOrDefaultAsync(s => s.Id == id && s.ProjectId == projectId);

        if (scenario == null)
            return NotFound();

        var maxSortOrder = scenario.Requests.Any() ? scenario.Requests.Max(r => r.SortOrder) : -1;

        foreach (var reqItem in request.Requests)
        {
            scenario.Requests.Add(new ScenarioRequest
            {
                Id = Guid.NewGuid(),
                EndpointId = reqItem.EndpointId,
                Weight = reqItem.Weight,
                SortOrder = ++maxSortOrder,
                UrlOverride = reqItem.UrlOverride,
                BodyOverride = reqItem.BodyOverride
            });
        }

        scenario.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return ApiResponse(scenario.Requests.Count, "Requests added successfully");
    }

    /// <summary>
    /// Update scenario
    /// </summary>
    [HttpPut("{id:guid}")]
    [Authorize(Policy = "Developer")]
    public async Task<IActionResult> UpdateScenario(Guid projectId, Guid id, [FromBody] UpdateScenarioRequest request)
    {
        var scenario = await _db.Scenarios
            .Include(s => s.Stages)
            .Include(s => s.Thresholds)
            .FirstOrDefaultAsync(s => s.Id == id && s.ProjectId == projectId);

        if (scenario == null)
            return NotFound();

        scenario.Name = request.Name ?? scenario.Name;
        scenario.Description = request.Description ?? scenario.Description;
        scenario.ExecutionType = request.ExecutionType ?? scenario.ExecutionType;
        scenario.LoadModel = request.LoadModel ?? scenario.LoadModel;
        scenario.ThinkTimeMinMs = request.ThinkTimeMinMs ?? scenario.ThinkTimeMinMs;
        scenario.ThinkTimeMaxMs = request.ThinkTimeMaxMs ?? scenario.ThinkTimeMaxMs;
        scenario.UpdatedAt = DateTime.UtcNow;

        // Update stages if provided
        if (request.Stages != null)
        {
            _db.ScenarioStages.RemoveRange(scenario.Stages);
            var sortOrder = 0;
            foreach (var stageReq in request.Stages)
            {
                scenario.Stages.Add(new ScenarioStage
                {
                    Id = Guid.NewGuid(),
                    Name = stageReq.Name,
                    SortOrder = sortOrder++,
                    DurationSeconds = stageReq.DurationSeconds,
                    TargetVUs = stageReq.TargetVUs,
                    TargetRPS = stageReq.TargetRPS,
                    RampStrategy = stageReq.RampStrategy
                });
            }
        }

        await _db.SaveChangesAsync();

        return ApiResponse(MapToDto(scenario));
    }

    /// <summary>
    /// Delete scenario
    /// </summary>
    [HttpDelete("{id:guid}")]
    [Authorize(Policy = "TeamLead")]
    public async Task<IActionResult> DeleteScenario(Guid projectId, Guid id)
    {
        var scenario = await _db.Scenarios
            .FirstOrDefaultAsync(s => s.Id == id && s.ProjectId == projectId);

        if (scenario == null)
            return NotFound();

        scenario.IsActive = false;
        scenario.UpdatedAt = DateTime.UtcNow;
        
        await _db.SaveChangesAsync();

        return NoContent();
    }

    private static ScenarioDto MapToDto(Scenario s) => new()
    {
        Id = s.Id,
        Name = s.Name,
        Description = s.Description,
        ExecutionType = s.ExecutionType,
        LoadModel = s.LoadModel,
        StageCount = s.Stages.Count,
        RequestCount = s.Requests.Count,
        ThresholdCount = s.Thresholds.Count,
        CreatedAt = s.CreatedAt,
        UpdatedAt = s.UpdatedAt
    };

    private static ScenarioDetailDto MapToDetailDto(Scenario s) => new()
    {
        Id = s.Id,
        Name = s.Name,
        Description = s.Description,
        ExecutionType = s.ExecutionType,
        LoadModel = s.LoadModel,
        Distribution = s.Distribution,
        ThinkTimeMinMs = s.ThinkTimeMinMs,
        ThinkTimeMaxMs = s.ThinkTimeMaxMs,
        DefaultEnvironment = s.DefaultEnvironment != null ? new EnvironmentSummaryDto
        {
            Id = s.DefaultEnvironment.Id,
            Name = s.DefaultEnvironment.Name,
            BaseUrl = s.DefaultEnvironment.BaseUrl,
            IsDefault = s.DefaultEnvironment.IsDefault
        } : null,
        Stages = s.Stages.OrderBy(st => st.SortOrder).Select(st => new StageDto
        {
            Id = st.Id,
            Name = st.Name,
            SortOrder = st.SortOrder,
            DurationSeconds = st.DurationSeconds,
            TargetVUs = st.TargetVUs,
            TargetRPS = st.TargetRPS,
            RampStrategy = st.RampStrategy
        }).ToList(),
        Requests = s.Requests.OrderBy(r => r.SortOrder).Select(r => new ScenarioRequestDto
        {
            Id = r.Id,
            EndpointId = r.EndpointId,
            EndpointName = r.Endpoint?.Name ?? "Unknown",
            Method = r.Endpoint?.Method.ToString() ?? "GET",
            Url = r.Endpoint?.Url ?? "",
            Weight = r.Weight,
            SortOrder = r.SortOrder
        }).ToList(),
        Thresholds = s.Thresholds.Select(t => new ThresholdDto
        {
            Id = t.Id,
            Metric = t.Metric,
            Operator = t.Operator,
            Value = t.Value
        }).ToList(),
        StageCount = s.Stages.Count,
        RequestCount = s.Requests.Count,
        ThresholdCount = s.Thresholds.Count,
        CreatedAt = s.CreatedAt,
        UpdatedAt = s.UpdatedAt
    };
}

// Request DTOs
public record CreateScenarioRequest
{
    public required string Name { get; init; }
    public string? Description { get; init; }
    public ExecutionType ExecutionType { get; init; } = ExecutionType.Load;
    public LoadModel LoadModel { get; init; } = LoadModel.VirtualUsers;
    public RequestDistribution Distribution { get; init; } = RequestDistribution.Weighted;
    public int ThinkTimeMinMs { get; init; } = 0;
    public int ThinkTimeMaxMs { get; init; } = 0;
    public Guid? DefaultEnvironmentId { get; init; }
    public IReadOnlyList<CreateStageRequest> Stages { get; init; } = new List<CreateStageRequest>();
    public IReadOnlyList<CreateThresholdRequest> Thresholds { get; init; } = new List<CreateThresholdRequest>();
}

public record CreateStageRequest
{
    public required string Name { get; init; }
    public int DurationSeconds { get; init; }
    public int TargetVUs { get; init; }
    public int? TargetRPS { get; init; }
    public RampStrategy RampStrategy { get; init; } = RampStrategy.Linear;
}

public record CreateThresholdRequest
{
    public ThresholdMetric Metric { get; init; }
    public ThresholdOperator Operator { get; init; }
    public double Value { get; init; }
}

public record UpdateScenarioRequest
{
    public string? Name { get; init; }
    public string? Description { get; init; }
    public ExecutionType? ExecutionType { get; init; }
    public LoadModel? LoadModel { get; init; }
    public int? ThinkTimeMinMs { get; init; }
    public int? ThinkTimeMaxMs { get; init; }
    public IReadOnlyList<CreateStageRequest>? Stages { get; init; }
}

public record AddRequestsRequest
{
    public IReadOnlyList<AddRequestItem> Requests { get; init; } = new List<AddRequestItem>();
}

public record AddRequestItem
{
    public Guid EndpointId { get; init; }
    public int Weight { get; init; } = 100;
    public string? UrlOverride { get; init; }
    public string? BodyOverride { get; init; }
}

// Response DTOs
public record ScenarioDto
{
    public Guid Id { get; init; }
    public string Name { get; init; } = string.Empty;
    public string? Description { get; init; }
    public ExecutionType ExecutionType { get; init; }
    public LoadModel LoadModel { get; init; }
    public int StageCount { get; init; }
    public int RequestCount { get; init; }
    public int ThresholdCount { get; init; }
    public DateTime CreatedAt { get; init; }
    public DateTime UpdatedAt { get; init; }
}

public record ScenarioDetailDto : ScenarioDto
{
    public RequestDistribution Distribution { get; init; }
    public int ThinkTimeMinMs { get; init; }
    public int ThinkTimeMaxMs { get; init; }
    public EnvironmentSummaryDto? DefaultEnvironment { get; init; }
    public IReadOnlyList<StageDto> Stages { get; init; } = new List<StageDto>();
    public IReadOnlyList<ScenarioRequestDto> Requests { get; init; } = new List<ScenarioRequestDto>();
    public IReadOnlyList<ThresholdDto> Thresholds { get; init; } = new List<ThresholdDto>();
}

public record StageDto
{
    public Guid Id { get; init; }
    public string Name { get; init; } = string.Empty;
    public int SortOrder { get; init; }
    public int DurationSeconds { get; init; }
    public int TargetVUs { get; init; }
    public int? TargetRPS { get; init; }
    public RampStrategy RampStrategy { get; init; }
}

public record ScenarioRequestDto
{
    public Guid Id { get; init; }
    public Guid EndpointId { get; init; }
    public string EndpointName { get; init; } = string.Empty;
    public string Method { get; init; } = "GET";
    public string Url { get; init; } = string.Empty;
    public int Weight { get; init; }
    public int SortOrder { get; init; }
}

public record ThresholdDto
{
    public Guid Id { get; init; }
    public ThresholdMetric Metric { get; init; }
    public ThresholdOperator Operator { get; init; }
    public double Value { get; init; }
}

