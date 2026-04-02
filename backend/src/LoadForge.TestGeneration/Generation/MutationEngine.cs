using LoadForge.TestGeneration.Models;

namespace LoadForge.TestGeneration.Generation;

/// <summary>
/// Module C: MutationEngine
/// Applies exactly ONE mutation per test case for deterministic negative/boundary testing.
/// Each mutation violates a single constraint for easy diagnosis.
/// </summary>
public class MutationEngine
{
    private readonly ValidPayloadBuilder _payloadBuilder;

    public MutationEngine(ValidPayloadBuilder payloadBuilder)
    {
        _payloadBuilder = payloadBuilder;
    }

    // ──────────────────────────────────────────────────
    // VALIDATION MUTATIONS (P1)
    // ──────────────────────────────────────────────────

    /// <summary>
    /// Generate payloads with one required field removed at a time.
    /// </summary>
    public List<MutationResult> GenerateMissingRequiredFieldMutations(
        ParsedSchema schema, Dictionary<string, object?> validPayload)
    {
        var mutations = new List<MutationResult>();

        foreach (var field in schema.Required)
        {
            if (!validPayload.ContainsKey(field)) continue;

            var mutated = new Dictionary<string, object?>(validPayload);
            mutated.Remove(field);

            mutations.Add(new MutationResult
            {
                MutationType = MutationType.MissingRequiredField,
                FieldName = field,
                Description = $"Missing required field: {field}",
                MutatedPayload = mutated,
                ExpectedStatusCodes = [400, 422]
            });
        }

        return mutations;
    }

    /// <summary>
    /// Generate payloads with one field having wrong data type.
    /// </summary>
    public List<MutationResult> GenerateWrongTypeMutations(
        ParsedSchema schema, Dictionary<string, object?> validPayload)
    {
        var mutations = new List<MutationResult>();

        foreach (var (field, propSchema) in schema.Properties)
        {
            if (!validPayload.ContainsKey(field)) continue;

            var wrongValue = GetWrongTypeValue(propSchema.Type);
            if (wrongValue == null) continue;

            var mutated = new Dictionary<string, object?>(validPayload)
            {
                [field] = wrongValue
            };

            mutations.Add(new MutationResult
            {
                MutationType = MutationType.WrongType,
                FieldName = field,
                Description = $"Wrong type for field: {field} (expected {propSchema.Type}, sent {wrongValue.GetType().Name})",
                MutatedPayload = mutated,
                ExpectedStatusCodes = [400, 422]
            });
        }

        return mutations;
    }

    /// <summary>
    /// Generate payloads with invalid enum values.
    /// </summary>
    public List<MutationResult> GenerateInvalidEnumMutations(
        ParsedSchema schema, Dictionary<string, object?> validPayload)
    {
        var mutations = new List<MutationResult>();

        foreach (var (field, propSchema) in schema.Properties)
        {
            if (propSchema.Enum.Count == 0) continue;
            if (!validPayload.ContainsKey(field)) continue;

            var mutated = new Dictionary<string, object?>(validPayload)
            {
                [field] = "INVALID_ENUM_VALUE_loadforge"
            };

            mutations.Add(new MutationResult
            {
                MutationType = MutationType.InvalidEnum,
                FieldName = field,
                Description = $"Invalid enum value for field: {field}",
                MutatedPayload = mutated,
                ExpectedStatusCodes = [400, 422]
            });
        }

        return mutations;
    }

    /// <summary>
    /// Generate payloads with an additional property (when not allowed).
    /// </summary>
    public MutationResult? GenerateAdditionalPropertyMutation(
        ParsedSchema schema, Dictionary<string, object?> validPayload)
    {
        if (schema.AdditionalPropertiesAllowed)
            return null;

        var mutated = new Dictionary<string, object?>(validPayload)
        {
            ["_loadforge_extra_field"] = "unexpected_value"
        };

        return new MutationResult
        {
            MutationType = MutationType.AdditionalProperty,
            FieldName = "_loadforge_extra_field",
            Description = "Additional property not allowed by schema",
            MutatedPayload = mutated,
            ExpectedStatusCodes = [400, 422]
        };
    }

    // ──────────────────────────────────────────────────
    // BOUNDARY MUTATIONS (P2)
    // ──────────────────────────────────────────────────

    /// <summary>
    /// Generate boundary test payloads for string fields.
    /// Tests: minLength-1, minLength, maxLength, maxLength+1
    /// </summary>
    public List<MutationResult> GenerateStringBoundaryMutations(
        ParsedSchema schema, Dictionary<string, object?> validPayload)
    {
        var mutations = new List<MutationResult>();

        foreach (var (field, propSchema) in schema.Properties)
        {
            if (propSchema.Type?.ToLower() != "string") continue;
            if (!validPayload.ContainsKey(field)) continue;

            // minLength - 1 (should fail)
            if (propSchema.MinLength.HasValue && propSchema.MinLength.Value > 0)
            {
                var tooShort = new string('x', propSchema.MinLength.Value - 1);
                var mutated = new Dictionary<string, object?>(validPayload) { [field] = tooShort };
                mutations.Add(new MutationResult
                {
                    MutationType = MutationType.BelowMinLength,
                    FieldName = field,
                    Description = $"String below minLength ({propSchema.MinLength.Value - 1} < {propSchema.MinLength.Value}): {field}",
                    MutatedPayload = mutated,
                    ExpectedStatusCodes = [400, 422],
                    IsViolation = true
                });

                // minLength exact (should pass)
                var atMin = new string('x', propSchema.MinLength.Value);
                var validMutated = new Dictionary<string, object?>(validPayload) { [field] = atMin };
                mutations.Add(new MutationResult
                {
                    MutationType = MutationType.AtMinLength,
                    FieldName = field,
                    Description = $"String at minLength ({propSchema.MinLength.Value}): {field}",
                    MutatedPayload = validMutated,
                    ExpectedStatusCodes = [200, 201],
                    IsViolation = false
                });
            }

            // maxLength + 1 (should fail)
            if (propSchema.MaxLength.HasValue)
            {
                var tooLong = new string('x', propSchema.MaxLength.Value + 1);
                var mutated = new Dictionary<string, object?>(validPayload) { [field] = tooLong };
                mutations.Add(new MutationResult
                {
                    MutationType = MutationType.AboveMaxLength,
                    FieldName = field,
                    Description = $"String above maxLength ({propSchema.MaxLength.Value + 1} > {propSchema.MaxLength.Value}): {field}",
                    MutatedPayload = mutated,
                    ExpectedStatusCodes = [400, 422],
                    IsViolation = true
                });

                // maxLength exact (should pass)
                var atMax = new string('x', propSchema.MaxLength.Value);
                var validMutated = new Dictionary<string, object?>(validPayload) { [field] = atMax };
                mutations.Add(new MutationResult
                {
                    MutationType = MutationType.AtMaxLength,
                    FieldName = field,
                    Description = $"String at maxLength ({propSchema.MaxLength.Value}): {field}",
                    MutatedPayload = validMutated,
                    ExpectedStatusCodes = [200, 201],
                    IsViolation = false
                });
            }
        }

        return mutations;
    }

    /// <summary>
    /// Generate boundary test payloads for numeric fields.
    /// Tests: minimum-1, minimum, maximum, maximum+1, exclusiveMinimum, exclusiveMaximum, multipleOf violation
    /// </summary>
    public List<MutationResult> GenerateNumericBoundaryMutations(
        ParsedSchema schema, Dictionary<string, object?> validPayload)
    {
        var mutations = new List<MutationResult>();

        foreach (var (field, propSchema) in schema.Properties)
        {
            if (propSchema.Type?.ToLower() is not ("integer" or "number")) continue;
            if (!validPayload.ContainsKey(field)) continue;

            // minimum - 1 (should fail)
            if (propSchema.Minimum.HasValue)
            {
                var belowMin = propSchema.Minimum.Value - 1;
                var mutated = new Dictionary<string, object?>(validPayload) { [field] = belowMin };
                mutations.Add(new MutationResult
                {
                    MutationType = MutationType.BelowMinimum,
                    FieldName = field,
                    Description = $"Number below minimum ({belowMin} < {propSchema.Minimum.Value}): {field}",
                    MutatedPayload = mutated,
                    ExpectedStatusCodes = [400, 422],
                    IsViolation = true
                });

                // At minimum (should pass, unless exclusiveMinimum)
                var atMin = propSchema.Minimum.Value;
                var atMinMutated = new Dictionary<string, object?>(validPayload) { [field] = atMin };
                mutations.Add(new MutationResult
                {
                    MutationType = MutationType.AtMinimum,
                    FieldName = field,
                    Description = $"Number at minimum ({atMin}): {field}",
                    MutatedPayload = atMinMutated,
                    ExpectedStatusCodes = propSchema.ExclusiveMinimum ? [400, 422] : [200, 201],
                    IsViolation = propSchema.ExclusiveMinimum
                });
            }

            // maximum + 1 (should fail)
            if (propSchema.Maximum.HasValue)
            {
                var aboveMax = propSchema.Maximum.Value + 1;
                var mutated = new Dictionary<string, object?>(validPayload) { [field] = aboveMax };
                mutations.Add(new MutationResult
                {
                    MutationType = MutationType.AboveMaximum,
                    FieldName = field,
                    Description = $"Number above maximum ({aboveMax} > {propSchema.Maximum.Value}): {field}",
                    MutatedPayload = mutated,
                    ExpectedStatusCodes = [400, 422],
                    IsViolation = true
                });

                // At maximum (should pass, unless exclusiveMaximum)
                var atMax = propSchema.Maximum.Value;
                var atMaxMutated = new Dictionary<string, object?>(validPayload) { [field] = atMax };
                mutations.Add(new MutationResult
                {
                    MutationType = MutationType.AtMaximum,
                    FieldName = field,
                    Description = $"Number at maximum ({atMax}): {field}",
                    MutatedPayload = atMaxMutated,
                    ExpectedStatusCodes = propSchema.ExclusiveMaximum ? [400, 422] : [200, 201],
                    IsViolation = propSchema.ExclusiveMaximum
                });
            }

            // multipleOf violation
            if (propSchema.MultipleOf.HasValue && propSchema.MultipleOf.Value > 0)
            {
                var violation = propSchema.MultipleOf.Value + 0.5m;
                var mutated = new Dictionary<string, object?>(validPayload) { [field] = violation };
                mutations.Add(new MutationResult
                {
                    MutationType = MutationType.MultipleOfViolation,
                    FieldName = field,
                    Description = $"Number not multipleOf {propSchema.MultipleOf.Value}: {field}",
                    MutatedPayload = mutated,
                    ExpectedStatusCodes = [400, 422],
                    IsViolation = true
                });
            }
        }

        return mutations;
    }

    /// <summary>
    /// Generate boundary test payloads for array fields.
    /// Tests: minItems-1, minItems, maxItems, maxItems+1
    /// </summary>
    public List<MutationResult> GenerateArrayBoundaryMutations(
        ParsedSchema schema, Dictionary<string, object?> validPayload)
    {
        var mutations = new List<MutationResult>();

        foreach (var (field, propSchema) in schema.Properties)
        {
            if (propSchema.Type?.ToLower() != "array") continue;
            if (!validPayload.ContainsKey(field)) continue;

            var itemGenerator = propSchema.Items ?? new ParsedSchema { Type = "string" };

            // minItems - 1
            if (propSchema.MinItems.HasValue && propSchema.MinItems.Value > 0)
            {
                var tooFew = Enumerable.Range(0, propSchema.MinItems.Value - 1)
                    .Select(i => _payloadBuilder.GenerateValue(itemGenerator, $"item_{i}"))
                    .ToList();
                var mutated = new Dictionary<string, object?>(validPayload) { [field] = tooFew };
                mutations.Add(new MutationResult
                {
                    MutationType = MutationType.BelowMinItems,
                    FieldName = field,
                    Description = $"Array below minItems ({propSchema.MinItems.Value - 1} < {propSchema.MinItems.Value}): {field}",
                    MutatedPayload = mutated,
                    ExpectedStatusCodes = [400, 422],
                    IsViolation = true
                });
            }

            // maxItems + 1
            if (propSchema.MaxItems.HasValue)
            {
                var tooMany = Enumerable.Range(0, propSchema.MaxItems.Value + 1)
                    .Select(i => _payloadBuilder.GenerateValue(itemGenerator, $"item_{i}"))
                    .ToList();
                var mutated = new Dictionary<string, object?>(validPayload) { [field] = tooMany };
                mutations.Add(new MutationResult
                {
                    MutationType = MutationType.AboveMaxItems,
                    FieldName = field,
                    Description = $"Array above maxItems ({propSchema.MaxItems.Value + 1} > {propSchema.MaxItems.Value}): {field}",
                    MutatedPayload = mutated,
                    ExpectedStatusCodes = [400, 422],
                    IsViolation = true
                });
            }
        }

        return mutations;
    }

    // ──────────────────────────────────────────────────
    // HELPERS
    // ──────────────────────────────────────────────────

    private static object? GetWrongTypeValue(string? expectedType)
    {
        return expectedType?.ToLower() switch
        {
            "string" => 12345,                        // send number instead of string
            "integer" or "number" => "not_a_number",  // send string instead of number
            "boolean" => "not_a_boolean",             // send string instead of bool
            "array" => "not_an_array",                // send string instead of array
            "object" => "not_an_object",              // send string instead of object
            _ => null
        };
    }
}

/// <summary>
/// Result of a single mutation applied to a valid payload
/// </summary>
public class MutationResult
{
    public MutationType MutationType { get; set; }
    public string FieldName { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public Dictionary<string, object?> MutatedPayload { get; set; } = new();
    public int[] ExpectedStatusCodes { get; set; } = [400];
    public bool IsViolation { get; set; } = true;
}

/// <summary>
/// All supported mutation types for deterministic testing
/// </summary>
public enum MutationType
{
    // Validation (P1)
    MissingRequiredField,
    WrongType,
    InvalidEnum,
    AdditionalProperty,

    // String Boundary (P2)
    BelowMinLength,
    AtMinLength,
    AboveMaxLength,
    AtMaxLength,

    // Numeric Boundary (P2)
    BelowMinimum,
    AtMinimum,
    AboveMaximum,
    AtMaximum,
    MultipleOfViolation,

    // Array Boundary (P2)
    BelowMinItems,
    AtMinItems,
    AboveMaxItems,
    AtMaxItems
}

