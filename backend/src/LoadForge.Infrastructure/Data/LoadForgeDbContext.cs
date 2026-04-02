using LoadForge.Core.Entities;
using Microsoft.EntityFrameworkCore;

namespace LoadForge.Infrastructure.Data;

public class LoadForgeDbContext : DbContext
{
    public LoadForgeDbContext(DbContextOptions<LoadForgeDbContext> options) : base(options)
    {
    }

    // Core entities
    public DbSet<Organization> Organizations => Set<Organization>();
    public DbSet<User> Users => Set<User>();
    public DbSet<Project> Projects => Set<Project>();
    
    // Environment
    public DbSet<Core.Entities.Environment> Environments => Set<Core.Entities.Environment>();
    public DbSet<EnvironmentVariable> EnvironmentVariables => Set<EnvironmentVariable>();
    public DbSet<EnvironmentSecret> EnvironmentSecrets => Set<EnvironmentSecret>();
    public DbSet<EnvironmentHeader> EnvironmentHeaders => Set<EnvironmentHeader>();
    
    // API Collections
    public DbSet<ApiCollection> ApiCollections => Set<ApiCollection>();
    public DbSet<ApiEndpoint> ApiEndpoints => Set<ApiEndpoint>();
    public DbSet<ApiEndpointHeader> ApiEndpointHeaders => Set<ApiEndpointHeader>();
    public DbSet<ApiEndpointAssertion> ApiEndpointAssertions => Set<ApiEndpointAssertion>();
    public DbSet<ApiEndpointExtraction> ApiEndpointExtractions => Set<ApiEndpointExtraction>();
    
    // Scenarios
    public DbSet<Scenario> Scenarios => Set<Scenario>();
    public DbSet<ScenarioStage> ScenarioStages => Set<ScenarioStage>();
    public DbSet<ScenarioRequest> ScenarioRequests => Set<ScenarioRequest>();
    public DbSet<ScenarioThreshold> ScenarioThresholds => Set<ScenarioThreshold>();
    
    // Test Runs
    public DbSet<TestRun> TestRuns => Set<TestRun>();
    public DbSet<RunMetrics> RunMetrics => Set<RunMetrics>();
    public DbSet<RunThresholdResult> RunThresholdResults => Set<RunThresholdResult>();
    
    // Runners
    public DbSet<Runner> Runners => Set<Runner>();
    public DbSet<RunnerAssignment> RunnerAssignments => Set<RunnerAssignment>();
    
    // Scheduling & Audit
    public DbSet<Schedule> Schedules => Set<Schedule>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<ApiToken> ApiTokens => Set<ApiToken>();
    
    // Generated Test Cases & Executions (Coverage-Focused Testing)
    public DbSet<GeneratedTestCase> GeneratedTestCases => Set<GeneratedTestCase>();
    public DbSet<GeneratedTestRun> GeneratedTestRuns => Set<GeneratedTestRun>();
    public DbSet<GeneratedTestExecution> GeneratedTestExecutions => Set<GeneratedTestExecution>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Apply all configurations
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(LoadForgeDbContext).Assembly);

        // Organization
        modelBuilder.Entity<Organization>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.Slug).IsUnique();
            entity.Property(e => e.Name).HasMaxLength(200).IsRequired();
            entity.Property(e => e.Slug).HasMaxLength(100).IsRequired();
        });

        // User
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.Email).IsUnique();
            entity.Property(e => e.Email).HasMaxLength(255).IsRequired();
            entity.Property(e => e.PasswordHash).HasMaxLength(500).IsRequired();
            
            entity.HasOne(e => e.Organization)
                .WithMany(o => o.Users)
                .HasForeignKey(e => e.OrganizationId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Project
        modelBuilder.Entity<Project>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => new { e.OrganizationId, e.Slug }).IsUnique();
            entity.Property(e => e.Name).HasMaxLength(200).IsRequired();
            entity.Property(e => e.Slug).HasMaxLength(100).IsRequired();
            
            entity.HasOne(e => e.Organization)
                .WithMany(o => o.Projects)
                .HasForeignKey(e => e.OrganizationId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Environment
        modelBuilder.Entity<Core.Entities.Environment>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => new { e.ProjectId, e.Name }).IsUnique();
            entity.Property(e => e.Name).HasMaxLength(100).IsRequired();
            entity.Property(e => e.BaseUrl).HasMaxLength(500).IsRequired();
            
            entity.HasOne(e => e.Project)
                .WithMany(p => p.Environments)
                .HasForeignKey(e => e.ProjectId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // API Collection
        modelBuilder.Entity<ApiCollection>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).HasMaxLength(200).IsRequired();
            
            entity.HasOne(e => e.Project)
                .WithMany(p => p.Collections)
                .HasForeignKey(e => e.ProjectId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // API Endpoint
        modelBuilder.Entity<ApiEndpoint>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).HasMaxLength(200).IsRequired();
            entity.Property(e => e.Url).HasMaxLength(2000).IsRequired();
            
            entity.HasOne(e => e.Collection)
                .WithMany(c => c.Endpoints)
                .HasForeignKey(e => e.CollectionId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Scenario
        modelBuilder.Entity<Scenario>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).HasMaxLength(200).IsRequired();
            
            entity.HasOne(e => e.Project)
                .WithMany(p => p.Scenarios)
                .HasForeignKey(e => e.ProjectId)
                .OnDelete(DeleteBehavior.Cascade);
                
            entity.HasOne(e => e.DefaultEnvironment)
                .WithMany()
                .HasForeignKey(e => e.DefaultEnvironmentId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        // Scenario Stage
        modelBuilder.Entity<ScenarioStage>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasOne(e => e.Scenario)
                .WithMany(s => s.Stages)
                .HasForeignKey(e => e.ScenarioId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Scenario Request
        modelBuilder.Entity<ScenarioRequest>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasOne(e => e.Scenario)
                .WithMany(s => s.Requests)
                .HasForeignKey(e => e.ScenarioId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.Endpoint)
                .WithMany()
                .HasForeignKey(e => e.EndpointId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Test Run
        modelBuilder.Entity<TestRun>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.RunNumber).IsUnique();
            entity.Property(e => e.RunNumber).HasMaxLength(50).IsRequired();
            
            entity.HasOne(e => e.Scenario)
                .WithMany(s => s.TestRuns)
                .HasForeignKey(e => e.ScenarioId)
                .OnDelete(DeleteBehavior.Cascade);
                
            entity.HasOne(e => e.Project)
                .WithMany(p => p.TestRuns)
                .HasForeignKey(e => e.ProjectId)
                .OnDelete(DeleteBehavior.Cascade);
                
            entity.HasOne(e => e.TriggeredBy)
                .WithMany(u => u.TestRuns)
                .HasForeignKey(e => e.TriggeredById)
                .OnDelete(DeleteBehavior.SetNull);
                
            entity.HasOne(e => e.ComparedToBaseline)
                .WithMany()
                .HasForeignKey(e => e.ComparedToBaselineId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        // Run Metrics - optimized for time-series queries
        modelBuilder.Entity<RunMetrics>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => new { e.TestRunId, e.Timestamp });
            
            entity.HasOne(e => e.TestRun)
                .WithMany(r => r.Metrics)
                .HasForeignKey(e => e.TestRunId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Runner
        modelBuilder.Entity<Runner>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.RegistrationToken).IsUnique();
            entity.Property(e => e.Name).HasMaxLength(200).IsRequired();
            
            entity.HasOne(e => e.Organization)
                .WithMany(o => o.Runners)
                .HasForeignKey(e => e.OrganizationId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Schedule
        modelBuilder.Entity<Schedule>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).HasMaxLength(200).IsRequired();
            entity.Property(e => e.CronExpression).HasMaxLength(100).IsRequired();
        });

        // Audit Log - append-only, no FK constraints for performance
        modelBuilder.Entity<AuditLog>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.CreatedAt);
            entity.HasIndex(e => new { e.OrganizationId, e.CreatedAt });
            entity.HasIndex(e => new { e.EntityType, e.EntityId });
        });

        // API Token
        modelBuilder.Entity<ApiToken>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.TokenHash).IsUnique();
            entity.Property(e => e.TokenHash).HasMaxLength(500).IsRequired();
        });

        // Generated Test Cases
        modelBuilder.Entity<GeneratedTestCase>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.CollectionId);
            entity.HasIndex(e => new { e.CollectionId, e.CoverageCategory });
            entity.HasIndex(e => e.AutoGenerated);
            entity.HasIndex(e => e.NeedsReview);
            
            entity.Property(e => e.Name).HasMaxLength(500).IsRequired();
            entity.Property(e => e.Method).HasMaxLength(20).IsRequired();
            entity.Property(e => e.Path).HasMaxLength(2000).IsRequired();
            entity.Property(e => e.Severity).HasMaxLength(10).IsRequired();
            entity.Property(e => e.CoverageCategory).HasMaxLength(50).IsRequired();
            
            entity.HasOne(e => e.Collection)
                .WithMany()
                .HasForeignKey(e => e.CollectionId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Generated Test Runs
        modelBuilder.Entity<GeneratedTestRun>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.CollectionId);
            entity.HasIndex(e => e.ExecutedById);
            entity.HasIndex(e => e.Status);
            entity.HasIndex(e => e.CreatedAt);
            
            entity.Property(e => e.Status).HasMaxLength(50).IsRequired();
            entity.Property(e => e.PassRate).HasPrecision(5, 2);
            
            entity.HasOne(e => e.Collection)
                .WithMany()
                .HasForeignKey(e => e.CollectionId)
                .OnDelete(DeleteBehavior.Cascade);
                
            entity.HasOne(e => e.ExecutedBy)
                .WithMany()
                .HasForeignKey(e => e.ExecutedById)
                .OnDelete(DeleteBehavior.SetNull);
                
            entity.HasOne(e => e.Environment)
                .WithMany()
                .HasForeignKey(e => e.EnvironmentId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // Generated Test Executions
        modelBuilder.Entity<GeneratedTestExecution>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.TestCaseId);
            entity.HasIndex(e => e.TestRunId);
            entity.HasIndex(e => e.Status);
            entity.HasIndex(e => new { e.TestRunId, e.Status });
            
            entity.Property(e => e.Status).HasMaxLength(50).IsRequired();
            entity.Property(e => e.CorrelationId).HasMaxLength(100);
            
            entity.HasOne(e => e.TestCase)
                .WithMany()
                .HasForeignKey(e => e.TestCaseId)
                .OnDelete(DeleteBehavior.Cascade);
                
            entity.HasOne(e => e.TestRun)
                .WithMany(r => r.Executions)
                .HasForeignKey(e => e.TestRunId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }
}

