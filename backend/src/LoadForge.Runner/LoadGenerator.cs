using System.Collections.Concurrent;
using System.Diagnostics;
using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using LoadForge.Core.Entities;
using LoadForge.Core.Interfaces;

namespace LoadForge.Runner;

/// <summary>
/// High-performance HTTP load generator using async I/O
/// </summary>
public class LoadGenerator : IDisposable
{
    private readonly HttpClient _httpClient;
    private readonly LoadGeneratorConfig _config;
    private readonly ConcurrentQueue<RequestResult> _results;
    private readonly CancellationTokenSource _cts;
    
    private bool _isRunning;
    private int _activeVUs;
    private long _totalRequests;
    private long _failedRequests;

    public event Action<RequestResult>? OnRequestCompleted;
    public event Action<AggregatedMetrics>? OnMetricsAggregated;

    public LoadGenerator(LoadGeneratorConfig config)
    {
        _config = config;
        _results = new ConcurrentQueue<RequestResult>();
        _cts = new CancellationTokenSource();

        // Configure HttpClient for high performance
        var handler = new SocketsHttpHandler
        {
            PooledConnectionLifetime = TimeSpan.FromMinutes(5),
            PooledConnectionIdleTimeout = TimeSpan.FromMinutes(2),
            MaxConnectionsPerServer = config.MaxConnectionsPerServer,
            EnableMultipleHttp2Connections = true,
            AutomaticDecompression = DecompressionMethods.All
        };

        _httpClient = new HttpClient(handler)
        {
            Timeout = TimeSpan.FromMilliseconds(config.TimeoutMs)
        };
    }

    public async Task RunAsync(ScenarioExecution scenario, CancellationToken cancellationToken = default)
    {
        using var linkedCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken, _cts.Token);
        var token = linkedCts.Token;

        _isRunning = true;
        _activeVUs = 0;
        _totalRequests = 0;
        _failedRequests = 0;

        // Start metrics aggregation task
        var metricsTask = AggregateMetricsAsync(token);

        try
        {
            foreach (var stage in scenario.Stages.OrderBy(s => s.SortOrder))
            {
                await ExecuteStageAsync(scenario, stage, token);
            }
        }
        finally
        {
            _isRunning = false;
            await metricsTask;
        }
    }

    private async Task ExecuteStageAsync(
        ScenarioExecution scenario, 
        StageExecution stage, 
        CancellationToken cancellationToken)
    {
        var startTime = DateTime.UtcNow;
        var endTime = startTime.AddSeconds(stage.DurationSeconds);
        var startVUs = _activeVUs;
        var targetVUs = stage.TargetVUs;

        var vuTasks = new List<Task>();

        while (DateTime.UtcNow < endTime && !cancellationToken.IsCancellationRequested)
        {
            // Calculate current target VUs based on ramp strategy
            var elapsed = (DateTime.UtcNow - startTime).TotalSeconds;
            var progress = elapsed / stage.DurationSeconds;
            var currentTargetVUs = CalculateCurrentVUs(startVUs, targetVUs, progress, stage.RampStrategy);

            // Adjust VU count
            while (_activeVUs < currentTargetVUs)
            {
                var vuId = Interlocked.Increment(ref _activeVUs);
                var vuTask = RunVirtualUserAsync(scenario, vuId, cancellationToken);
                vuTasks.Add(vuTask);
            }

            await Task.Delay(100, cancellationToken); // Check every 100ms
        }

        // Wait for all VUs to complete current iteration
        _activeVUs = 0;
        await Task.WhenAll(vuTasks.Where(t => !t.IsCompleted));
    }

    private int CalculateCurrentVUs(int start, int target, double progress, RampStrategy strategy)
    {
        return strategy switch
        {
            RampStrategy.Linear => (int)(start + (target - start) * progress),
            RampStrategy.Exponential => (int)(start + (target - start) * Math.Pow(progress, 2)),
            RampStrategy.Step => progress < 0.5 ? start : target,
            RampStrategy.Immediate => target,
            _ => target
        };
    }

    private async Task RunVirtualUserAsync(
        ScenarioExecution scenario, 
        int vuId, 
        CancellationToken cancellationToken)
    {
        var random = new Random();

        while (_isRunning && !cancellationToken.IsCancellationRequested)
        {
            // Select request based on distribution
            var request = SelectRequest(scenario.Requests, scenario.Distribution, random);
            
            if (request == null) break;

            // Execute request
            var result = await ExecuteRequestAsync(request, scenario.Variables, vuId, cancellationToken);
            
            // Record result
            _results.Enqueue(result);
            OnRequestCompleted?.Invoke(result);

            Interlocked.Increment(ref _totalRequests);
            if (!result.Success)
                Interlocked.Increment(ref _failedRequests);

            // Think time
            if (scenario.ThinkTimeMaxMs > 0)
            {
                var thinkTime = random.Next(scenario.ThinkTimeMinMs, scenario.ThinkTimeMaxMs);
                await Task.Delay(thinkTime, cancellationToken);
            }
        }
    }

    private RequestExecution? SelectRequest(
        List<RequestExecution> requests, 
        RequestDistribution distribution,
        Random random)
    {
        if (requests.Count == 0) return null;

        return distribution switch
        {
            RequestDistribution.Sequential => requests[0], // Simplified for now
            RequestDistribution.Random => requests[random.Next(requests.Count)],
            RequestDistribution.Weighted => SelectWeightedRequest(requests, random),
            _ => requests[0]
        };
    }

    private RequestExecution SelectWeightedRequest(List<RequestExecution> requests, Random random)
    {
        var totalWeight = requests.Sum(r => r.Weight);
        var randomValue = random.Next(totalWeight);
        var cumulative = 0;

        foreach (var request in requests)
        {
            cumulative += request.Weight;
            if (randomValue < cumulative)
                return request;
        }

        return requests.Last();
    }

    private async Task<RequestResult> ExecuteRequestAsync(
        RequestExecution request,
        Dictionary<string, string> variables,
        int vuId,
        CancellationToken cancellationToken)
    {
        var result = new RequestResult
        {
            RequestId = request.EndpointId,
            VirtualUserId = vuId,
            Timestamp = DateTime.UtcNow
        };

        var sw = Stopwatch.StartNew();

        try
        {
            // Build URL with variable substitution
            var url = SubstituteVariables(request.Url, variables);

            // Create request
            var httpRequest = new HttpRequestMessage(
                ParseMethod(request.Method),
                url);

            // Add headers
            foreach (var header in request.Headers)
            {
                httpRequest.Headers.TryAddWithoutValidation(
                    header.Key, 
                    SubstituteVariables(header.Value, variables));
            }

            // Add body
            if (!string.IsNullOrEmpty(request.Body))
            {
                var body = SubstituteVariables(request.Body, variables);
                httpRequest.Content = new StringContent(body, Encoding.UTF8, "application/json");
            }

            // Send request
            var response = await _httpClient.SendAsync(httpRequest, cancellationToken);
            
            sw.Stop();

            result.StatusCode = (int)response.StatusCode;
            result.LatencyMs = sw.Elapsed.TotalMilliseconds;
            result.Success = response.IsSuccessStatusCode;
            result.BytesReceived = response.Content.Headers.ContentLength ?? 0;

            // Extract response for correlation (if configured)
            if (request.Extractions.Any())
            {
                var responseBody = await response.Content.ReadAsStringAsync(cancellationToken);
                result.ExtractedValues = ExtractValues(responseBody, request.Extractions);
            }
        }
        catch (TaskCanceledException)
        {
            sw.Stop();
            result.Success = false;
            result.ErrorMessage = "Request timeout";
            result.LatencyMs = sw.Elapsed.TotalMilliseconds;
        }
        catch (HttpRequestException ex)
        {
            sw.Stop();
            result.Success = false;
            result.ErrorMessage = ex.Message;
            result.LatencyMs = sw.Elapsed.TotalMilliseconds;
        }
        catch (Exception ex)
        {
            sw.Stop();
            result.Success = false;
            result.ErrorMessage = ex.Message;
            result.LatencyMs = sw.Elapsed.TotalMilliseconds;
        }

        return result;
    }

    private static string SubstituteVariables(string input, Dictionary<string, string> variables)
    {
        foreach (var kvp in variables)
        {
            input = input.Replace($"{{{{{kvp.Key}}}}}", kvp.Value);
        }
        return input;
    }

    private static System.Net.Http.HttpMethod ParseMethod(string method)
    {
        return method.ToUpperInvariant() switch
        {
            "GET" => System.Net.Http.HttpMethod.Get,
            "POST" => System.Net.Http.HttpMethod.Post,
            "PUT" => System.Net.Http.HttpMethod.Put,
            "DELETE" => System.Net.Http.HttpMethod.Delete,
            "PATCH" => System.Net.Http.HttpMethod.Patch,
            "HEAD" => System.Net.Http.HttpMethod.Head,
            "OPTIONS" => System.Net.Http.HttpMethod.Options,
            _ => System.Net.Http.HttpMethod.Get
        };
    }

    private static Dictionary<string, string> ExtractValues(
        string responseBody, 
        List<ExtractionConfig> extractions)
    {
        var values = new Dictionary<string, string>();

        try
        {
            using var doc = JsonDocument.Parse(responseBody);

            foreach (var extraction in extractions)
            {
                // Simple JSON path extraction (supports basic paths like $.data.id)
                var value = ExtractJsonPath(doc.RootElement, extraction.JsonPath);
                if (value != null)
                {
                    values[extraction.VariableName] = value;
                }
            }
        }
        catch
        {
            // Ignore extraction errors
        }

        return values;
    }

    private static string? ExtractJsonPath(JsonElement element, string path)
    {
        var parts = path.TrimStart('$', '.').Split('.');
        var current = element;

        foreach (var part in parts)
        {
            if (current.ValueKind == JsonValueKind.Object && current.TryGetProperty(part, out var next))
            {
                current = next;
            }
            else
            {
                return null;
            }
        }

        return current.ValueKind switch
        {
            JsonValueKind.String => current.GetString(),
            JsonValueKind.Number => current.GetRawText(),
            _ => current.GetRawText()
        };
    }

    private async Task AggregateMetricsAsync(CancellationToken cancellationToken)
    {
        var latencies = new List<double>();
        var interval = TimeSpan.FromSeconds(_config.AggregationIntervalSeconds);

        while (!cancellationToken.IsCancellationRequested && (_isRunning || !_results.IsEmpty))
        {
            await Task.Delay(interval, cancellationToken);

            latencies.Clear();
            var statusCodes = new Dictionary<int, int>();
            var errors = new Dictionary<string, int>();
            long requests = 0;
            long failed = 0;
            long bytesSent = 0;
            long bytesReceived = 0;

            while (_results.TryDequeue(out var result))
            {
                requests++;
                latencies.Add(result.LatencyMs);
                bytesReceived += result.BytesReceived;

                if (!result.Success)
                {
                    failed++;
                    var errorKey = result.ErrorMessage ?? "unknown";
                    errors[errorKey] = errors.GetValueOrDefault(errorKey) + 1;
                }

                var code = result.StatusCode;
                statusCodes[code] = statusCodes.GetValueOrDefault(code) + 1;
            }

            if (requests == 0) continue;

            latencies.Sort();

            var metrics = new AggregatedMetrics
            {
                Timestamp = DateTime.UtcNow,
                IntervalSeconds = _config.AggregationIntervalSeconds,
                TotalRequests = requests,
                FailedRequests = failed,
                ActiveVUs = _activeVUs,
                MinLatencyMs = latencies.FirstOrDefault(),
                MaxLatencyMs = latencies.LastOrDefault(),
                AvgLatencyMs = latencies.Average(),
                P50LatencyMs = Percentile(latencies, 0.5),
                P90LatencyMs = Percentile(latencies, 0.9),
                P95LatencyMs = Percentile(latencies, 0.95),
                P99LatencyMs = Percentile(latencies, 0.99),
                RequestsPerSecond = requests / (double)_config.AggregationIntervalSeconds,
                BytesSent = bytesSent,
                BytesReceived = bytesReceived,
                StatusCodeDistribution = statusCodes,
                ErrorDistribution = errors
            };

            OnMetricsAggregated?.Invoke(metrics);
        }
    }

    private static double Percentile(List<double> sorted, double p)
    {
        if (sorted.Count == 0) return 0;
        var index = (int)Math.Ceiling(p * sorted.Count) - 1;
        return sorted[Math.Max(0, Math.Min(index, sorted.Count - 1))];
    }

    public void Stop()
    {
        _isRunning = false;
        _cts.Cancel();
    }

    public void Dispose()
    {
        _cts.Dispose();
        _httpClient.Dispose();
    }
}

// Configuration and DTOs for the runner
public class LoadGeneratorConfig
{
    public int MaxConnectionsPerServer { get; set; } = 100;
    public int TimeoutMs { get; set; } = 30000;
    public int AggregationIntervalSeconds { get; set; } = 1;
}

public class ScenarioExecution
{
    public Guid ScenarioId { get; set; }
    public Guid RunId { get; set; }
    public RequestDistribution Distribution { get; set; }
    public int ThinkTimeMinMs { get; set; }
    public int ThinkTimeMaxMs { get; set; }
    public List<StageExecution> Stages { get; set; } = new();
    public List<RequestExecution> Requests { get; set; } = new();
    public Dictionary<string, string> Variables { get; set; } = new();
}

public class StageExecution
{
    public int SortOrder { get; set; }
    public string Name { get; set; } = string.Empty;
    public int DurationSeconds { get; set; }
    public int TargetVUs { get; set; }
    public RampStrategy RampStrategy { get; set; }
}

public class RequestExecution
{
    public Guid EndpointId { get; set; }
    public string Method { get; set; } = "GET";
    public string Url { get; set; } = string.Empty;
    public string? Body { get; set; }
    public int Weight { get; set; } = 100;
    public Dictionary<string, string> Headers { get; set; } = new();
    public List<ExtractionConfig> Extractions { get; set; } = new();
}

public class ExtractionConfig
{
    public string VariableName { get; set; } = string.Empty;
    public string JsonPath { get; set; } = string.Empty;
}

public class RequestResult
{
    public Guid RequestId { get; set; }
    public int VirtualUserId { get; set; }
    public DateTime Timestamp { get; set; }
    public double LatencyMs { get; set; }
    public int StatusCode { get; set; }
    public bool Success { get; set; }
    public long BytesSent { get; set; }
    public long BytesReceived { get; set; }
    public string? ErrorMessage { get; set; }
    public Dictionary<string, string> ExtractedValues { get; set; } = new();
}

public class AggregatedMetrics
{
    public DateTime Timestamp { get; set; }
    public int IntervalSeconds { get; set; }
    public long TotalRequests { get; set; }
    public long FailedRequests { get; set; }
    public int ActiveVUs { get; set; }
    public double MinLatencyMs { get; set; }
    public double MaxLatencyMs { get; set; }
    public double AvgLatencyMs { get; set; }
    public double P50LatencyMs { get; set; }
    public double P90LatencyMs { get; set; }
    public double P95LatencyMs { get; set; }
    public double P99LatencyMs { get; set; }
    public double RequestsPerSecond { get; set; }
    public long BytesSent { get; set; }
    public long BytesReceived { get; set; }
    public Dictionary<int, int> StatusCodeDistribution { get; set; } = new();
    public Dictionary<string, int> ErrorDistribution { get; set; } = new();
}

