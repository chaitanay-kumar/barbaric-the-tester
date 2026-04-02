using LoadForge.TestGeneration.Models;
using Microsoft.OpenApi.Models;
using Microsoft.OpenApi.Readers;

namespace LoadForge.TestGeneration.Parsing;

/// <summary>
/// Module A: OpenAPI Parser
/// Extracts endpoints, schemas, and constraints from OpenAPI 3.0.x specifications.
/// Produces a ParsedApiSpec decoupled from the OpenAPI library.
/// </summary>
public class OpenApiParser
{
    /// <summary>
    /// Parse an OpenAPI specification from a JSON or YAML string.
    /// </summary>
    public ParsedApiSpec Parse(string openApiContent)
    {
        var reader = new OpenApiStringReader();
        var document = reader.Read(openApiContent, out var diagnostic);

        if (diagnostic.Errors.Any())
        {
            var errors = string.Join("; ", diagnostic.Errors.Select(e => e.Message));
            throw new OpenApiParseException($"OpenAPI parse errors: {errors}");
        }

        return MapDocument(document);
    }

    /// <summary>
    /// Parse an OpenAPI specification from a stream.
    /// </summary>
    public async Task<ParsedApiSpec> ParseAsync(Stream stream)
    {
        using var streamReader = new StreamReader(stream);
        var content = await streamReader.ReadToEndAsync();
        return Parse(content);
    }

    private ParsedApiSpec MapDocument(OpenApiDocument doc)
    {
        var spec = new ParsedApiSpec
        {
            Title = doc.Info?.Title ?? "Untitled API",
            Version = doc.Info?.Version ?? "1.0.0",
            Description = doc.Info?.Description,
            Servers = doc.Servers?.Select(s => s.Url).ToList() ?? new()
        };

        // Extract global security schemes
        var globalSecurity = new List<string>();
        if (doc.SecurityRequirements != null)
        {
            foreach (var requirement in doc.SecurityRequirements)
            {
                foreach (var scheme in requirement.Keys)
                {
                    globalSecurity.Add(scheme.Reference?.Id ?? scheme.Name ?? "unknown");
                }
            }
        }

        // Extract all schemas
        if (doc.Components?.Schemas != null)
        {
            foreach (var (name, schema) in doc.Components.Schemas)
            {
                spec.Schemas[name] = MapSchema(schema);
            }
        }

        // Extract all endpoints
        if (doc.Paths != null)
        {
            foreach (var (path, pathItem) in doc.Paths)
            {
                foreach (var (method, operation) in pathItem.Operations)
                {
                    var endpoint = MapOperation(path, method.ToString().ToUpper(), operation);

                    // If endpoint has no operation-level security, inherit global security
                    if (endpoint.Security.Count == 0 && globalSecurity.Count > 0)
                    {
                        endpoint.Security.AddRange(globalSecurity);
                    }

                    spec.Endpoints.Add(endpoint);
                }
            }
        }

        return spec;
    }

    private ParsedEndpoint MapOperation(string path, string method, OpenApiOperation operation)
    {
        var endpoint = new ParsedEndpoint
        {
            OperationId = operation.OperationId ?? $"{method}_{path.Replace("/", "_").TrimStart('_')}",
            Path = path,
            Method = method,
            Summary = operation.Summary,
            Description = operation.Description,
            Tags = operation.Tags?.Select(t => t.Name).ToList() ?? new(),
            IsDeprecated = operation.Deprecated
        };

        // Parameters
        if (operation.Parameters != null)
        {
            foreach (var param in operation.Parameters)
            {
                endpoint.Parameters.Add(new ParsedParameter
                {
                    Name = param.Name,
                    In = param.In?.ToString()?.ToLower() ?? "query",
                    Required = param.Required,
                    Schema = param.Schema != null ? MapSchema(param.Schema) : new ParsedSchema { Type = "string" }
                });
            }
        }

        // Request body
        if (operation.RequestBody?.Content != null)
        {
            // Prefer application/json
            var jsonContent = operation.RequestBody.Content
                .FirstOrDefault(c => c.Key.Contains("json", StringComparison.OrdinalIgnoreCase));

            if (jsonContent.Value?.Schema != null)
            {
                endpoint.RequestBody = MapSchema(jsonContent.Value.Schema);
            }
        }

        // Responses
        if (operation.Responses != null)
        {
            foreach (var (statusCode, response) in operation.Responses)
            {
                if (response.Content != null)
                {
                    var jsonContent = response.Content
                        .FirstOrDefault(c => c.Key.Contains("json", StringComparison.OrdinalIgnoreCase));

                    if (jsonContent.Value?.Schema != null)
                    {
                        endpoint.Responses[statusCode] = MapSchema(jsonContent.Value.Schema);
                    }
                }
            }
        }

        // Security
        if (operation.Security != null)
        {
            foreach (var requirement in operation.Security)
            {
                foreach (var scheme in requirement.Keys)
                {
                    endpoint.Security.Add(scheme.Reference?.Id ?? scheme.Name ?? "unknown");
                }
            }
        }

        return endpoint;
    }

    private ParsedSchema MapSchema(OpenApiSchema schema)
    {
        var parsed = new ParsedSchema
        {
            Type = schema.Type ?? "object",
            Format = schema.Format,
            Nullable = schema.Nullable,

            // String constraints
            MinLength = schema.MinLength.HasValue ? (int)schema.MinLength.Value : null,
            MaxLength = schema.MaxLength.HasValue ? (int)schema.MaxLength.Value : null,
            Pattern = schema.Pattern,

            // Numeric constraints
            Minimum = schema.Minimum,
            Maximum = schema.Maximum,
            ExclusiveMinimum = schema.ExclusiveMinimum ?? false,
            ExclusiveMaximum = schema.ExclusiveMaximum ?? false,
            MultipleOf = schema.MultipleOf,

            // Array constraints
            MinItems = schema.MinItems.HasValue ? (int)schema.MinItems.Value : null,
            MaxItems = schema.MaxItems.HasValue ? (int)schema.MaxItems.Value : null,
            UniqueItems = schema.UniqueItems ?? false,

            // Object constraints
            Required = schema.Required?.ToList() ?? new(),
            AdditionalPropertiesAllowed = schema.AdditionalPropertiesAllowed,

            // Enum
            Enum = schema.Enum?
                .Select(e => e is Microsoft.OpenApi.Any.OpenApiString s ? s.Value : e?.ToString() ?? "")
                .Where(v => !string.IsNullOrEmpty(v))
                .ToList() ?? new(),

            // Default / Example
            Default = schema.Default is Microsoft.OpenApi.Any.OpenApiString ds ? ds.Value : schema.Default?.ToString(),
            Example = schema.Example is Microsoft.OpenApi.Any.OpenApiString es ? es.Value : schema.Example?.ToString(),

            // Reference
            Ref = schema.Reference?.Id
        };

        // Array items
        if (schema.Items != null)
        {
            parsed.Items = MapSchema(schema.Items);
        }

        // Object properties
        if (schema.Properties != null)
        {
            foreach (var (name, propSchema) in schema.Properties)
            {
                parsed.Properties[name] = MapSchema(propSchema);
            }
        }

        return parsed;
    }
}

/// <summary>
/// Exception for OpenAPI parsing errors
/// </summary>
public class OpenApiParseException : Exception
{
    public OpenApiParseException(string message) : base(message) { }
    public OpenApiParseException(string message, Exception inner) : base(message, inner) { }
}

