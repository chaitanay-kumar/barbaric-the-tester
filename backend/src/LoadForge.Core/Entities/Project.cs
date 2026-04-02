namespace LoadForge.Core.Entities;

/// <summary>
/// Project containing API collections and scenarios
/// </summary>
public class Project
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string? Description { get; set; }
    
    // Organization
    public Guid OrganizationId { get; set; }
    public Organization Organization { get; set; } = null!;
    
    // Status
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    
    // Navigation
    public ICollection<Environment> Environments { get; set; } = new List<Environment>();
    public ICollection<ApiCollection> Collections { get; set; } = new List<ApiCollection>();
    public ICollection<Scenario> Scenarios { get; set; } = new List<Scenario>();
    public ICollection<TestRun> TestRuns { get; set; } = new List<TestRun>();
}

