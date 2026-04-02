namespace LoadForge.Core.Entities;

/// <summary>
/// User account in the system
/// </summary>
public class User
{
    public Guid Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    
    // Role: Admin, TeamLead, Developer, Viewer
    public UserRole Role { get; set; } = UserRole.Developer;
    
    // Status
    public bool IsActive { get; set; } = true;
    public DateTime? LastLoginAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    
    // Organization
    public Guid OrganizationId { get; set; }
    public Organization Organization { get; set; } = null!;
    
    // Navigation
    public ICollection<TestRun> TestRuns { get; set; } = new List<TestRun>();
    
    public string FullName => $"{FirstName} {LastName}";
}

public enum UserRole
{
    Viewer = 0,
    Developer = 1,
    TeamLead = 2,
    Admin = 3
}

