using Microsoft.AspNetCore.Mvc;

namespace SampleApi.Controllers;

/// <summary>
/// Users API - for load testing user CRUD operations
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class UsersController : ControllerBase
{
    private readonly SampleDataStore _store;

    public UsersController(SampleDataStore store) => _store = store;

    /// <summary>
    /// GET /api/users - List all users
    /// </summary>
    [HttpGet]
    public IActionResult GetAll([FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var users = _store.Users;
        var paged = users.Skip((page - 1) * pageSize).Take(pageSize).ToList();
        return Ok(new { items = paged, total = users.Count, page, pageSize });
    }

    /// <summary>
    /// GET /api/users/{id} - Get user by ID
    /// </summary>
    [HttpGet("{id}")]
    public IActionResult GetById(int id)
    {
        var user = _store.GetUser(id);
        if (user == null) return NotFound(new { error = "User not found" });
        return Ok(user);
    }

    /// <summary>
    /// POST /api/users - Create a new user
    /// </summary>
    [HttpPost]
    public IActionResult Create([FromBody] CreateUserRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name) || string.IsNullOrWhiteSpace(request.Email))
            return BadRequest(new { error = "Name and Email are required" });

        var user = _store.AddUser(request.Name, request.Email);
        return CreatedAtAction(nameof(GetById), new { id = user.Id }, user);
    }

    /// <summary>
    /// GET /api/users/search?q=term - Search users
    /// </summary>
    [HttpGet("search")]
    public IActionResult Search([FromQuery] string q)
    {
        if (string.IsNullOrWhiteSpace(q)) return Ok(Array.Empty<UserRecord>());
        var results = _store.Users
            .Where(u => u.Name.Contains(q, StringComparison.OrdinalIgnoreCase)
                     || u.Email.Contains(q, StringComparison.OrdinalIgnoreCase))
            .ToList();
        return Ok(results);
    }
}

public class CreateUserRequest
{
    public string Name { get; set; } = "";
    public string Email { get; set; } = "";
}

