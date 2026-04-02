using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace LoadForge.Api.Controllers;

/// <summary>
/// Base controller with common functionality
/// </summary>
[ApiController]
[Route("api/[controller]")]
public abstract class BaseApiController : ControllerBase
{
    /// <summary>
    /// Get current user ID from JWT claims
    /// </summary>
    protected Guid GetUserId()
    {
        var userIdClaim = User.FindFirst("userId")?.Value 
                       ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        
        if (Guid.TryParse(userIdClaim, out var userId))
            return userId;
        
        return Guid.Empty;
    }

    /// <summary>
    /// Get current organization ID from JWT claims
    /// </summary>
    protected Guid GetOrganizationId()
    {
        var orgIdClaim = User.FindFirst("organizationId")?.Value;
        
        if (Guid.TryParse(orgIdClaim, out var orgId))
            return orgId;
        
        return Guid.Empty;
    }

    /// <summary>
    /// Get current user's role
    /// </summary>
    protected string GetUserRole()
    {
        return User.FindFirst("role")?.Value 
            ?? User.FindFirst(ClaimTypes.Role)?.Value 
            ?? "Viewer";
    }

    /// <summary>
    /// Standard API success response
    /// </summary>
    protected IActionResult ApiResponse<T>(T data, string? message = null)
    {
        return Ok(new ApiResponseDto<T>
        {
            Success = true,
            Data = data,
            Message = message
        });
    }

    /// <summary>
    /// Standard API error response
    /// </summary>
    protected IActionResult ApiError(string message, int statusCode = 400)
    {
        return StatusCode(statusCode, new ApiResponseDto<object>
        {
            Success = false,
            Message = message
        });
    }
}

/// <summary>
/// Standard API response wrapper
/// </summary>
public class ApiResponseDto<T>
{
    public bool Success { get; set; }
    public T? Data { get; set; }
    public string? Message { get; set; }
    public Dictionary<string, string[]>? Errors { get; set; }
}

/// <summary>
/// Paginated response wrapper
/// </summary>
public class PaginatedResponse<T>
{
    public IReadOnlyList<T> Items { get; set; } = new List<T>();
    public int TotalCount { get; set; }
    public int PageNumber { get; set; }
    public int PageSize { get; set; }
    public int TotalPages => (int)Math.Ceiling(TotalCount / (double)PageSize);
    public bool HasNext => PageNumber < TotalPages;
    public bool HasPrevious => PageNumber > 1;
}

/// <summary>
/// Environment summary DTO
/// </summary>
public record EnvironmentSummaryDto
{
    public Guid Id { get; init; }
    public string Name { get; init; } = string.Empty;
    public string BaseUrl { get; init; } = string.Empty;
    public bool IsDefault { get; init; }
}

