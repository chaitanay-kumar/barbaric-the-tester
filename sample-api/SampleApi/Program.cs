var builder = WebApplication.CreateBuilder(args);

// Add services to the container
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new Microsoft.OpenApi.Models.OpenApiInfo
    {
        Title = "LoadForge Sample API",
        Version = "v1",
        Description = "Sample API for performance testing with LoadForge"
    });
});

// In-memory store
builder.Services.AddSingleton<SampleDataStore>();
builder.Services.AddHealthChecks();

var app = builder.Build();

// Swagger in all environments for testing
app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "LoadForge Sample API v1");
});

app.UseAuthorization();
app.MapControllers();
app.MapHealthChecks("/health");

app.Run();

/// <summary>
/// In-memory data store for sample API
/// </summary>
public class SampleDataStore
{
    private readonly List<UserRecord> _users = new();
    private readonly List<OrderRecord> _orders = new();
    private readonly List<ProductRecord> _products = new();
    private int _nextUserId = 1;
    private int _nextOrderId = 1;
    private int _nextProductId = 1;
    private readonly object _lock = new();

    public SampleDataStore()
    {
        // Seed data
        for (int i = 0; i < 100; i++)
        {
            _products.Add(new ProductRecord
            {
                Id = _nextProductId++,
                Name = $"Product {i + 1}",
                Price = Math.Round(10 + Random.Shared.NextDouble() * 990, 2),
                Stock = Random.Shared.Next(0, 500),
                Category = new[] { "Electronics", "Books", "Clothing", "Food", "Sports" }[i % 5]
            });
        }
    }

    public List<UserRecord> Users { get { lock (_lock) return _users.ToList(); } }
    public List<OrderRecord> Orders { get { lock (_lock) return _orders.ToList(); } }
    public List<ProductRecord> Products { get { lock (_lock) return _products.ToList(); } }

    public UserRecord AddUser(string name, string email)
    {
        lock (_lock)
        {
            var user = new UserRecord { Id = _nextUserId++, Name = name, Email = email, CreatedAt = DateTime.UtcNow };
            _users.Add(user);
            return user;
        }
    }

    public OrderRecord AddOrder(int userId, List<int> productIds, double total)
    {
        lock (_lock)
        {
            var order = new OrderRecord
            {
                Id = _nextOrderId++, UserId = userId, ProductIds = productIds,
                Total = total, Status = "Pending", CreatedAt = DateTime.UtcNow
            };
            _orders.Add(order);
            return order;
        }
    }

    public UserRecord? GetUser(int id) { lock (_lock) return _users.FirstOrDefault(u => u.Id == id); }
    public OrderRecord? GetOrder(int id) { lock (_lock) return _orders.FirstOrDefault(o => o.Id == id); }
    public ProductRecord? GetProduct(int id) { lock (_lock) return _products.FirstOrDefault(p => p.Id == id); }
}

public class UserRecord { public int Id { get; set; } public string Name { get; set; } = ""; public string Email { get; set; } = ""; public DateTime CreatedAt { get; set; } }
public class OrderRecord { public int Id { get; set; } public int UserId { get; set; } public List<int> ProductIds { get; set; } = new(); public double Total { get; set; } public string Status { get; set; } = ""; public DateTime CreatedAt { get; set; } }
public class ProductRecord { public int Id { get; set; } public string Name { get; set; } = ""; public double Price { get; set; } public int Stock { get; set; } public string Category { get; set; } = ""; }
