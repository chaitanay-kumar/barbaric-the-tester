using LoadForge.Core.Entities;
using LoadForge.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text;
using System.Text.Json;
using HttpMethod = LoadForge.Core.Entities.HttpMethod;

namespace LoadForge.Api.Controllers;

/// <summary>
/// Collection & Endpoint management
/// </summary>
[Authorize]
[Route("api/projects/{projectId:guid}/collections")]
public class CollectionsController : BaseApiController
{
    private readonly LoadForgeDbContext _db;
    private readonly IHttpClientFactory _httpClientFactory;
    public CollectionsController(LoadForgeDbContext db, IHttpClientFactory httpClientFactory)
    {
        _db = db;
        _httpClientFactory = httpClientFactory;
    }

    /// <summary>
    /// GET /api/projects/{projectId}/collections/{colId} - Get collection with endpoints
    /// </summary>
    [HttpGet("{colId:guid}")]
    public async Task<IActionResult> GetCollection(Guid projectId, Guid colId)
    {
        var col = await _db.ApiCollections
            .Include(c => c.Endpoints.Where(e => e.IsActive))
                .ThenInclude(e => e.Headers)
            .FirstOrDefaultAsync(c => c.Id == colId && c.ProjectId == projectId && c.IsActive);

        if (col == null) return ApiError("Collection not found", 404);

        return ApiResponse(new CollectionDetailDto
        {
            Id = col.Id,
            Name = col.Name,
            Description = col.Description,
            EndpointCount = col.Endpoints.Count,
            Endpoints = col.Endpoints.OrderBy(e => e.SortOrder).Select(e => new EndpointDto
            {
                Id = e.Id,
                Name = e.Name,
                Description = e.Description,
                Method = e.Method.ToString(),
                Url = e.Url,
                RequestBody = e.RequestBody,
                ContentType = e.ContentType.ToString(),
                TimeoutMs = e.TimeoutMs,
                Headers = e.Headers.Where(h => h.IsEnabled).Select(h => new HeaderDto { Key = h.Key, Value = h.Value }).ToList()
            }).ToList()
        });
    }

    /// <summary>
    /// POST /api/projects/{projectId}/collections/{colId}/endpoints - Add endpoint
    /// </summary>
    [HttpPost("{colId:guid}/endpoints")]
    public async Task<IActionResult> AddEndpoint(Guid projectId, Guid colId, [FromBody] CreateEndpointRequest req)
    {
        var col = await _db.ApiCollections.FirstOrDefaultAsync(c => c.Id == colId && c.ProjectId == projectId && c.IsActive);
        if (col == null) return ApiError("Collection not found", 404);

        if (string.IsNullOrWhiteSpace(req.Name)) return ApiError("Name is required");
        if (string.IsNullOrWhiteSpace(req.Url)) return ApiError("URL is required");

        var method = req.Method?.ToUpper() switch
        {
            "POST" => HttpMethod.POST,
            "PUT" => HttpMethod.PUT,
            "PATCH" => HttpMethod.PATCH,
            "DELETE" => HttpMethod.DELETE,
            "HEAD" => HttpMethod.HEAD,
            "OPTIONS" => HttpMethod.OPTIONS,
            _ => HttpMethod.GET
        };

        var maxSort = await _db.ApiEndpoints.Where(e => e.CollectionId == colId).MaxAsync(e => (int?)e.SortOrder) ?? 0;

        var endpoint = new ApiEndpoint
        {
            Id = Guid.NewGuid(),
            Name = req.Name,
            Description = req.Description,
            Method = method,
            Url = req.Url,
            RequestBody = req.RequestBody,
            ContentType = ContentType.Json,
            TimeoutMs = req.TimeoutMs > 0 ? req.TimeoutMs : 30000,
            CollectionId = colId,
            SortOrder = maxSort + 1,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        // Add headers
        if (req.Headers != null)
        {
            foreach (var h in req.Headers)
            {
                endpoint.Headers.Add(new ApiEndpointHeader
                {
                    Id = Guid.NewGuid(),
                    Key = h.Key,
                    Value = h.Value,
                    IsEnabled = true,
                    EndpointId = endpoint.Id
                });
            }
        }

        _db.ApiEndpoints.Add(endpoint);
        await _db.SaveChangesAsync();

        return ApiResponse(new EndpointDto
        {
            Id = endpoint.Id,
            Name = endpoint.Name,
            Description = endpoint.Description,
            Method = endpoint.Method.ToString(),
            Url = endpoint.Url,
            RequestBody = endpoint.RequestBody,
            ContentType = endpoint.ContentType.ToString(),
            TimeoutMs = endpoint.TimeoutMs,
            Headers = endpoint.Headers.Select(h => new HeaderDto { Key = h.Key, Value = h.Value }).ToList()
        }, "Endpoint added");
    }

    /// <summary>
    /// PUT /api/projects/{projectId}/collections/{colId}/endpoints/{endpointId}
    /// </summary>
    [HttpPut("{colId:guid}/endpoints/{endpointId:guid}")]
    public async Task<IActionResult> UpdateEndpoint(Guid projectId, Guid colId, Guid endpointId, [FromBody] CreateEndpointRequest req)
    {
        var endpoint = await _db.ApiEndpoints
            .Include(e => e.Headers)
            .Include(e => e.Collection)
            .FirstOrDefaultAsync(e => e.Id == endpointId && e.CollectionId == colId && e.Collection.ProjectId == projectId && e.IsActive);

        if (endpoint == null) return ApiError("Endpoint not found", 404);

        if (!string.IsNullOrWhiteSpace(req.Name)) endpoint.Name = req.Name;
        if (!string.IsNullOrWhiteSpace(req.Url)) endpoint.Url = req.Url;
        if (req.Description != null) endpoint.Description = req.Description;
        if (req.RequestBody != null) endpoint.RequestBody = req.RequestBody;
        if (req.TimeoutMs > 0) endpoint.TimeoutMs = req.TimeoutMs;

        if (!string.IsNullOrWhiteSpace(req.Method))
        {
            endpoint.Method = req.Method.ToUpper() switch
            {
                "POST" => HttpMethod.POST,
                "PUT" => HttpMethod.PUT,
                "PATCH" => HttpMethod.PATCH,
                "DELETE" => HttpMethod.DELETE,
                _ => HttpMethod.GET
            };
        }

        // Replace headers
        if (req.Headers != null)
        {
            _db.ApiEndpointHeaders.RemoveRange(endpoint.Headers);
            foreach (var h in req.Headers)
            {
                endpoint.Headers.Add(new ApiEndpointHeader
                {
                    Id = Guid.NewGuid(),
                    Key = h.Key,
                    Value = h.Value,
                    IsEnabled = true,
                    EndpointId = endpoint.Id
                });
            }
        }

        endpoint.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return ApiResponse(new EndpointDto
        {
            Id = endpoint.Id,
            Name = endpoint.Name,
            Method = endpoint.Method.ToString(),
            Url = endpoint.Url,
            RequestBody = endpoint.RequestBody,
            TimeoutMs = endpoint.TimeoutMs,
            Headers = endpoint.Headers.Select(h => new HeaderDto { Key = h.Key, Value = h.Value }).ToList()
        }, "Endpoint updated");
    }

    /// <summary>
    /// DELETE /api/projects/{projectId}/collections/{colId}/endpoints/{endpointId}
    /// </summary>
    [HttpDelete("{colId:guid}/endpoints/{endpointId:guid}")]
    public async Task<IActionResult> DeleteEndpoint(Guid projectId, Guid colId, Guid endpointId)
    {
        var endpoint = await _db.ApiEndpoints
            .Include(e => e.Collection)
            .FirstOrDefaultAsync(e => e.Id == endpointId && e.CollectionId == colId && e.Collection.ProjectId == projectId);

        if (endpoint == null) return ApiError("Endpoint not found", 404);

        endpoint.IsActive = false;
        endpoint.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return ApiResponse<object?>(null, "Endpoint deleted");
    }

    // ==================== IMPORT ====================

    /// <summary>
    /// POST /api/projects/{projectId}/collections/import - Import from Postman JSON or OpenAPI/Swagger
    /// </summary>
    [HttpPost("import")]
    public async Task<IActionResult> ImportCollection(Guid projectId, [FromBody] ImportCollectionRequest req)
    {
        var project = await _db.Projects.FirstOrDefaultAsync(p => p.Id == projectId && p.IsActive);
        if (project == null) return ApiError("Project not found", 404);

        if (string.IsNullOrWhiteSpace(req.Content)) return ApiError("Content is required");

        try
        {
            using var doc = JsonDocument.Parse(req.Content);
            var root = doc.RootElement;

            // Detect format
            if (root.TryGetProperty("info", out var info) && root.TryGetProperty("item", out var items))
                return await ImportPostman(projectId, root, info, items);

            if (root.TryGetProperty("openapi", out _) || root.TryGetProperty("swagger", out _))
                return await ImportOpenApi(projectId, root);

            return ApiError("Unrecognized format. Supported: Postman Collection v2.1, OpenAPI 3.x / Swagger 2.x");
        }
        catch (JsonException)
        {
            return ApiError("Invalid JSON");
        }
    }

    private async Task<IActionResult> ImportPostman(Guid projectId, JsonElement root, JsonElement info, JsonElement items)
    {
        var collectionName = info.TryGetProperty("name", out var n) ? n.GetString() ?? "Imported" : "Imported";

        var col = new ApiCollection
        {
            Id = Guid.NewGuid(), Name = collectionName, ImportedFrom = ImportSource.Postman,
            ProjectId = projectId, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow
        };

        int sort = 0;
        ParsePostmanItems(items, col, ref sort, "");

        _db.ApiCollections.Add(col);
        await _db.SaveChangesAsync();

        return ApiResponse(new { collectionId = col.Id, name = col.Name, endpointCount = col.Endpoints.Count },
            $"Imported {col.Endpoints.Count} endpoints from Postman");
    }

    private void ParsePostmanItems(JsonElement items, ApiCollection col, ref int sort, string prefix)
    {
        foreach (var item in items.EnumerateArray())
        {
            if (item.TryGetProperty("item", out var subItems))
            {
                var folderName = item.TryGetProperty("name", out var fn) ? fn.GetString() ?? "" : "";
                var newPrefix = string.IsNullOrEmpty(prefix) ? folderName : $"{prefix}/{folderName}";
                ParsePostmanItems(subItems, col, ref sort, newPrefix);
                continue;
            }

            if (!item.TryGetProperty("request", out var request)) continue;

            var name = item.TryGetProperty("name", out var nm) ? nm.GetString() ?? "Unnamed" : "Unnamed";
            if (!string.IsNullOrEmpty(prefix)) name = $"{prefix}/{name}";

            var method = HttpMethod.GET;
            if (request.TryGetProperty("method", out var m))
            {
                method = m.GetString()?.ToUpper() switch
                {
                    "POST" => HttpMethod.POST, "PUT" => HttpMethod.PUT, "PATCH" => HttpMethod.PATCH,
                    "DELETE" => HttpMethod.DELETE, "HEAD" => HttpMethod.HEAD, "OPTIONS" => HttpMethod.OPTIONS,
                    _ => HttpMethod.GET
                };
            }

            var url = "";
            if (request.TryGetProperty("url", out var urlEl))
            {
                if (urlEl.ValueKind == JsonValueKind.String) url = urlEl.GetString() ?? "";
                else if (urlEl.TryGetProperty("raw", out var raw)) url = raw.GetString() ?? "";
            }

            string? body = null;
            if (request.TryGetProperty("body", out var bodyEl) && bodyEl.TryGetProperty("raw", out var rawBody))
                body = rawBody.GetString();

            var ep = new ApiEndpoint
            {
                Id = Guid.NewGuid(), Name = name, Method = method, Url = url, RequestBody = body,
                ContentType = ContentType.Json, CollectionId = col.Id, SortOrder = sort++,
                CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow
            };

            // Headers
            if (request.TryGetProperty("header", out var headers) && headers.ValueKind == JsonValueKind.Array)
            {
                foreach (var h in headers.EnumerateArray())
                {
                    var key = h.TryGetProperty("key", out var hk) ? hk.GetString() ?? "" : "";
                    var val = h.TryGetProperty("value", out var hv) ? hv.GetString() ?? "" : "";
                    if (!string.IsNullOrWhiteSpace(key))
                        ep.Headers.Add(new ApiEndpointHeader { Id = Guid.NewGuid(), Key = key, Value = val, IsEnabled = true, EndpointId = ep.Id });
                }
            }

            // Auth from request or collection level
            if (request.TryGetProperty("auth", out var auth))
                AddAuthHeaders(ep, auth);

            col.Endpoints.Add(ep);
        }
    }

    private void AddAuthHeaders(ApiEndpoint ep, JsonElement auth)
    {
        if (!auth.TryGetProperty("type", out var typeEl)) return;
        var type = typeEl.GetString()?.ToLower();

        if (type == "bearer" && auth.TryGetProperty("bearer", out var bearer))
        {
            foreach (var b in bearer.EnumerateArray())
            {
                if (b.TryGetProperty("key", out var k) && k.GetString() == "token" && b.TryGetProperty("value", out var v))
                {
                    ep.Headers.Add(new ApiEndpointHeader { Id = Guid.NewGuid(), Key = "Authorization", Value = $"Bearer {v.GetString()}", IsEnabled = true, EndpointId = ep.Id });
                }
            }
        }
        else if (type == "apikey" && auth.TryGetProperty("apikey", out var apikey))
        {
            string? key = null, value = null;
            foreach (var a in apikey.EnumerateArray())
            {
                var ak = a.TryGetProperty("key", out var akk) ? akk.GetString() : "";
                var av = a.TryGetProperty("value", out var avv) ? avv.GetString() : "";
                if (ak == "key") key = av;
                if (ak == "value") value = av;
            }
            if (key != null && value != null)
                ep.Headers.Add(new ApiEndpointHeader { Id = Guid.NewGuid(), Key = key, Value = value, IsEnabled = true, EndpointId = ep.Id });
        }
    }

    private async Task<IActionResult> ImportOpenApi(Guid projectId, JsonElement root)
    {
        var title = "Imported API";
        if (root.TryGetProperty("info", out var info) && info.TryGetProperty("title", out var t))
            title = t.GetString() ?? title;

        var col = new ApiCollection
        {
            Id = Guid.NewGuid(), Name = title, ImportedFrom = ImportSource.OpenApi,
            ProjectId = projectId, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow
        };

        int sort = 0;
        if (root.TryGetProperty("paths", out var paths))
        {
            foreach (var path in paths.EnumerateObject())
            {
                foreach (var methodEntry in path.Value.EnumerateObject())
                {
                    var httpMethod = methodEntry.Name.ToUpper() switch
                    {
                        "POST" => HttpMethod.POST, "PUT" => HttpMethod.PUT, "PATCH" => HttpMethod.PATCH,
                        "DELETE" => HttpMethod.DELETE, "HEAD" => HttpMethod.HEAD, "OPTIONS" => HttpMethod.OPTIONS,
                        _ => HttpMethod.GET
                    };

                    if (httpMethod == HttpMethod.GET && methodEntry.Name == "parameters") continue;

                    var summary = methodEntry.Value.TryGetProperty("summary", out var s) ? s.GetString() ?? "" : "";
                    var opId = methodEntry.Value.TryGetProperty("operationId", out var o) ? o.GetString() ?? "" : "";
                    var name = !string.IsNullOrEmpty(summary) ? summary : !string.IsNullOrEmpty(opId) ? opId : $"{methodEntry.Name.ToUpper()} {path.Name}";

                    col.Endpoints.Add(new ApiEndpoint
                    {
                        Id = Guid.NewGuid(), Name = name, Method = httpMethod, Url = path.Name,
                        ContentType = ContentType.Json, CollectionId = col.Id, SortOrder = sort++,
                        CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow
                    });
                }
            }
        }

        _db.ApiCollections.Add(col);
        await _db.SaveChangesAsync();

        return ApiResponse(new { collectionId = col.Id, name = col.Name, endpointCount = col.Endpoints.Count },
            $"Imported {col.Endpoints.Count} endpoints from OpenAPI/Swagger");
    }

    // ==================== EXECUTE REQUEST ====================

    /// <summary>
    /// POST /api/projects/{projectId}/collections/{colId}/endpoints/{endpointId}/execute
    /// Execute an HTTP request and return the response (like Postman Send)
    /// </summary>
    [HttpPost("{colId:guid}/endpoints/{endpointId:guid}/execute")]
    public async Task<IActionResult> ExecuteRequest(Guid projectId, Guid colId, Guid endpointId, [FromBody] ExecuteRequestPayload? overrides)
    {
        var endpoint = await _db.ApiEndpoints
            .Include(e => e.Headers)
            .Include(e => e.Collection)
            .FirstOrDefaultAsync(e => e.Id == endpointId && e.CollectionId == colId && e.Collection.ProjectId == projectId && e.IsActive);

        if (endpoint == null) return ApiError("Endpoint not found", 404);

        // Get environment for variable substitution
        var envId = overrides?.EnvironmentId;
        Core.Entities.Environment? env = null;
        if (envId.HasValue)
            env = await _db.Environments.Include(e => e.Variables).FirstOrDefaultAsync(e => e.Id == envId.Value && e.ProjectId == projectId);
        else
            env = await _db.Environments.Include(e => e.Variables).FirstOrDefaultAsync(e => e.ProjectId == projectId && e.IsDefault);

        // Build URL
        var baseUrl = env?.BaseUrl?.TrimEnd('/') ?? "";
        var url = overrides?.Url ?? endpoint.Url;
        url = SubstituteVariables(url, env);
        if (!url.StartsWith("http", StringComparison.OrdinalIgnoreCase))
            url = $"{baseUrl}{(url.StartsWith("/") ? "" : "/")}{url}";

        // Build method
        var methodStr = overrides?.Method?.ToUpper() ?? endpoint.Method.ToString();
        var httpMethod = new System.Net.Http.HttpMethod(methodStr);

        var sw = System.Diagnostics.Stopwatch.StartNew();
        try
        {
            var client = _httpClientFactory.CreateClient("RequestRunner");
            client.Timeout = TimeSpan.FromMilliseconds(endpoint.TimeoutMs > 0 ? endpoint.TimeoutMs : 30000);

            var request = new HttpRequestMessage(httpMethod, url);

            // Headers: from endpoint + overrides
            foreach (var h in endpoint.Headers.Where(h => h.IsEnabled))
                request.Headers.TryAddWithoutValidation(SubstituteVariables(h.Key, env), SubstituteVariables(h.Value, env));

            if (overrides?.Headers != null)
            {
                foreach (var h in overrides.Headers)
                    request.Headers.TryAddWithoutValidation(SubstituteVariables(h.Key, env), SubstituteVariables(h.Value, env));
            }

            // Auth header override
            if (!string.IsNullOrWhiteSpace(overrides?.AuthToken))
                request.Headers.TryAddWithoutValidation("Authorization", $"Bearer {overrides.AuthToken}");

            // Body
            var body = overrides?.Body ?? endpoint.RequestBody;
            if (!string.IsNullOrWhiteSpace(body) && httpMethod != System.Net.Http.HttpMethod.Get)
            {
                body = SubstituteVariables(body, env);
                request.Content = new StringContent(body, Encoding.UTF8, "application/json");
            }

            var response = await client.SendAsync(request);
            sw.Stop();

            var responseBody = await response.Content.ReadAsStringAsync();
            var responseHeaders = response.Headers.Concat(response.Content.Headers)
                .Select(h => new HeaderDto { Key = h.Key, Value = string.Join(", ", h.Value) }).ToList();

            return ApiResponse(new ExecuteResponseDto
            {
                StatusCode = (int)response.StatusCode,
                StatusText = response.ReasonPhrase ?? "",
                DurationMs = sw.ElapsedMilliseconds,
                ResponseBody = responseBody,
                ResponseHeaders = responseHeaders,
                ResponseSizeBytes = Encoding.UTF8.GetByteCount(responseBody)
            });
        }
        catch (TaskCanceledException)
        {
            sw.Stop();
            return ApiResponse(new ExecuteResponseDto { StatusCode = 0, StatusText = "Timeout", DurationMs = sw.ElapsedMilliseconds, ResponseBody = "Request timed out", Error = "Request timed out" });
        }
        catch (Exception ex)
        {
            sw.Stop();
            return ApiResponse(new ExecuteResponseDto { StatusCode = 0, StatusText = "Error", DurationMs = sw.ElapsedMilliseconds, ResponseBody = ex.Message, Error = ex.Message });
        }
    }

    /// <summary>
    /// POST /api/projects/{projectId}/execute-adhoc - Execute any arbitrary request (no saved endpoint)
    /// </summary>
    [HttpPost("~/api/projects/{projectId:guid}/execute-adhoc")]
    public async Task<IActionResult> ExecuteAdhoc(Guid projectId, [FromBody] AdhocRequestPayload req)
    {
        if (string.IsNullOrWhiteSpace(req.Url)) return ApiError("URL is required");

        Core.Entities.Environment? env = null;
        if (req.EnvironmentId.HasValue)
            env = await _db.Environments.Include(e => e.Variables).FirstOrDefaultAsync(e => e.Id == req.EnvironmentId.Value && e.ProjectId == projectId);
        else
            env = await _db.Environments.Include(e => e.Variables).FirstOrDefaultAsync(e => e.ProjectId == projectId && e.IsDefault);

        var baseUrl = env?.BaseUrl?.TrimEnd('/') ?? "";
        var url = SubstituteVariables(req.Url, env);
        if (!url.StartsWith("http", StringComparison.OrdinalIgnoreCase))
            url = $"{baseUrl}{(url.StartsWith("/") ? "" : "/")}{url}";

        var httpMethod = new System.Net.Http.HttpMethod(req.Method?.ToUpper() ?? "GET");

        var sw = System.Diagnostics.Stopwatch.StartNew();
        try
        {
            var client = _httpClientFactory.CreateClient("RequestRunner");
            client.Timeout = TimeSpan.FromMilliseconds(30000);
            var request = new HttpRequestMessage(httpMethod, url);

            if (req.Headers != null)
                foreach (var h in req.Headers)
                    request.Headers.TryAddWithoutValidation(SubstituteVariables(h.Key, env), SubstituteVariables(h.Value, env));

            if (!string.IsNullOrWhiteSpace(req.AuthToken))
                request.Headers.TryAddWithoutValidation("Authorization", $"Bearer {req.AuthToken}");

            if (!string.IsNullOrWhiteSpace(req.Body) && httpMethod != System.Net.Http.HttpMethod.Get)
                request.Content = new StringContent(SubstituteVariables(req.Body, env), Encoding.UTF8, "application/json");

            var response = await client.SendAsync(request);
            sw.Stop();

            var responseBody = await response.Content.ReadAsStringAsync();
            var responseHeaders = response.Headers.Concat(response.Content.Headers)
                .Select(h => new HeaderDto { Key = h.Key, Value = string.Join(", ", h.Value) }).ToList();

            return ApiResponse(new ExecuteResponseDto
            {
                StatusCode = (int)response.StatusCode, StatusText = response.ReasonPhrase ?? "",
                DurationMs = sw.ElapsedMilliseconds, ResponseBody = responseBody,
                ResponseHeaders = responseHeaders, ResponseSizeBytes = Encoding.UTF8.GetByteCount(responseBody)
            });
        }
        catch (TaskCanceledException) { sw.Stop(); return ApiResponse(new ExecuteResponseDto { StatusCode = 0, StatusText = "Timeout", DurationMs = sw.ElapsedMilliseconds, Error = "Timeout" }); }
        catch (Exception ex) { sw.Stop(); return ApiResponse(new ExecuteResponseDto { StatusCode = 0, StatusText = "Error", DurationMs = sw.ElapsedMilliseconds, Error = ex.Message }); }
    }

    private static string SubstituteVariables(string input, Core.Entities.Environment? env)
    {
        if (env == null || string.IsNullOrEmpty(input)) return input;
        // Replace {{baseUrl}}
        input = input.Replace("{{baseUrl}}", env.BaseUrl?.TrimEnd('/') ?? "");
        // Replace env variables
        if (env.Variables != null)
            foreach (var v in env.Variables)
                input = input.Replace($"{{{{{v.Key}}}}}", v.Value);
        return input;
    }
}

// DTOs
public record CollectionDetailDto
{
    public Guid Id { get; init; }
    public string Name { get; init; } = string.Empty;
    public string? Description { get; init; }
    public int EndpointCount { get; init; }
    public IReadOnlyList<EndpointDto> Endpoints { get; init; } = new List<EndpointDto>();
}

public record EndpointDto
{
    public Guid Id { get; init; }
    public string Name { get; init; } = string.Empty;
    public string? Description { get; init; }
    public string Method { get; init; } = "GET";
    public string Url { get; init; } = string.Empty;
    public string? RequestBody { get; init; }
    public string ContentType { get; init; } = "Json";
    public int TimeoutMs { get; init; }
    public IReadOnlyList<HeaderDto> Headers { get; init; } = new List<HeaderDto>();
}

public record HeaderDto
{
    public string Key { get; init; } = string.Empty;
    public string Value { get; init; } = string.Empty;
}

public record CreateEndpointRequest
{
    public string Name { get; init; } = string.Empty;
    public string? Description { get; init; }
    public string Method { get; init; } = "GET";
    public string Url { get; init; } = string.Empty;
    public string? RequestBody { get; init; }
    public int TimeoutMs { get; init; } = 30000;
    public IReadOnlyList<HeaderDto>? Headers { get; init; }
}

public record ImportCollectionRequest
{
    public string Content { get; init; } = string.Empty;
}

public record ExecuteRequestPayload
{
    public string? Method { get; init; }
    public string? Url { get; init; }
    public string? Body { get; init; }
    public string? AuthToken { get; init; }
    public Guid? EnvironmentId { get; init; }
    public IReadOnlyList<HeaderDto>? Headers { get; init; }
}

public record AdhocRequestPayload
{
    public string Method { get; init; } = "GET";
    public string Url { get; init; } = string.Empty;
    public string? Body { get; init; }
    public string? AuthToken { get; init; }
    public Guid? EnvironmentId { get; init; }
    public IReadOnlyList<HeaderDto>? Headers { get; init; }
}

public record ExecuteResponseDto
{
    public int StatusCode { get; init; }
    public string StatusText { get; init; } = string.Empty;
    public long DurationMs { get; init; }
    public string? ResponseBody { get; init; }
    public IReadOnlyList<HeaderDto> ResponseHeaders { get; init; } = new List<HeaderDto>();
    public long ResponseSizeBytes { get; init; }
    public string? Error { get; init; }
}

