namespace LoadForge.Core.Entities;

/// <summary>
/// Environment configuration (dev, staging, prod)
/// </summary>
public class Environment
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty; // dev, staging, prod
    public string BaseUrl { get; set; } = string.Empty;
    public string? Description { get; set; }
    
    // Project
    public Guid ProjectId { get; set; }
    public Project Project { get; set; } = null!;
    
    // Status
    public bool IsDefault { get; set; } = false;
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    
    // Navigation
    public ICollection<EnvironmentVariable> Variables { get; set; } = new List<EnvironmentVariable>();
    public ICollection<EnvironmentSecret> Secrets { get; set; } = new List<EnvironmentSecret>();
    public ICollection<EnvironmentHeader> Headers { get; set; } = new List<EnvironmentHeader>();
}

/// <summary>
/// Environment variable (non-sensitive)
/// </summary>
public class EnvironmentVariable
{
    public Guid Id { get; set; }
    public string Key { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty;
    
    public Guid EnvironmentId { get; set; }
    public Environment Environment { get; set; } = null!;
}

/// <summary>
/// Environment secret (encrypted at rest)
/// </summary>
public class EnvironmentSecret
{
    public Guid Id { get; set; }
    public string Key { get; set; } = string.Empty;
    public string EncryptedValue { get; set; } = string.Empty; // AES-256 encrypted
    
    public Guid EnvironmentId { get; set; }
    public Environment Environment { get; set; } = null!;
}

/// <summary>
/// Default headers for environment
/// </summary>
public class EnvironmentHeader
{
    public Guid Id { get; set; }
    public string Key { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty;
    
    public Guid EnvironmentId { get; set; }
    public Environment Environment { get; set; } = null!;
}

