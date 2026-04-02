namespace LoadForge.TestGeneration.Models;

/// <summary>
/// Internal representation of a parsed OpenAPI specification.
/// Decoupled from the OpenAPI library types for testability and stability.
/// </summary>
public class ParsedApiSpec
{
    public string Title { get; set; } = string.Empty;
    public string Version { get; set; } = string.Empty;
    public string? Description { get; set; }
    public List<string> Servers { get; set; } = new();
    public List<ParsedEndpoint> Endpoints { get; set; } = new();
    public Dictionary<string, ParsedSchema> Schemas { get; set; } = new();
}

/// <summary>
/// A parsed API endpoint extracted from the OpenAPI spec
/// </summary>
public class ParsedEndpoint
{
    public string OperationId { get; set; } = string.Empty;
    public string Path { get; set; } = string.Empty;
    public string Method { get; set; } = "GET";
    public string? Summary { get; set; }
    public string? Description { get; set; }
    public List<string> Tags { get; set; } = new();

    /// <summary>Path, query, and header parameters</summary>
    public List<ParsedParameter> Parameters { get; set; } = new();

    /// <summary>Request body schema (null for GET/DELETE without body)</summary>
    public ParsedSchema? RequestBody { get; set; }

    /// <summary>Expected response schemas keyed by status code (e.g., "200", "201")</summary>
    public Dictionary<string, ParsedSchema> Responses { get; set; } = new();

    /// <summary>Security schemes required by this endpoint</summary>
    public List<string> Security { get; set; } = new();

    /// <summary>Whether this endpoint is deprecated</summary>
    public bool IsDeprecated { get; set; }
}

/// <summary>
/// A parameter (path, query, header, cookie)
/// </summary>
public class ParsedParameter
{
    public string Name { get; set; } = string.Empty;
    public string In { get; set; } = "query"; // path, query, header, cookie
    public bool Required { get; set; }
    public ParsedSchema Schema { get; set; } = new();
}

/// <summary>
/// A JSON Schema representation extracted from OpenAPI.
/// Covers all fields needed for deterministic test generation.
/// </summary>
public class ParsedSchema
{
    public string Type { get; set; } = "object"; // string, number, integer, boolean, array, object
    public string? Format { get; set; } // date-time, email, uuid, int32, int64, double, etc.
    public bool Nullable { get; set; }

    // String constraints
    public int? MinLength { get; set; }
    public int? MaxLength { get; set; }
    public string? Pattern { get; set; }

    // Numeric constraints
    public decimal? Minimum { get; set; }
    public decimal? Maximum { get; set; }
    public bool ExclusiveMinimum { get; set; }
    public bool ExclusiveMaximum { get; set; }
    public decimal? MultipleOf { get; set; }

    // Array constraints
    public int? MinItems { get; set; }
    public int? MaxItems { get; set; }
    public bool UniqueItems { get; set; }
    public ParsedSchema? Items { get; set; } // Array element schema

    // Object constraints
    public Dictionary<string, ParsedSchema> Properties { get; set; } = new();
    public List<string> Required { get; set; } = new();
    public bool AdditionalPropertiesAllowed { get; set; } = true;

    // Enum
    public List<string> Enum { get; set; } = new();

    // Default / Example
    public string? Default { get; set; }
    public string? Example { get; set; }

    // Reference
    public string? Ref { get; set; }
}

