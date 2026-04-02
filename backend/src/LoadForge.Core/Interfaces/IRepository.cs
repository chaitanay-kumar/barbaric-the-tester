using LoadForge.Core.Entities;

namespace LoadForge.Core.Interfaces;

/// <summary>
/// Generic repository interface
/// </summary>
public interface IRepository<T> where T : class
{
    Task<T?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<T>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<T> AddAsync(T entity, CancellationToken cancellationToken = default);
    Task UpdateAsync(T entity, CancellationToken cancellationToken = default);
    Task DeleteAsync(T entity, CancellationToken cancellationToken = default);
    IQueryable<T> Query();
}

/// <summary>
/// Unit of work for transaction management
/// </summary>
public interface IUnitOfWork : IDisposable
{
    IRepository<Organization> Organizations { get; }
    IRepository<User> Users { get; }
    IRepository<Project> Projects { get; }
    IRepository<Entities.Environment> Environments { get; }
    IRepository<ApiCollection> Collections { get; }
    IRepository<ApiEndpoint> Endpoints { get; }
    IRepository<Scenario> Scenarios { get; }
    IRepository<TestRun> TestRuns { get; }
    IRepository<RunMetrics> Metrics { get; }
    IRepository<Runner> Runners { get; }
    IRepository<Schedule> Schedules { get; }
    IRepository<AuditLog> AuditLogs { get; }
    IRepository<ApiToken> ApiTokens { get; }
    
    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
    Task BeginTransactionAsync(CancellationToken cancellationToken = default);
    Task CommitTransactionAsync(CancellationToken cancellationToken = default);
    Task RollbackTransactionAsync(CancellationToken cancellationToken = default);
}

