using LoadForge.TestGeneration.Models;
using Microsoft.Extensions.Logging;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;

namespace LoadForge.TestGeneration.Slm;

/// <summary>
/// SLM (Small Language Model) integration for extracting structured business rules
/// from PR descriptions, task text, or API documentation.
/// 
/// Recommended models: Llama 3.1 8B Instruct, Phi-3 7B, Mistral 7B Instruct
/// 
/// The SLM may ONLY:
///   - Extract cross-field validation rules
///   - Detect impacted endpoints
///   - Detect conditional requirements
///   - Detect role restrictions
///   - Detect state restrictions
/// 
/// The SLM must NOT:
///   - Invent endpoints
///   - Replace schema constraints
///   - Generate payloads freely
///   - Modify deterministic tests
/// </summary>
public class SlmRuleExtractor
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<SlmRuleExtractor> _logger;
    private readonly SlmConfig _config;

    public SlmRuleExtractor(HttpClient httpClient, ILogger<SlmRuleExtractor> logger, SlmConfig config)
    {
        _httpClient = httpClient;
        _logger = logger;
        _config = config;
    }

    /// <summary>
    /// Extract business rules from free-text input (PR description, task, etc.)
    /// Returns only valid, structured rules matching the allowed DSL.
    /// </summary>
    public async Task<SlmExtractionResult> ExtractRulesAsync(string inputText, List<string>? knownEndpoints = null)
    {
        var prompt = BuildPrompt(inputText, knownEndpoints);

        try
        {
            var rawResponse = await CallSlmAsync(prompt);
            var result = ParseAndValidate(rawResponse, inputText);

            _logger.LogInformation(
                "SLM extracted {RuleCount} rules from input ({Length} chars), confidence: {Confidence}",
                result.Rules.Count, inputText.Length, result.Confidence);

            return result;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "SLM extraction failed, returning empty result");
            return new SlmExtractionResult
            {
                Confidence = 0,
                RawInputSummary = inputText.Length > 200 ? inputText[..200] + "..." : inputText
            };
        }
    }

    /// <summary>
    /// Build the structured prompt for the SLM.
    /// Strictly constrains output format and allowed rule types.
    /// </summary>
    private static string BuildPrompt(string inputText, List<string>? knownEndpoints)
    {
        var endpointsContext = knownEndpoints != null && knownEndpoints.Count > 0
            ? $"Known API endpoints:\n{string.Join("\n", knownEndpoints.Select(e => $"  - {e}"))}\n\n"
            : "";

        return $@"You are a structured data extractor for API testing. Your task is to extract business rules from the following text.

{endpointsContext}INPUT TEXT:
---
{inputText}
---

RULES:
1. Only output valid JSON matching the schema below.
2. Only use these rule types: comparison, conditional_required, role_restriction, state_restriction, numeric_limit, format_validation
3. Do NOT invent endpoints that aren't mentioned or implied.
4. Do NOT generate test payloads.
5. Extract only explicit or strongly implied rules.
6. If no rules can be extracted, return empty arrays.

OUTPUT JSON SCHEMA:
{{
  ""impacted_endpoints"": [
    {{ ""method"": ""POST"", ""path"": ""/resource"" }}
  ],
  ""rules"": [
    {{
      ""type"": ""comparison"",
      ""left_field"": ""endDate"",
      ""operator"": "">"",
      ""right_field"": ""startDate"",
      ""description"": ""End date must be after start date""
    }}
  ],
  ""confidence"": 0.85
}}

ALLOWED RULE TYPES AND THEIR FIELDS:

1. comparison: left_field, operator (>, >=, <, <=, ==, !=), right_field OR right_value
2. conditional_required: condition_field, condition_value, required_field
3. role_restriction: role, description (which roles can access)
4. state_restriction: allowed_states, description (which states allow the action)
5. numeric_limit: left_field, operator, right_value, description
6. format_validation: left_field, format, description

OUTPUT ONLY THE JSON, NO OTHER TEXT:";
    }

    /// <summary>
    /// Call the SLM API endpoint (OpenAI-compatible or custom).
    /// Supports: Ollama, llama.cpp server, vLLM, or any OpenAI-compatible endpoint.
    /// </summary>
    private async Task<string> CallSlmAsync(string prompt)
    {
        var requestBody = new
        {
            model = _config.ModelName,
            messages = new[]
            {
                new { role = "system", content = "You are a structured data extractor. Output only valid JSON." },
                new { role = "user", content = prompt }
            },
            temperature = 0.1, // Low temperature for deterministic extraction
            max_tokens = 2000,
            response_format = new { type = "json_object" }
        };

        var request = new HttpRequestMessage(HttpMethod.Post, _config.Endpoint)
        {
            Content = new StringContent(
                JsonSerializer.Serialize(requestBody),
                Encoding.UTF8,
                "application/json")
        };

        if (!string.IsNullOrEmpty(_config.ApiKey))
        {
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _config.ApiKey);
        }

        var response = await _httpClient.SendAsync(request);
        response.EnsureSuccessStatusCode();

        var responseBody = await response.Content.ReadAsStringAsync();

        // Parse OpenAI-compatible response format
        using var doc = JsonDocument.Parse(responseBody);
        var root = doc.RootElement;

        if (root.TryGetProperty("choices", out var choices) &&
            choices.GetArrayLength() > 0)
        {
            var firstChoice = choices[0];
            if (firstChoice.TryGetProperty("message", out var message) &&
                message.TryGetProperty("content", out var content))
            {
                return content.GetString() ?? "{}";
            }
        }

        // Fallback: try to use entire response as content (for Ollama-style responses)
        if (root.TryGetProperty("response", out var ollamaResponse))
        {
            return ollamaResponse.GetString() ?? "{}";
        }

        return responseBody;
    }

    /// <summary>
    /// Parse and validate the SLM output. Remove any invalid rules.
    /// </summary>
    private static SlmExtractionResult ParseAndValidate(string rawJson, string originalInput)
    {
        SlmExtractionResult? result;
        try
        {
            // Strip markdown code fences if present
            var cleaned = rawJson.Trim();
            if (cleaned.StartsWith("```"))
            {
                var firstNewline = cleaned.IndexOf('\n');
                var lastFence = cleaned.LastIndexOf("```");
                if (firstNewline > 0 && lastFence > firstNewline)
                    cleaned = cleaned[(firstNewline + 1)..lastFence].Trim();
            }

            result = JsonSerializer.Deserialize<SlmExtractionResult>(cleaned,
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
        }
        catch
        {
            return new SlmExtractionResult
            {
                Confidence = 0,
                RawInputSummary = originalInput.Length > 200 ? originalInput[..200] + "..." : originalInput
            };
        }

        if (result == null)
            return new SlmExtractionResult { Confidence = 0 };

        // Validate: remove any rules with invalid types
        result.Rules = result.Rules
            .Where(r => AllowedRuleTypes.IsValid(r.Type))
            .ToList();

        // Validate: clamp confidence to 0-1
        result.Confidence = Math.Clamp(result.Confidence, 0, 1);

        result.RawInputSummary = originalInput.Length > 200 ? originalInput[..200] + "..." : originalInput;

        return result;
    }
}

/// <summary>
/// Configuration for the SLM service
/// </summary>
public class SlmConfig
{
    /// <summary>SLM API endpoint (e.g., http://localhost:11434/v1/chat/completions for Ollama)</summary>
    public string Endpoint { get; set; } = "http://localhost:11434/v1/chat/completions";

    /// <summary>Model name (e.g., llama3.1:8b-instruct, phi3, mistral)</summary>
    public string ModelName { get; set; } = "llama3.1:8b-instruct-q4_K_M";

    /// <summary>Optional API key for remote SLM services</summary>
    public string? ApiKey { get; set; }

    /// <summary>Whether SLM features are enabled</summary>
    public bool Enabled { get; set; } = false;
}

