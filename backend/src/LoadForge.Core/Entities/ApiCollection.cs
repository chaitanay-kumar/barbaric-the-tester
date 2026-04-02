namespace LoadForge.Core.Entities;

/// <summary>
/// Collection of API endpoints (like Postman collection)
/// </summary>
public class ApiCollection
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    
    // Import source
    public ImportSource? ImportedFrom { get; set; }
    public string? ImportedFileName { get; set; }
    
    // Project
    public Guid ProjectId { get; set; }
    public Project Project { get; set; } = null!;
    
    // Status
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    
    // Navigation
    public ICollection<ApiEndpoint> Endpoints { get; set; } = new List<ApiEndpoint>();
}

public enum ImportSource
{
    Manual = 0,
    Postman = 1,
    OpenApi = 2,
    Swagger = 3,
    Curl = 4
}

/// <summary>
/// Individual API endpoint definition
/// </summary>
public class ApiEndpoint
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    
    // HTTP Details
    public HttpMethod Method { get; set; } = HttpMethod.GET;
    public string Url { get; set; } = string.Empty; // Can contain {{variables}}
    
    // Request
    public string? RequestBody { get; set; } // JSON string
    public ContentType ContentType { get; set; } = ContentType.Json;
    
    // Scripts
    public string? PreRequestScript { get; set; } // JavaScript
    public string? PostResponseScript { get; set; } // JavaScript
    
    // Timeout
    public int TimeoutMs { get; set; } = 30000;
    
    // Collection
    public Guid CollectionId { get; set; }
    public ApiCollection Collection { get; set; } = null!;
    
    // Status
    public int SortOrder { get; set; } = 0;
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    
    // Navigation
    public ICollection<ApiEndpointHeader> Headers { get; set; } = new List<ApiEndpointHeader>();
    public ICollection<ApiEndpointAssertion> Assertions { get; set; } = new List<ApiEndpointAssertion>();
    public ICollection<ApiEndpointExtraction> Extractions { get; set; } = new List<ApiEndpointExtraction>();
}

public enum HttpMethod
{
    GET = 0,
    POST = 1,
    PUT = 2,
    PATCH = 3,
    DELETE = 4,
    HEAD = 5,
    OPTIONS = 6
}

public enum ContentType
{
    Json = 0,
    FormData = 1,
    FormUrlEncoded = 2,
    Xml = 3,
    Text = 4,
    Binary = 5
}

/// <summary>
/// Request header for an endpoint
/// </summary>
public class ApiEndpointHeader
{
    public Guid Id { get; set; }
    public string Key { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty; // Can contain {{variables}}
    public bool IsEnabled { get; set; } = true;
    
    public Guid EndpointId { get; set; }
    public ApiEndpoint Endpoint { get; set; } = null!;
}

/// <summary>
/// Response assertion for validation
/// </summary>
public class ApiEndpointAssertion
{
    public Guid Id { get; set; }
    public AssertionType Type { get; set; }
    public string Expression { get; set; } = string.Empty; // JSONPath, status code, etc.
    public string ExpectedValue { get; set; } = string.Empty;
    public AssertionOperator Operator { get; set; } = AssertionOperator.Equals;
    
    public Guid EndpointId { get; set; }
    public ApiEndpoint Endpoint { get; set; } = null!;
}

public enum AssertionType
{
    StatusCode = 0,
    JsonPath = 1,
    Header = 2,
    ResponseTime = 3,
    BodyContains = 4
}

public enum AssertionOperator
{
    Equals = 0,
    NotEquals = 1,
    Contains = 2,
    GreaterThan = 3,
    LessThan = 4,
    Exists = 5,
    NotExists = 6
}

/// <summary>
/// Extract value from response for correlation
/// </summary>
public class ApiEndpointExtraction
{
    public Guid Id { get; set; }
    public string VariableName { get; set; } = string.Empty; // e.g., "orderId"
    public ExtractionSource Source { get; set; } = ExtractionSource.JsonBody;
    public string Expression { get; set; } = string.Empty; // JSONPath: $.data.orderId
    
    public Guid EndpointId { get; set; }
    public ApiEndpoint Endpoint { get; set; } = null!;
}

public enum ExtractionSource
{
    JsonBody = 0,
    Header = 1,
    Cookie = 2,
    Regex = 3
}

