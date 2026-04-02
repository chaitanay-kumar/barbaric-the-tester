using System.Text;
using System.Text.Json;
using System.Xml.Linq;

namespace LoadForge.TestGeneration.Reporting;

/// <summary>
/// Generates structured test reports in multiple formats:
///   - HTML (dashboard-style, with request/response evidence)
///   - JUnit XML (CI integration compatible)
///   - JSON (programmatic consumption)
/// </summary>
public class ReportGenerator
{
    // ──────────────────────────────────────────────────
    // JSON REPORT
    // ──────────────────────────────────────────────────

    /// <summary>
    /// Generate a structured JSON report from a test run.
    /// </summary>
    public string GenerateJsonReport(ReportData data)
    {
        return JsonSerializer.Serialize(data, new JsonSerializerOptions
        {
            WriteIndented = true,
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        });
    }

    // ──────────────────────────────────────────────────
    // JUNIT XML REPORT
    // ──────────────────────────────────────────────────

    /// <summary>
    /// Generate JUnit-compatible XML report for CI integration.
    /// </summary>
    public string GenerateJUnitXml(ReportData data)
    {
        var testsuites = new XElement("testsuites",
            new XAttribute("name", data.SuiteName),
            new XAttribute("tests", data.TotalTests),
            new XAttribute("failures", data.FailedTests),
            new XAttribute("errors", 0),
            new XAttribute("skipped", data.SkippedTests),
            new XAttribute("time", data.DurationSeconds)
        );

        // Group test cases by coverage category
        var grouped = data.Executions.GroupBy(e => e.CoverageCategory);

        foreach (var group in grouped)
        {
            var testsuite = new XElement("testsuite",
                new XAttribute("name", group.Key),
                new XAttribute("tests", group.Count()),
                new XAttribute("failures", group.Count(e => e.Status == "Failed")),
                new XAttribute("errors", 0),
                new XAttribute("skipped", group.Count(e => e.Status == "Skipped")),
                new XAttribute("time", group.Sum(e => e.DurationMs) / 1000.0)
            );

            foreach (var exec in group)
            {
                var testcase = new XElement("testcase",
                    new XAttribute("name", exec.TestName),
                    new XAttribute("classname", $"{exec.Method} {exec.Path}"),
                    new XAttribute("time", exec.DurationMs / 1000.0)
                );

                if (exec.Status == "Failed")
                {
                    var failure = new XElement("failure",
                        new XAttribute("message", exec.ErrorMessage ?? "Assertion failed"),
                        new XAttribute("type", "AssertionFailure")
                    );

                    // Add assertion details as content
                    if (exec.AssertionFailures.Count > 0)
                    {
                        var details = string.Join("\n", exec.AssertionFailures.Select(a =>
                            $"[{a.Type}] Expected: {a.Expected}, Actual: {a.Actual}"));
                        failure.Value = details;
                    }

                    testcase.Add(failure);
                }
                else if (exec.Status == "Skipped")
                {
                    testcase.Add(new XElement("skipped",
                        new XAttribute("message", exec.ErrorMessage ?? "Dependency failed")));
                }

                // System output with request/response evidence
                if (exec.RequestSummary != null || exec.ResponseSummary != null)
                {
                    var output = new StringBuilder();
                    if (exec.RequestSummary != null)
                        output.AppendLine($"REQUEST:\n{exec.RequestSummary}");
                    if (exec.ResponseSummary != null)
                        output.AppendLine($"\nRESPONSE ({exec.ResponseStatusCode}):\n{exec.ResponseSummary}");
                    testcase.Add(new XElement("system-out", output.ToString()));
                }

                testsuite.Add(testcase);
            }

            testsuites.Add(testsuite);
        }

        return new XDocument(new XDeclaration("1.0", "utf-8", null), testsuites).ToString();
    }

    // ──────────────────────────────────────────────────
    // HTML REPORT
    // ──────────────────────────────────────────────────

    /// <summary>
    /// Generate a self-contained HTML report with dashboard, evidence, and filtering.
    /// </summary>
    public string GenerateHtmlReport(ReportData data)
    {
        var sb = new StringBuilder();

        sb.AppendLine("<!DOCTYPE html>");
        sb.AppendLine("<html lang='en'><head><meta charset='UTF-8'>");
        sb.AppendLine("<meta name='viewport' content='width=device-width, initial-scale=1.0'>");
        sb.AppendLine($"<title>Test Report - {Escape(data.SuiteName)}</title>");
        sb.AppendLine(GetHtmlStyles());
        sb.AppendLine("</head><body>");

        // Header
        sb.AppendLine("<div class='header'>");
        sb.AppendLine($"<h1>📋 Test Report</h1>");
        sb.AppendLine($"<p class='suite-name'>{Escape(data.SuiteName)}</p>");
        sb.AppendLine($"<p class='timestamp'>Generated: {data.GeneratedAt:yyyy-MM-dd HH:mm:ss} UTC</p>");
        sb.AppendLine("</div>");

        // Summary Cards
        var statusClass = data.FailedTests == 0 ? "passed" : "failed";
        sb.AppendLine("<div class='summary'>");
        sb.AppendLine($"<div class='summary-card status-{statusClass}'>");
        sb.AppendLine($"<span class='big-number'>{data.PassRate:F1}%</span><span class='label'>Pass Rate</span></div>");
        sb.AppendLine($"<div class='summary-card'><span class='big-number'>{data.TotalTests}</span><span class='label'>Total Tests</span></div>");
        sb.AppendLine($"<div class='summary-card passed'><span class='big-number'>{data.PassedTests}</span><span class='label'>Passed</span></div>");
        sb.AppendLine($"<div class='summary-card failed'><span class='big-number'>{data.FailedTests}</span><span class='label'>Failed</span></div>");
        sb.AppendLine($"<div class='summary-card skipped'><span class='big-number'>{data.SkippedTests}</span><span class='label'>Skipped</span></div>");
        sb.AppendLine($"<div class='summary-card'><span class='big-number'>{data.DurationSeconds}s</span><span class='label'>Duration</span></div>");
        sb.AppendLine("</div>");

        // Coverage Breakdown
        sb.AppendLine("<div class='section'><h2>Coverage Breakdown</h2><div class='coverage-grid'>");
        foreach (var cat in data.Executions.GroupBy(e => e.CoverageCategory))
        {
            var catPassed = cat.Count(e => e.Status == "Passed");
            var catTotal = cat.Count();
            var catRate = catTotal > 0 ? (decimal)catPassed / catTotal * 100 : 0;
            sb.AppendLine($"<div class='coverage-item'><span class='cat-name'>{Escape(cat.Key)}</span>");
            sb.AppendLine($"<span class='cat-stat'>{catPassed}/{catTotal} ({catRate:F0}%)</span></div>");
        }
        sb.AppendLine("</div></div>");

        // Severity Breakdown
        sb.AppendLine("<div class='section'><h2>Severity Breakdown</h2><div class='severity-grid'>");
        foreach (var sev in data.Executions.GroupBy(e => e.Severity).OrderBy(g => g.Key))
        {
            var sevPassed = sev.Count(e => e.Status == "Passed");
            var sevTotal = sev.Count();
            sb.AppendLine($"<div class='severity-item sev-{sev.Key.ToLower()}'>");
            sb.AppendLine($"<span class='sev-badge'>{Escape(sev.Key)}</span>");
            sb.AppendLine($"<span>{sevPassed}/{sevTotal} passed</span></div>");
        }
        sb.AppendLine("</div></div>");

        // Failed Tests (detailed)
        var failedTests = data.Executions.Where(e => e.Status == "Failed").ToList();
        if (failedTests.Count > 0)
        {
            sb.AppendLine("<div class='section'><h2>❌ Failed Tests</h2>");
            foreach (var exec in failedTests)
            {
                sb.AppendLine("<div class='test-card failed'>");
                sb.AppendLine($"<div class='test-header'>");
                sb.AppendLine($"<span class='method method-{exec.Method.ToLower()}'>{Escape(exec.Method)}</span>");
                sb.AppendLine($"<span class='path'>{Escape(exec.Path)}</span>");
                sb.AppendLine($"<span class='sev-badge sev-{exec.Severity.ToLower()}'>{Escape(exec.Severity)}</span>");
                sb.AppendLine($"<span class='duration'>{exec.DurationMs}ms</span>");
                sb.AppendLine($"<span class='status-code'>HTTP {exec.ResponseStatusCode}</span>");
                sb.AppendLine("</div>");
                sb.AppendLine($"<div class='test-name'>{Escape(exec.TestName)}</div>");

                if (exec.ErrorMessage != null)
                    sb.AppendLine($"<div class='error-msg'>Error: {Escape(exec.ErrorMessage)}</div>");

                // Assertion Failures
                if (exec.AssertionFailures.Count > 0)
                {
                    sb.AppendLine("<div class='assertions'><h4>Assertion Failures</h4><table>");
                    sb.AppendLine("<tr><th>Type</th><th>Expression</th><th>Expected</th><th>Actual</th></tr>");
                    foreach (var a in exec.AssertionFailures)
                    {
                        sb.AppendLine($"<tr><td>{Escape(a.Type)}</td><td>{Escape(a.Expression ?? "")}</td><td>{Escape(a.Expected)}</td><td>{Escape(a.Actual)}</td></tr>");
                    }
                    sb.AppendLine("</table></div>");
                }

                // Evidence
                AppendEvidence(sb, exec);
                sb.AppendLine("</div>");
            }
            sb.AppendLine("</div>");
        }

        // Passed Tests (collapsed)
        var passedTests = data.Executions.Where(e => e.Status == "Passed").ToList();
        if (passedTests.Count > 0)
        {
            sb.AppendLine("<div class='section'><h2>✅ Passed Tests</h2>");
            sb.AppendLine("<table class='results-table'><tr><th>Severity</th><th>Method</th><th>Path</th><th>Name</th><th>Status</th><th>Duration</th></tr>");
            foreach (var exec in passedTests)
            {
                sb.AppendLine($"<tr><td><span class='sev-badge sev-{exec.Severity.ToLower()}'>{Escape(exec.Severity)}</span></td>");
                sb.AppendLine($"<td><span class='method method-{exec.Method.ToLower()}'>{Escape(exec.Method)}</span></td>");
                sb.AppendLine($"<td class='path'>{Escape(exec.Path)}</td>");
                sb.AppendLine($"<td>{Escape(exec.TestName)}</td>");
                sb.AppendLine($"<td>HTTP {exec.ResponseStatusCode}</td>");
                sb.AppendLine($"<td>{exec.DurationMs}ms</td></tr>");
            }
            sb.AppendLine("</table></div>");
        }

        // Skipped Tests
        var skippedTests = data.Executions.Where(e => e.Status == "Skipped").ToList();
        if (skippedTests.Count > 0)
        {
            sb.AppendLine("<div class='section'><h2>⏭️ Skipped Tests</h2><ul>");
            foreach (var exec in skippedTests)
                sb.AppendLine($"<li>{Escape(exec.TestName)}: {Escape(exec.ErrorMessage ?? "Dependency failed")}</li>");
            sb.AppendLine("</ul></div>");
        }

        sb.AppendLine("<div class='footer'>Generated by LoadForge API Testing Platform</div>");
        sb.AppendLine("</body></html>");

        return sb.ToString();
    }

    private static void AppendEvidence(StringBuilder sb, ReportExecution exec)
    {
        if (exec.RequestSummary != null || exec.ResponseSummary != null)
        {
            sb.AppendLine("<div class='evidence'>");
            if (exec.CorrelationId != null)
                sb.AppendLine($"<div class='correlation'>Correlation ID: <code>{Escape(exec.CorrelationId)}</code></div>");
            if (exec.RequestSummary != null)
            {
                sb.AppendLine("<details><summary>📤 Request</summary>");
                sb.AppendLine($"<pre>{Escape(exec.RequestSummary)}</pre></details>");
            }
            if (exec.ResponseSummary != null)
            {
                sb.AppendLine("<details><summary>📥 Response</summary>");
                sb.AppendLine($"<pre>{Escape(exec.ResponseSummary)}</pre></details>");
            }
            sb.AppendLine("</div>");
        }
    }

    private static string Escape(string text) =>
        text.Replace("&", "&amp;").Replace("<", "&lt;").Replace(">", "&gt;").Replace("\"", "&quot;");

    private static string GetHtmlStyles() => @"<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; color: #1e293b; line-height: 1.5; padding: 24px; }
.header { text-align: center; margin-bottom: 32px; }
.header h1 { font-size: 28px; margin-bottom: 4px; }
.suite-name { font-size: 16px; color: #64748b; }
.timestamp { font-size: 12px; color: #94a3b8; }
.summary { display: flex; gap: 16px; flex-wrap: wrap; justify-content: center; margin-bottom: 32px; }
.summary-card { background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; text-align: center; min-width: 120px; }
.summary-card .big-number { display: block; font-size: 32px; font-weight: 700; }
.summary-card .label { font-size: 12px; color: #64748b; text-transform: uppercase; }
.summary-card.passed .big-number { color: #16a34a; }
.summary-card.failed .big-number { color: #dc2626; }
.summary-card.skipped .big-number { color: #9ca3af; }
.summary-card.status-passed { border-left: 4px solid #16a34a; }
.summary-card.status-failed { border-left: 4px solid #dc2626; }
.section { background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; margin-bottom: 24px; }
.section h2 { font-size: 18px; margin-bottom: 16px; }
.coverage-grid, .severity-grid { display: flex; gap: 12px; flex-wrap: wrap; }
.coverage-item, .severity-item { background: #f8fafc; padding: 8px 16px; border-radius: 8px; }
.cat-name { font-weight: 600; margin-right: 8px; }
.sev-badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; }
.sev-p0 { background: #fee2e2; color: #991b1b; }
.sev-p1 { background: #fef3c7; color: #92400e; }
.sev-p2 { background: #e0e7ff; color: #3730a3; }
.test-card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 12px; }
.test-card.failed { border-left: 4px solid #dc2626; }
.test-header { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 8px; }
.test-name { font-size: 14px; color: #475569; margin-bottom: 8px; }
.method { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; }
.method-get { background: #dcfce7; color: #166534; }
.method-post { background: #fef3c7; color: #92400e; }
.method-put { background: #dbeafe; color: #1e40af; }
.method-patch { background: #e0e7ff; color: #3730a3; }
.method-delete { background: #fee2e2; color: #991b1b; }
.path { font-family: monospace; font-size: 13px; color: #475569; }
.duration { font-size: 12px; color: #94a3b8; }
.status-code { font-family: monospace; font-size: 12px; font-weight: 600; }
.error-msg { background: #fef2f2; color: #991b1b; padding: 8px 12px; border-radius: 6px; font-size: 13px; margin-bottom: 8px; }
.assertions table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 8px; }
.assertions th { background: #f8fafc; padding: 6px 10px; text-align: left; border-bottom: 2px solid #e2e8f0; }
.assertions td { padding: 6px 10px; border-bottom: 1px solid #f1f5f9; }
.evidence { margin-top: 12px; }
.correlation { font-size: 12px; color: #64748b; margin-bottom: 8px; }
.correlation code { background: #f1f5f9; padding: 2px 6px; border-radius: 3px; }
details { margin-top: 8px; }
summary { cursor: pointer; font-size: 13px; font-weight: 500; color: #4f46e5; }
pre { background: #1e293b; color: #e2e8f0; padding: 12px; border-radius: 6px; font-size: 11px; overflow-x: auto; white-space: pre-wrap; word-break: break-all; max-height: 300px; overflow-y: auto; margin-top: 8px; }
.results-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.results-table th { background: #f8fafc; padding: 8px 12px; text-align: left; border-bottom: 2px solid #e2e8f0; font-size: 11px; text-transform: uppercase; color: #64748b; }
.results-table td { padding: 8px 12px; border-bottom: 1px solid #f1f5f9; }
.footer { text-align: center; padding: 24px; color: #94a3b8; font-size: 12px; }
</style>";
}

// ──────────────────────────────────────────────────
// REPORT DATA MODELS
// ──────────────────────────────────────────────────

/// <summary>
/// Structured data for report generation (format-agnostic).
/// </summary>
public class ReportData
{
    public string SuiteName { get; set; } = "API Test Suite";
    public string? EnvironmentName { get; set; }
    public string? BaseUrl { get; set; }
    public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;
    public int TotalTests { get; set; }
    public int PassedTests { get; set; }
    public int FailedTests { get; set; }
    public int SkippedTests { get; set; }
    public decimal PassRate { get; set; }
    public long DurationSeconds { get; set; }
    public List<ReportExecution> Executions { get; set; } = new();
}

/// <summary>
/// A single test execution for report rendering.
/// </summary>
public class ReportExecution
{
    public string TestName { get; set; } = string.Empty;
    public string Method { get; set; } = "GET";
    public string Path { get; set; } = string.Empty;
    public string Severity { get; set; } = "P1";
    public string CoverageCategory { get; set; } = "Smoke";
    public string Status { get; set; } = "Passed";
    public int ResponseStatusCode { get; set; }
    public long DurationMs { get; set; }
    public string? CorrelationId { get; set; }
    public string? ErrorMessage { get; set; }
    public string? RequestSummary { get; set; }
    public string? ResponseSummary { get; set; }
    public int RetryCount { get; set; }
    public List<ReportAssertionFailure> AssertionFailures { get; set; } = new();
}

/// <summary>
/// A failed assertion for report rendering.
/// </summary>
public class ReportAssertionFailure
{
    public string Type { get; set; } = string.Empty;
    public string? Expression { get; set; }
    public string Expected { get; set; } = string.Empty;
    public string Actual { get; set; } = string.Empty;
}

