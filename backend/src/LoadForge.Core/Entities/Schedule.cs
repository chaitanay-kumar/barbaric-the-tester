namespace LoadForge.Core.Entities;

/// <summary>
/// Scheduled test execution
/// </summary>
public class Schedule
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    
    // Cron expression (e.g., "0 0 * * *" for daily at midnight)
    public string CronExpression { get; set; } = string.Empty;
    public string? Timezone { get; set; } = "UTC";
    
    // Scenario to run
    public Guid ScenarioId { get; set; }
    public Scenario Scenario { get; set; } = null!;
    
    // Environment to use
    public Guid EnvironmentId { get; set; }
    public Environment Environment { get; set; } = null!;
    
    // Status
    public bool IsEnabled { get; set; } = true;
    public DateTime? LastRunAt { get; set; }
    public DateTime? NextRunAt { get; set; }
    
    // Project
    public Guid ProjectId { get; set; }
    public Project Project { get; set; } = null!;
    
    // Timestamps
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// Audit log entry
/// </summary>
public class AuditLog
{
    public Guid Id { get; set; }
    
    // Action details
    public string Action { get; set; } = string.Empty; // CREATE, UPDATE, DELETE, RUN, etc.
    public string EntityType { get; set; } = string.Empty; // Project, Scenario, TestRun, etc.
    public Guid? EntityId { get; set; }
    public string? EntityName { get; set; }
    
    // Change details
    public string? OldValues { get; set; } // JSON
    public string? NewValues { get; set; } // JSON
    
    // Actor
    public Guid? UserId { get; set; }
    public string? UserEmail { get; set; }
    public string? IpAddress { get; set; }
    public string? UserAgent { get; set; }
    
    // Organization
    public Guid OrganizationId { get; set; }
    
    // Timestamp
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// API token for CI/CD integration
/// </summary>
public class ApiToken
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string TokenHash { get; set; } = string.Empty; // Hashed token
    public string TokenPrefix { get; set; } = string.Empty; // First 8 chars for identification
    
    // Scope
    public TokenScope Scope { get; set; } = TokenScope.ReadWrite;
    public Guid? ProjectId { get; set; } // If scoped to project
    
    // Expiration
    public DateTime? ExpiresAt { get; set; }
    public DateTime? LastUsedAt { get; set; }
    
    // Owner
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;
    
    public Guid OrganizationId { get; set; }
    public Organization Organization { get; set; } = null!;
    
    // Status
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public enum TokenScope
{
    ReadOnly = 0,
    ReadWrite = 1,
    Admin = 2
}

