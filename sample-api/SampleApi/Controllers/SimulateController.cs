using Microsoft.AspNetCore.Mvc;

namespace SampleApi.Controllers;

/// <summary>
/// Simulate API - endpoints that simulate real-world latency and errors for load testing
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class SimulateController : ControllerBase
{
    /// <summary>
    /// GET /api/simulate/fast - Fast response (~1ms)
    /// </summary>
    [HttpGet("fast")]
    public IActionResult Fast()
    {
        return Ok(new { message = "Fast response", timestamp = DateTime.UtcNow });
    }

    /// <summary>
    /// GET /api/simulate/slow?ms=500 - Simulated slow response
    /// </summary>
    [HttpGet("slow")]
    public async Task<IActionResult> Slow([FromQuery] int ms = 500)
    {
        ms = Math.Clamp(ms, 50, 10000);
        await Task.Delay(ms);
        return Ok(new { message = $"Slow response ({ms}ms)", delayMs = ms, timestamp = DateTime.UtcNow });
    }

    /// <summary>
    /// GET /api/simulate/random-latency?min=50&max=2000 - Random latency
    /// </summary>
    [HttpGet("random-latency")]
    public async Task<IActionResult> RandomLatency([FromQuery] int min = 50, [FromQuery] int max = 2000)
    {
        var delay = Random.Shared.Next(min, max);
        await Task.Delay(delay);
        return Ok(new { message = "Random latency response", delayMs = delay, timestamp = DateTime.UtcNow });
    }

    /// <summary>
    /// GET /api/simulate/error-rate?rate=10 - Randomly returns errors (rate = %)
    /// </summary>
    [HttpGet("error-rate")]
    public IActionResult ErrorRate([FromQuery] int rate = 10)
    {
        rate = Math.Clamp(rate, 0, 100);
        if (Random.Shared.Next(100) < rate)
        {
            return StatusCode(500, new { error = "Simulated server error", rate, timestamp = DateTime.UtcNow });
        }
        return Ok(new { message = "Success", errorRate = rate, timestamp = DateTime.UtcNow });
    }

    /// <summary>
    /// GET /api/simulate/status/{code} - Returns specific HTTP status code
    /// </summary>
    [HttpGet("status/{code}")]
    public IActionResult Status(int code)
    {
        return StatusCode(code, new { statusCode = code, message = $"Returned status {code}", timestamp = DateTime.UtcNow });
    }

    /// <summary>
    /// POST /api/simulate/echo - Echo back the request body
    /// </summary>
    [HttpPost("echo")]
    public IActionResult Echo([FromBody] object body)
    {
        return Ok(new { echo = body, timestamp = DateTime.UtcNow });
    }

    /// <summary>
    /// GET /api/simulate/payload?sizeKb=10 - Returns response of specific size
    /// </summary>
    [HttpGet("payload")]
    public IActionResult Payload([FromQuery] int sizeKb = 10)
    {
        sizeKb = Math.Clamp(sizeKb, 1, 1024);
        var data = new string('X', sizeKb * 1024);
        return Ok(new { sizeKb, data, timestamp = DateTime.UtcNow });
    }

    /// <summary>
    /// GET /api/simulate/cpu?iterations=1000000 - CPU-intensive operation
    /// </summary>
    [HttpGet("cpu")]
    public IActionResult CpuIntensive([FromQuery] int iterations = 1000000)
    {
        iterations = Math.Clamp(iterations, 1000, 50000000);
        double result = 0;
        for (int i = 0; i < iterations; i++)
        {
            result += Math.Sqrt(i) * Math.Sin(i);
        }
        return Ok(new { message = "CPU-intensive done", iterations, result = Math.Round(result, 4), timestamp = DateTime.UtcNow });
    }
}

