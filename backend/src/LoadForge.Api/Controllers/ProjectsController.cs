using LoadForge.Core.Entities;
using LoadForge.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LoadForge.Api.Controllers;

[Authorize(Policy = "Developer")]
public class ProjectsController : BaseApiController
{
    private readonly LoadForgeDbContext _db;

    public ProjectsController(LoadForgeDbContext db) => _db = db;

    /// <summary>
    /// GET /api/projects - List projects for current organization
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var orgId = GetOrganizationId();

        var query = _db.Projects
            .Where(p => p.OrganizationId == orgId && p.IsActive)
            .OrderByDescending(p => p.UpdatedAt);

        var totalCount = await query.CountAsync();
        var items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(p => new ProjectListDto
            {
                Id = p.Id,
                Name = p.Name,
                Slug = p.Slug,
                Description = p.Description,
                EnvironmentCount = p.Environments.Count,
                ScenarioCount = p.Scenarios.Count,
                CreatedAt = p.CreatedAt,
                UpdatedAt = p.UpdatedAt
            })
            .ToListAsync();

        return ApiResponse(new PaginatedResponse<ProjectListDto>
        {
            Items = items,
            TotalCount = totalCount,
            PageNumber = page,
            PageSize = pageSize
        });
    }

    /// <summary>
    /// GET /api/projects/{id} - Get project detail
    /// </summary>
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var orgId = GetOrganizationId();

        var project = await _db.Projects
            .Include(p => p.Environments)
            .Include(p => p.Collections)
                .ThenInclude(c => c.Endpoints.Where(e => e.IsActive))
            .Include(p => p.Scenarios)
            .Where(p => p.Id == id && p.OrganizationId == orgId && p.IsActive)
            .FirstOrDefaultAsync();

        if (project == null)
            return ApiError("Project not found", 404);

        return ApiResponse(new ProjectDetailDto
        {
            Id = project.Id,
            Name = project.Name,
            Slug = project.Slug,
            Description = project.Description,
            EnvironmentCount = project.Environments.Count,
            ScenarioCount = project.Scenarios.Count,
            CreatedAt = project.CreatedAt,
            UpdatedAt = project.UpdatedAt,
            Environments = project.Environments.Select(e => new EnvironmentSummaryDto
            {
                Id = e.Id,
                Name = e.Name,
                BaseUrl = e.BaseUrl,
                IsDefault = e.IsDefault
            }).ToList(),
            Collections = project.Collections.Select(c => new CollectionSummaryDto
            {
                Id = c.Id,
                Name = c.Name,
                EndpointCount = c.Endpoints.Count
            }).ToList(),
            Scenarios = project.Scenarios.Select(s => new ScenarioSummaryDto
            {
                Id = s.Id,
                Name = s.Name,
                ExecutionType = s.ExecutionType.ToString()
            }).ToList()
        });
    }

    /// <summary>
    /// POST /api/projects - Create a new project
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateProjectRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
            return ApiError("Name is required");

        var orgId = GetOrganizationId();
        var slug = request.Slug ?? request.Name.ToLowerInvariant().Replace(" ", "-");

        // Check slug uniqueness within org
        var exists = await _db.Projects.AnyAsync(p =>
            p.OrganizationId == orgId && p.Slug == slug && p.IsActive);

        if (exists)
            return ApiError("A project with this slug already exists");

        var project = new Project
        {
            Id = Guid.NewGuid(),
            Name = request.Name,
            Slug = slug,
            Description = request.Description,
            OrganizationId = orgId,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        // Create default environment if baseUrl provided
        if (!string.IsNullOrWhiteSpace(request.DefaultBaseUrl))
        {
            project.Environments.Add(new Core.Entities.Environment
            {
                Id = Guid.NewGuid(),
                Name = "Default",
                BaseUrl = request.DefaultBaseUrl,
                IsDefault = true,
                ProjectId = project.Id,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            });
        }

        _db.Projects.Add(project);
        await _db.SaveChangesAsync();

        return ApiResponse(new ProjectListDto
        {
            Id = project.Id,
            Name = project.Name,
            Slug = project.Slug,
            Description = project.Description,
            EnvironmentCount = project.Environments.Count,
            ScenarioCount = 0,
            CreatedAt = project.CreatedAt,
            UpdatedAt = project.UpdatedAt
        }, "Project created successfully");
    }

    /// <summary>
    /// PUT /api/projects/{id} - Update a project
    /// </summary>
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateProjectRequest request)
    {
        var orgId = GetOrganizationId();
        var project = await _db.Projects
            .FirstOrDefaultAsync(p => p.Id == id && p.OrganizationId == orgId && p.IsActive);

        if (project == null)
            return ApiError("Project not found", 404);

        if (!string.IsNullOrWhiteSpace(request.Name))
            project.Name = request.Name;
        if (request.Description != null)
            project.Description = request.Description;

        project.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return ApiResponse(new ProjectListDto
        {
            Id = project.Id,
            Name = project.Name,
            Slug = project.Slug,
            Description = project.Description,
            EnvironmentCount = project.Environments.Count,
            ScenarioCount = project.Scenarios.Count,
            CreatedAt = project.CreatedAt,
            UpdatedAt = project.UpdatedAt
        }, "Project updated");
    }

    /// <summary>
    /// DELETE /api/projects/{id} - Soft delete a project
    /// </summary>
    [HttpDelete("{id:guid}")]
    [Authorize(Policy = "TeamLead")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var orgId = GetOrganizationId();
        var project = await _db.Projects
            .FirstOrDefaultAsync(p => p.Id == id && p.OrganizationId == orgId && p.IsActive);

        if (project == null)
            return ApiError("Project not found", 404);

        project.IsActive = false;
        project.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return ApiResponse<object?>(null, "Project deleted");
    }

    // ==================== ENVIRONMENTS ====================

    [HttpPost("{projectId:guid}/environments")]
    public async Task<IActionResult> AddEnvironment(Guid projectId, [FromBody] CreateEnvironmentRequest request)
    {
        var orgId = GetOrganizationId();
        var project = await _db.Projects.FirstOrDefaultAsync(p => p.Id == projectId && p.OrganizationId == orgId && p.IsActive);
        if (project == null) return ApiError("Project not found", 404);

        var env = new Core.Entities.Environment
        {
            Id = Guid.NewGuid(),
            Name = request.Name,
            BaseUrl = request.BaseUrl,
            IsDefault = request.IsDefault,
            ProjectId = projectId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        if (request.IsDefault)
        {
            var existing = await _db.Environments.Where(e => e.ProjectId == projectId && e.IsDefault).ToListAsync();
            existing.ForEach(e => e.IsDefault = false);
        }

        _db.Environments.Add(env);
        await _db.SaveChangesAsync();
        return ApiResponse(new EnvironmentSummaryDto { Id = env.Id, Name = env.Name, BaseUrl = env.BaseUrl, IsDefault = env.IsDefault }, "Environment added");
    }

    [HttpPut("{projectId:guid}/environments/{envId:guid}")]
    public async Task<IActionResult> UpdateEnvironment(Guid projectId, Guid envId, [FromBody] CreateEnvironmentRequest request)
    {
        var orgId = GetOrganizationId();
        var env = await _db.Environments.Include(e => e.Project)
            .FirstOrDefaultAsync(e => e.Id == envId && e.ProjectId == projectId && e.Project.OrganizationId == orgId);
        if (env == null) return ApiError("Environment not found", 404);

        env.Name = request.Name;
        env.BaseUrl = request.BaseUrl;
        env.IsDefault = request.IsDefault;
        env.UpdatedAt = DateTime.UtcNow;

        if (request.IsDefault)
        {
            var others = await _db.Environments.Where(e => e.ProjectId == projectId && e.Id != envId && e.IsDefault).ToListAsync();
            others.ForEach(e => e.IsDefault = false);
        }

        await _db.SaveChangesAsync();
        return ApiResponse(new EnvironmentSummaryDto { Id = env.Id, Name = env.Name, BaseUrl = env.BaseUrl, IsDefault = env.IsDefault }, "Environment updated");
    }

    [HttpDelete("{projectId:guid}/environments/{envId:guid}")]
    public async Task<IActionResult> DeleteEnvironment(Guid projectId, Guid envId)
    {
        var orgId = GetOrganizationId();
        var env = await _db.Environments.Include(e => e.Project)
            .FirstOrDefaultAsync(e => e.Id == envId && e.ProjectId == projectId && e.Project.OrganizationId == orgId);
        if (env == null) return ApiError("Environment not found", 404);

        _db.Environments.Remove(env);
        await _db.SaveChangesAsync();
        return ApiResponse<object?>(null, "Environment deleted");
    }

    // ==================== COLLECTIONS ====================

    [HttpPost("{projectId:guid}/collections")]
    public async Task<IActionResult> AddCollection(Guid projectId, [FromBody] CreateCollectionRequest request)
    {
        var orgId = GetOrganizationId();
        var project = await _db.Projects.FirstOrDefaultAsync(p => p.Id == projectId && p.OrganizationId == orgId && p.IsActive);
        if (project == null) return ApiError("Project not found", 404);

        var col = new ApiCollection
        {
            Id = Guid.NewGuid(),
            Name = request.Name,
            Description = request.Description,
            ImportedFrom = ImportSource.Manual,
            ProjectId = projectId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _db.ApiCollections.Add(col);
        await _db.SaveChangesAsync();
        return ApiResponse(new CollectionSummaryDto { Id = col.Id, Name = col.Name, EndpointCount = 0 }, "Collection added");
    }

    [HttpDelete("{projectId:guid}/collections/{colId:guid}")]
    public async Task<IActionResult> DeleteCollection(Guid projectId, Guid colId)
    {
        var orgId = GetOrganizationId();
        var col = await _db.ApiCollections.Include(c => c.Project)
            .FirstOrDefaultAsync(c => c.Id == colId && c.ProjectId == projectId && c.Project.OrganizationId == orgId);
        if (col == null) return ApiError("Collection not found", 404);

        _db.ApiCollections.Remove(col);
        await _db.SaveChangesAsync();
        return ApiResponse<object?>(null, "Collection deleted");
    }

    // ==================== SCENARIOS ====================

    [HttpPost("{projectId:guid}/scenarios")]
    public async Task<IActionResult> AddScenario(Guid projectId, [FromBody] CreateScenarioRequest request)
    {
        var orgId = GetOrganizationId();
        var project = await _db.Projects.FirstOrDefaultAsync(p => p.Id == projectId && p.OrganizationId == orgId && p.IsActive);
        if (project == null) return ApiError("Project not found", 404);

        var scenario = new Scenario
        {
            Id = Guid.NewGuid(),
            Name = request.Name,
            Description = request.Description,
            ExecutionType = request.ExecutionType,
            ProjectId = projectId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _db.Scenarios.Add(scenario);
        await _db.SaveChangesAsync();
        return ApiResponse(new ScenarioSummaryDto { Id = scenario.Id, Name = scenario.Name, ExecutionType = request.ExecutionType.ToString() }, "Scenario created");
    }

    [HttpDelete("{projectId:guid}/scenarios/{scenarioId:guid}")]
    public async Task<IActionResult> DeleteScenario(Guid projectId, Guid scenarioId)
    {
        var orgId = GetOrganizationId();
        var scenario = await _db.Scenarios.Include(s => s.Project)
            .FirstOrDefaultAsync(s => s.Id == scenarioId && s.ProjectId == projectId && s.Project.OrganizationId == orgId);
        if (scenario == null) return ApiError("Scenario not found", 404);

        scenario.IsActive = false;
        scenario.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return ApiResponse<object?>(null, "Scenario deleted");
    }
}

// DTOs
public record CreateProjectRequest
{
    public string Name { get; init; } = string.Empty;
    public string? Slug { get; init; }
    public string? Description { get; init; }
    public string? DefaultBaseUrl { get; init; }
}

public record UpdateProjectRequest
{
    public string? Name { get; init; }
    public string? Description { get; init; }
}

public record ProjectListDto
{
    public Guid Id { get; init; }
    public string Name { get; init; } = string.Empty;
    public string Slug { get; init; } = string.Empty;
    public string? Description { get; init; }
    public int EnvironmentCount { get; init; }
    public int ScenarioCount { get; init; }
    public DateTime CreatedAt { get; init; }
    public DateTime UpdatedAt { get; init; }
}

public record ProjectDetailDto : ProjectListDto
{
    public IReadOnlyList<EnvironmentSummaryDto> Environments { get; init; } = new List<EnvironmentSummaryDto>();
    public IReadOnlyList<CollectionSummaryDto> Collections { get; init; } = new List<CollectionSummaryDto>();
    public IReadOnlyList<ScenarioSummaryDto> Scenarios { get; init; } = new List<ScenarioSummaryDto>();
}

public record CollectionSummaryDto
{
    public Guid Id { get; init; }
    public string Name { get; init; } = string.Empty;
    public int EndpointCount { get; init; }
}

public record ScenarioSummaryDto
{
    public Guid Id { get; init; }
    public string Name { get; init; } = string.Empty;
    public string ExecutionType { get; init; } = string.Empty;
}

public record CreateEnvironmentRequest
{
    public string Name { get; init; } = string.Empty;
    public string BaseUrl { get; init; } = string.Empty;
    public bool IsDefault { get; init; }
}

public record CreateCollectionRequest
{
    public string Name { get; init; } = string.Empty;
    public string? Description { get; init; }
}


