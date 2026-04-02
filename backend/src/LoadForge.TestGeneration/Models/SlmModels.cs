using System.Text.Json.Serialization;

namespace LoadForge.TestGeneration.Models;

/// <summary>
/// SLM (Small Language Model) output structure for business rule extraction.
/// The SLM may extract rules from PR descriptions, task text, or API documentation.
/// 
/// ALL SLM-generated tests MUST have needs_review: true.
/// These rules cannot gate CI by default.
/// 
/// STRICT: Only 6 rule types are allowed.
/// </summary>
public class SlmExtractionResult
{
    [JsonPropertyName("impacted_endpoints")]
    public List<ImpactedEndpoint> ImpactedEndpoints { get; set; } = new();

    [JsonPropertyName("rules")]
    public List<BusinessRule> Rules { get; set; } = new();

    [JsonPropertyName("confidence")]
    public decimal Confidence { get; set; }

    [JsonPropertyName("raw_input_summary")]
    public string? RawInputSummary { get; set; }
}

public class ImpactedEndpoint
{
    [JsonPropertyName("method")]
    public string Method { get; set; } = "GET";

    [JsonPropertyName("path")]
    public string Path { get; set; } = string.Empty;
}

/// <summary>
/// A structured business rule extracted by the SLM.
/// Only 6 types allowed — no other types permitted.
/// </summary>
public class BusinessRule
{
    /// <summary>
    /// comparison | conditional_required | role_restriction | 
    /// state_restriction | numeric_limit | format_validation
    /// </summary>
    [JsonPropertyName("type")]
    public string Type { get; set; } = string.Empty;

    [JsonPropertyName("left_field")]
    public string? LeftField { get; set; }

    [JsonPropertyName("operator")]
    public string? Operator { get; set; }

    [JsonPropertyName("right_field")]
    public string? RightField { get; set; }

    [JsonPropertyName("right_value")]
    public string? RightValue { get; set; }

    [JsonPropertyName("condition_field")]
    public string? ConditionField { get; set; }

    [JsonPropertyName("condition_value")]
    public string? ConditionValue { get; set; }

    [JsonPropertyName("required_field")]
    public string? RequiredField { get; set; }

    [JsonPropertyName("role")]
    public string? Role { get; set; }

    [JsonPropertyName("allowed_states")]
    public List<string>? AllowedStates { get; set; }

    [JsonPropertyName("format")]
    public string? Format { get; set; }

    [JsonPropertyName("description")]
    public string? Description { get; set; }
}

/// <summary>
/// Allowed rule types for SLM extraction. No other types permitted.
/// </summary>
public static class AllowedRuleTypes
{
    /// <summary>Field A must be > / >= / < / <= / == / != Field B or a value</summary>
    public const string Comparison = "comparison";

    /// <summary>If field X has value Y, then field Z is required</summary>
    public const string ConditionalRequired = "conditional_required";

    /// <summary>Only users with role X can perform this action</summary>
    public const string RoleRestriction = "role_restriction";

    /// <summary>Resource must be in state X to perform this action</summary>
    public const string StateRestriction = "state_restriction";

    /// <summary>Numeric field must be within business-specific limits</summary>
    public const string NumericLimit = "numeric_limit";

    /// <summary>Field must match a specific format (e.g., phone, postal code)</summary>
    public const string FormatValidation = "format_validation";

    public static readonly HashSet<string> All = new()
    {
        Comparison, ConditionalRequired, RoleRestriction,
        StateRestriction, NumericLimit, FormatValidation
    };

    public static bool IsValid(string type) => All.Contains(type);
}

