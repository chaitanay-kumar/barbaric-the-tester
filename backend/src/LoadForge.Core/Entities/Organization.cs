namespace LoadForge.Core.Entities;

/// <summary>
/// Represents a tenant organization in the system
/// </summary>
public class Organization
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string? Description { get; set; }
    
    // Limits
    public int MaxProjects { get; set; } = 10;
    public int MaxVirtualUsers { get; set; } = 10000;
    public int MaxConcurrentRuns { get; set; } = 5;
    public int MaxRunners { get; set; } = 10;
    
    // Status
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    
    // Navigation
    public ICollection<Project> Projects { get; set; } = new List<Project>();
    public ICollection<User> Users { get; set; } = new List<User>();
    public ICollection<Runner> Runners { get; set; } = new List<Runner>();
}

