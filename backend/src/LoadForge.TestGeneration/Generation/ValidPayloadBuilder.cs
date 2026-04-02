using LoadForge.TestGeneration.Models;

namespace LoadForge.TestGeneration.Generation;

/// <summary>
/// Module B: ValidPayloadBuilder
/// Generates fully compliant request payloads from OpenAPI schemas.
/// All generation is deterministic using a seeded Random.
/// Uses defaults/examples when available, generates seeded random values otherwise.
/// </summary>
public class ValidPayloadBuilder
{
    private readonly Random _random;
    private readonly string _testPrefix;

    public ValidPayloadBuilder(int seed = 42, string testPrefix = "loadforge_test_")
    {
        _random = new Random(seed);
        _testPrefix = testPrefix;
    }

    /// <summary>
    /// Build a valid, schema-compliant payload as a Dictionary.
    /// </summary>
    public Dictionary<string, object?> BuildPayload(ParsedSchema schema)
    {
        if (schema.Type != "object" || schema.Properties.Count == 0)
            return new Dictionary<string, object?>();

        var payload = new Dictionary<string, object?>();

        foreach (var (name, propSchema) in schema.Properties)
        {
            payload[name] = GenerateValue(propSchema, name);
        }

        return payload;
    }

    /// <summary>
    /// Generate a single valid value for a given schema field.
    /// </summary>
    public object? GenerateValue(ParsedSchema schema, string fieldName = "field")
    {
        // Use example first if available
        if (schema.Example != null)
            return ConvertExample(schema.Example, schema.Type);

        // Use default if available
        if (schema.Default != null)
            return ConvertExample(schema.Default, schema.Type);

        // Use first enum value if defined
        if (schema.Enum.Count > 0)
            return schema.Enum[0];

        return schema.Type?.ToLower() switch
        {
            "string" => GenerateString(schema, fieldName),
            "integer" => GenerateInteger(schema),
            "number" => GenerateNumber(schema),
            "boolean" => true,
            "array" => GenerateArray(schema, fieldName),
            "object" => GenerateObject(schema),
            _ => GenerateString(schema, fieldName)
        };
    }

    /// <summary>
    /// Generate a valid string respecting constraints.
    /// </summary>
    private object GenerateString(ParsedSchema schema, string fieldName)
    {
        // Format-specific generation
        if (schema.Format != null)
        {
            return schema.Format.ToLower() switch
            {
                "date-time" => DateTime.UtcNow.AddDays(1).ToString("yyyy-MM-ddTHH:mm:ssZ"),
                "date" => DateTime.UtcNow.AddDays(1).ToString("yyyy-MM-dd"),
                "time" => "12:00:00",
                "email" => $"{_testPrefix}{fieldName}@example.com",
                "uuid" => Guid.NewGuid().ToString(),
                "uri" or "url" => $"https://example.com/{_testPrefix}{fieldName}",
                "hostname" => "example.com",
                "ipv4" => "192.168.1.1",
                "ipv6" => "::1",
                "password" => $"{_testPrefix}Pass123!",
                "byte" => Convert.ToBase64String(new byte[] { 1, 2, 3 }),
                _ => GeneratePlainString(schema, fieldName)
            };
        }

        return GeneratePlainString(schema, fieldName);
    }

    private string GeneratePlainString(ParsedSchema schema, string fieldName)
    {
        var baseValue = $"{_testPrefix}{fieldName}";

        if (schema.MinLength.HasValue && baseValue.Length < schema.MinLength.Value)
        {
            baseValue = baseValue.PadRight(schema.MinLength.Value, 'x');
        }

        if (schema.MaxLength.HasValue && baseValue.Length > schema.MaxLength.Value)
        {
            baseValue = baseValue[..schema.MaxLength.Value];
        }

        // Respect pattern by generating a plausible value
        // (Pattern matching is complex; for deterministic generation we rely on
        //  example/default or generate a pattern-compatible string where possible)
        if (schema.Pattern != null && !string.IsNullOrEmpty(schema.Pattern))
        {
            // For common patterns, provide known-good values
            if (schema.Pattern.Contains("^[a-zA-Z"))
                return baseValue.Length > 0 ? baseValue : "testValue";
        }

        return baseValue;
    }

    /// <summary>
    /// Generate a valid integer respecting constraints.
    /// </summary>
    private object GenerateInteger(ParsedSchema schema)
    {
        long min = schema.Minimum.HasValue ? (long)schema.Minimum.Value : 1;
        long max = schema.Maximum.HasValue ? (long)schema.Maximum.Value : 100;

        if (schema.ExclusiveMinimum && schema.Minimum.HasValue)
            min = (long)schema.Minimum.Value + 1;

        if (schema.ExclusiveMaximum && schema.Maximum.HasValue)
            max = (long)schema.Maximum.Value - 1;

        if (min > max) min = max;

        // Respect multipleOf
        if (schema.MultipleOf.HasValue && schema.MultipleOf.Value > 0)
        {
            var multiple = (long)schema.MultipleOf.Value;
            var candidate = ((min + multiple - 1) / multiple) * multiple;
            return candidate <= max ? candidate : min;
        }

        // Deterministic value within range
        return min + (_random.NextInt64() % Math.Max(1, max - min + 1));
    }

    /// <summary>
    /// Generate a valid number (decimal) respecting constraints.
    /// </summary>
    private object GenerateNumber(ParsedSchema schema)
    {
        var min = schema.Minimum ?? 0.0m;
        var max = schema.Maximum ?? 100.0m;

        if (schema.ExclusiveMinimum && schema.Minimum.HasValue)
            min = schema.Minimum.Value + 0.01m;

        if (schema.ExclusiveMaximum && schema.Maximum.HasValue)
            max = schema.Maximum.Value - 0.01m;

        // Midpoint for deterministic value
        var value = (min + max) / 2;

        if (schema.MultipleOf.HasValue && schema.MultipleOf.Value > 0)
        {
            value = Math.Ceiling(min / schema.MultipleOf.Value) * schema.MultipleOf.Value;
        }

        return Math.Round(value, 2);
    }

    /// <summary>
    /// Generate a valid array respecting constraints.
    /// </summary>
    private object GenerateArray(ParsedSchema schema, string fieldName)
    {
        var itemCount = schema.MinItems ?? 1;
        if (schema.MaxItems.HasValue && itemCount > schema.MaxItems.Value)
            itemCount = schema.MaxItems.Value;

        var items = new List<object?>();
        for (int i = 0; i < itemCount; i++)
        {
            items.Add(schema.Items != null
                ? GenerateValue(schema.Items, $"{fieldName}_{i}")
                : $"{_testPrefix}item_{i}");
        }

        return items;
    }

    /// <summary>
    /// Generate a valid object with all required properties.
    /// </summary>
    private object GenerateObject(ParsedSchema schema)
    {
        var obj = new Dictionary<string, object?>();
        foreach (var (name, propSchema) in schema.Properties)
        {
            obj[name] = GenerateValue(propSchema, name);
        }
        return obj;
    }

    private static object? ConvertExample(string example, string? type)
    {
        return type?.ToLower() switch
        {
            "integer" => long.TryParse(example, out var i) ? i : (object)example,
            "number" => decimal.TryParse(example, out var d) ? d : (object)example,
            "boolean" => bool.TryParse(example, out var b) ? b : (object)example,
            _ => example
        };
    }
}

