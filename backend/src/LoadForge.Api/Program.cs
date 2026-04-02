using LoadForge.Infrastructure.Data;
using LoadForge.TestGeneration.Slm;
using Microsoft.EntityFrameworkCore;
using Microsoft.OpenApi.Models;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddHttpClient("RequestRunner", client => {
    client.Timeout = TimeSpan.FromSeconds(30);
});
builder.Services.AddHttpClient("TestRunner", client => {
    client.Timeout = TimeSpan.FromSeconds(10); // 10 second timeout per request
});
builder.Services.AddHttpClient("SlmClient", client => {
    client.Timeout = TimeSpan.FromSeconds(60);
});

// SLM Configuration (disabled by default — enable via environment variables)
builder.Services.AddSingleton(new SlmConfig
{
    Enabled = builder.Configuration.GetValue<bool>("Slm:Enabled", false),
    Endpoint = builder.Configuration.GetValue<string>("Slm:Endpoint") ?? "http://localhost:11434/v1/chat/completions",
    ModelName = builder.Configuration.GetValue<string>("Slm:ModelName") ?? "llama3.1:8b-instruct-q4_K_M",
    ApiKey = builder.Configuration.GetValue<string>("Slm:ApiKey")
});

// Swagger Configuration - only register in Development or Test
if (builder.Environment.IsDevelopment() || builder.Environment.EnvironmentName == "Test")
{
    builder.Services.AddSwaggerGen(options =>
    {
        options.SwaggerDoc("v1", new OpenApiInfo
        {
            Title = "LoadForge API",
            Version = "v1",
            Description = "Enterprise Performance Testing Platform API"
        });

        options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
        {
            Description = "JWT Authorization header using the Bearer scheme. Example: 'Bearer {token}'",
            Name = "Authorization",
            In = ParameterLocation.Header,
            Type = SecuritySchemeType.ApiKey,
            Scheme = "Bearer"
        });

        options.AddSecurityRequirement(new OpenApiSecurityRequirement
        {
            {
                new OpenApiSecurityScheme
                {
                    Reference = new OpenApiReference
                    {
                        Type = ReferenceType.SecurityScheme,
                        Id = "Bearer"
                    }
                },
                Array.Empty<string>()
            }
        });
    });
}

// Database Configuration
var useInMemory = builder.Configuration.GetValue<bool>("UseInMemoryDatabase");
if (useInMemory)
{
    builder.Services.AddDbContext<LoadForgeDbContext>(options =>
    {
        options.UseInMemoryDatabase("LoadForgeDb");
    });
}
else
{
    builder.Services.AddDbContext<LoadForgeDbContext>(options =>
    {
        options.UseNpgsql(
            builder.Configuration.GetConnectionString("DefaultConnection"),
            npgsqlOptions =>
            {
                npgsqlOptions.EnableRetryOnFailure(3);
                npgsqlOptions.CommandTimeout(30);
            });
    });
}

// JWT Authentication
var jwtSettings = builder.Configuration.GetSection("Jwt");
var key = Encoding.UTF8.GetBytes(jwtSettings["Secret"] ?? "loadforge-secret-key-min-32-characters-long!");

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtSettings["Issuer"] ?? "LoadForge",
        ValidAudience = jwtSettings["Audience"] ?? "LoadForge",
        IssuerSigningKey = new SymmetricSecurityKey(key)
    };
});

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("Admin", policy => policy.RequireRole("Admin"));
    options.AddPolicy("TeamLead", policy => policy.RequireRole("Admin", "TeamLead"));
    options.AddPolicy("Developer", policy => policy.RequireRole("Admin", "TeamLead", "Developer"));
    options.AddPolicy("Viewer", policy => policy.RequireRole("Admin", "TeamLead", "Developer", "Viewer"));
});

// CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        var origins = builder.Configuration["AllowedOrigins"]?.Split(',') 
            ?? new[] { "http://localhost:4200" };
        policy.WithOrigins(origins)
            .AllowAnyMethod()
            .AllowAnyHeader()
            .AllowCredentials();
    });
});

// Health Checks
builder.Services.AddHealthChecks()
    .AddDbContextCheck<LoadForgeDbContext>("database");

// SignalR for real-time metrics
builder.Services.AddSignalR();

var app = builder.Build();

// Configure the HTTP request pipeline

// Swagger - only in Development or Test environments
if (app.Environment.IsDevelopment() || app.Environment.EnvironmentName == "Test")
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "LoadForge API v1");
        c.RoutePrefix = "swagger";
    });
}

app.UseCors("AllowFrontend");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapHealthChecks("/health");

// Database initialization on startup (Development only)
if (app.Environment.IsDevelopment())
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<LoadForgeDbContext>();
    var config = scope.ServiceProvider.GetRequiredService<IConfiguration>();
    
    if (config.GetValue<bool>("UseInMemoryDatabase"))
    {
        await db.Database.EnsureCreatedAsync();
    }
    else
    {
        await db.Database.MigrateAsync();
    }
    
    // Seed default data if no projects exist
    if (!await db.Projects.AnyAsync())
    {
        var org = new LoadForge.Core.Entities.Organization
        {
            Id = Guid.NewGuid(),
            Name = "Default Organization",
            Slug = "default-org",
            CreatedAt = DateTime.UtcNow
        };
        
        var user = new LoadForge.Core.Entities.User
        {
            Id = Guid.NewGuid(),
            OrganizationId = org.Id,
            Email = "test@loadforge.dev",
            // Password: "Test123!" - BCrypt hash
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Test123!"),
            FirstName = "Test",
            LastName = "User",
            Role = LoadForge.Core.Entities.UserRole.Admin,
            CreatedAt = DateTime.UtcNow
        };
        
        var project = new LoadForge.Core.Entities.Project
        {
            Id = Guid.NewGuid(),
            OrganizationId = org.Id,
            Name = "JSONPlaceholder API Tests",
            Slug = "jsonplaceholder-tests",
            Description = "Default seeded project for API testing",
            CreatedAt = DateTime.UtcNow
        };
        
        var environment = new LoadForge.Core.Entities.Environment
        {
            Id = Guid.NewGuid(),
            ProjectId = project.Id,
            Name = "default",
            BaseUrl = "https://jsonplaceholder.typicode.com",
            IsDefault = true,
            CreatedAt = DateTime.UtcNow
        };
        
        var collection = new LoadForge.Core.Entities.ApiCollection
        {
            Id = Guid.NewGuid(),
            ProjectId = project.Id,
            Name = "JSONPlaceholder API",
            Description = "REST API for testing - posts, users, comments",
            ImportedFrom = LoadForge.Core.Entities.ImportSource.OpenApi,
            CreatedAt = DateTime.UtcNow
        };
        
        db.Organizations.Add(org);
        db.Users.Add(user);
        db.Projects.Add(project);
        db.Environments.Add(environment);
        db.ApiCollections.Add(collection);
        await db.SaveChangesAsync();
        
        // Read OpenAPI spec and generate tests
        var seedFilePath = Path.Combine(app.Environment.ContentRootPath, "SeedData", "default-openapi.json");
        if (File.Exists(seedFilePath))
        {
            try
            {
                var openApiSpec = await File.ReadAllTextAsync(seedFilePath);
                var parser = new LoadForge.TestGeneration.Parsing.OpenApiParser();
                var spec = parser.Parse(openApiSpec);
                
                var generationConfig = new LoadForge.TestGeneration.Models.TestGenerationConfig
                {
                    Seed = 42,
                    GenerateSmokeTests = true,
                    GenerateValidationTests = true,
                    GenerateBoundaryTests = true,
                    GenerateNegativeTests = true,
                    GenerateContractTests = true,
                    GenerateCrudTests = true,
                    TestDataPrefix = "seed_test_"
                };
                
                var assembler = new LoadForge.TestGeneration.Generation.TestAssembler(generationConfig);
                var testCases = assembler.GenerateTestSuite(spec);
                
                // Save generated test cases
                foreach (var tc in testCases)
                {
                    db.GeneratedTestCases.Add(new LoadForge.Core.Entities.GeneratedTestCase
                    {
                        Id = Guid.NewGuid(),
                        CollectionId = collection.Id,
                        Name = tc.Name,
                        Severity = tc.Severity,
                        Method = tc.Method,
                        Path = tc.Path,
                        PayloadJson = tc.Payload != null ? System.Text.Json.JsonSerializer.Serialize(tc.Payload) : null,
                        ExpectedStatusCodes = tc.ExpectedStatusCodes,
                        AssertionsJson = System.Text.Json.JsonSerializer.Serialize(tc.Assertions),
                        SetupJson = tc.Setup.Count > 0 ? System.Text.Json.JsonSerializer.Serialize(tc.Setup) : null,
                        TeardownJson = tc.Teardown.Count > 0 ? System.Text.Json.JsonSerializer.Serialize(tc.Teardown) : null,
                        DependenciesJson = tc.Dependencies.Count > 0 ? System.Text.Json.JsonSerializer.Serialize(tc.Dependencies) : null,
                        CoverageCategory = tc.CoverageCategory,
                        AutoGenerated = true,
                        NeedsReview = false,
                        IsActive = true,
                        CreatedAt = DateTime.UtcNow
                    });
                }
                await db.SaveChangesAsync();
                
                Console.WriteLine($"✅ Generated {testCases.Count} test cases from OpenAPI spec");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"⚠️ Failed to generate tests from OpenAPI spec: {ex.Message}");
            }
        }
        
        Console.WriteLine("✅ Seeded default project: JSONPlaceholder API Tests");
        Console.WriteLine($"   Project ID: {project.Id}");
        Console.WriteLine($"   Collection ID: {collection.Id}");
        Console.WriteLine($"   Environment ID: {environment.Id}");
        Console.WriteLine($"   Base URL: https://jsonplaceholder.typicode.com");
    }
}

app.Run();

// For integration tests
public partial class Program { }

