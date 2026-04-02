# Operations Guide - Monitoring & Observability

## Overview

Effective monitoring is critical for operating LoadForge in production. This guide covers setting up comprehensive observability including metrics, logging, tracing, and alerting.

## Observability Stack

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       OBSERVABILITY ARCHITECTURE                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌───────────────────────────────────────────────────────────────┐     │
│  │                        DATA SOURCES                            │     │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐          │     │
│  │  │   API   │  │ Workers │  │ Runners │  │   DB    │          │     │
│  │  │ metrics │  │ metrics │  │ metrics │  │ metrics │          │     │
│  │  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘          │     │
│  └───────┼────────────┼────────────┼────────────┼────────────────┘     │
│          │            │            │            │                       │
│          └────────────┴────────────┴────────────┘                       │
│                              │                                           │
│                              ▼                                           │
│  ┌───────────────────────────────────────────────────────────────┐     │
│  │                       COLLECTION                               │     │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐           │     │
│  │  │ Prometheus  │  │   Loki      │  │   Jaeger    │           │     │
│  │  │  (Metrics)  │  │   (Logs)    │  │  (Traces)   │           │     │
│  │  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘           │     │
│  └─────────┼────────────────┼────────────────┼───────────────────┘     │
│            │                │                │                          │
│            └────────────────┴────────────────┘                          │
│                              │                                           │
│                              ▼                                           │
│  ┌───────────────────────────────────────────────────────────────┐     │
│  │                     VISUALIZATION                              │     │
│  │  ┌─────────────────────────────────────────────────────────┐ │     │
│  │  │                      GRAFANA                             │ │     │
│  │  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐   │ │     │
│  │  │  │Overview │  │   API   │  │ Runners │  │  Alerts │   │ │     │
│  │  │  │Dashboard│  │Dashboard│  │Dashboard│  │Dashboard│   │ │     │
│  │  │  └─────────┘  └─────────┘  └─────────┘  └─────────┘   │ │     │
│  │  └─────────────────────────────────────────────────────────┘ │     │
│  └───────────────────────────────────────────────────────────────┘     │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Prometheus Metrics

### Metrics Endpoint

LoadForge exposes Prometheus metrics at `/metrics`:

```bash
curl http://localhost:5000/metrics
```

### Available Metrics

#### API Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `loadforge_http_requests_total` | Counter | Total HTTP requests |
| `loadforge_http_request_duration_seconds` | Histogram | Request latency |
| `loadforge_http_requests_in_progress` | Gauge | Current active requests |

#### Test Run Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `loadforge_runs_total` | Counter | Total test runs |
| `loadforge_runs_active` | Gauge | Currently running tests |
| `loadforge_runs_duration_seconds` | Histogram | Test duration |

#### Runner Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `loadforge_runners_total` | Gauge | Total registered runners |
| `loadforge_runners_online` | Gauge | Online runners |
| `loadforge_runners_active_vus` | Gauge | Total active VUs |
| `loadforge_runner_requests_total` | Counter | Requests generated |
| `loadforge_runner_request_duration_seconds` | Histogram | Target latency |

#### Database Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `loadforge_db_connections_total` | Gauge | Connection pool size |
| `loadforge_db_connections_active` | Gauge | Active connections |
| `loadforge_db_query_duration_seconds` | Histogram | Query latency |

### Prometheus Configuration

```yaml
# prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

alerting:
  alertmanagers:
    - static_configs:
        - targets:
            - alertmanager:9093

rule_files:
  - "/etc/prometheus/rules/*.yml"

scrape_configs:
  - job_name: 'loadforge-api'
    static_configs:
      - targets: ['api:8080']
    metrics_path: /metrics
    scheme: http

  - job_name: 'loadforge-runners'
    static_configs:
      - targets: ['runner-1:8081', 'runner-2:8081', 'runner-3:8081']
    metrics_path: /metrics

  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres-exporter:9187']

  - job_name: 'redis'
    static_configs:
      - targets: ['redis-exporter:9121']
```

---

## Grafana Dashboards

### Dashboard: Platform Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│  LoadForge Platform Overview                                    🔄 5m  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌────────────────┐ ┌────────────────┐ ┌────────────────┐ ┌────────────┐│
│  │ Active Tests   │ │ Online Runners │ │ Active VUs     │ │ Error Rate ││
│  │      12        │ │       8        │ │    45,000      │ │   0.12%    ││
│  │   ▲ +2 (1h)    │ │   ● All OK     │ │   ▲ +5k        │ │   ▼ -0.05% ││
│  └────────────────┘ └────────────────┘ └────────────────┘ └────────────┘│
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │  Requests per Second (24h)                                          ││
│  │   RPS                                                               ││
│  │  50k ├─────────────────────────────────────────────────────────    ││
│  │      │    ╭──╮      ╭────────╮                    ╭────╮           ││
│  │  25k │───╯    ╰────╯          ╰──────────────────╯      ╰────     ││
│  │      │                                                              ││
│  │    0 ├──────────────────────────────────────────────────────────   ││
│  │      00:00    04:00    08:00    12:00    16:00    20:00    24:00   ││
│  └─────────────────────────────────────────────────────────────────────┘│
│                                                                          │
│  ┌────────────────────────────────┐ ┌────────────────────────────────┐ │
│  │  Latency Distribution          │ │  Error Distribution            │ │
│  │  P50: 42ms   P95: 156ms       │ │  Timeout: 45%                  │ │
│  │  P90: 98ms   P99: 312ms       │ │  5xx: 35%                      │ │
│  │                                │ │  Connection: 20%               │ │
│  └────────────────────────────────┘ └────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

### Dashboard JSON Export

```json
{
  "dashboard": {
    "title": "LoadForge Platform Overview",
    "panels": [
      {
        "title": "Active Tests",
        "type": "stat",
        "targets": [
          {
            "expr": "loadforge_runs_active",
            "legendFormat": "Active"
          }
        ]
      },
      {
        "title": "Requests per Second",
        "type": "graph",
        "targets": [
          {
            "expr": "sum(rate(loadforge_runner_requests_total[1m]))",
            "legendFormat": "RPS"
          }
        ]
      },
      {
        "title": "Latency Percentiles",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.50, rate(loadforge_runner_request_duration_seconds_bucket[5m]))",
            "legendFormat": "P50"
          },
          {
            "expr": "histogram_quantile(0.95, rate(loadforge_runner_request_duration_seconds_bucket[5m]))",
            "legendFormat": "P95"
          },
          {
            "expr": "histogram_quantile(0.99, rate(loadforge_runner_request_duration_seconds_bucket[5m]))",
            "legendFormat": "P99"
          }
        ]
      }
    ]
  }
}
```

---

## Alerting

### Alert Rules

```yaml
# prometheus/rules/loadforge.yml
groups:
  - name: loadforge
    rules:
      # High Error Rate
      - alert: HighErrorRate
        expr: |
          sum(rate(loadforge_runner_requests_total{status="error"}[5m])) 
          / sum(rate(loadforge_runner_requests_total[5m])) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value | humanizePercentage }} (threshold: 5%)"

      # Runner Offline
      - alert: RunnerOffline
        expr: loadforge_runners_online < loadforge_runners_total
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "Runner(s) offline"
          description: "{{ $value }} runners are offline"

      # High API Latency
      - alert: HighAPILatency
        expr: |
          histogram_quantile(0.95, 
            rate(loadforge_http_request_duration_seconds_bucket[5m])
          ) > 0.5
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High API latency"
          description: "P95 latency is {{ $value | humanizeDuration }}"

      # Database Connection Pool Exhausted
      - alert: DatabaseConnectionPoolExhausted
        expr: |
          loadforge_db_connections_active 
          / loadforge_db_connections_total > 0.9
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Database connection pool near exhaustion"
          description: "{{ $value | humanizePercentage }} of connections in use"

      # No Active Runners
      - alert: NoActiveRunners
        expr: loadforge_runners_online == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "No runners available"
          description: "All runners are offline"

      # Test Stuck
      - alert: TestStuck
        expr: |
          loadforge_runs_active > 0 
          and increase(loadforge_runner_requests_total[5m]) == 0
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Test appears stuck"
          description: "Active test with no requests in 5 minutes"
```

### Alertmanager Configuration

```yaml
# alertmanager.yml
global:
  resolve_timeout: 5m

route:
  group_by: ['alertname', 'severity']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 1h
  receiver: 'default'
  routes:
    - match:
        severity: critical
      receiver: 'critical-alerts'
    - match:
        severity: warning
      receiver: 'warning-alerts'

receivers:
  - name: 'default'
    email_configs:
      - to: 'ops@yourcompany.com'

  - name: 'critical-alerts'
    slack_configs:
      - channel: '#loadforge-alerts'
        send_resolved: true
        title: '🚨 {{ .GroupLabels.alertname }}'
        text: '{{ .CommonAnnotations.description }}'
    pagerduty_configs:
      - service_key: '<pagerduty-key>'

  - name: 'warning-alerts'
    slack_configs:
      - channel: '#loadforge-alerts'
        send_resolved: true
        title: '⚠️ {{ .GroupLabels.alertname }}'
        text: '{{ .CommonAnnotations.description }}'
```

---

## Logging

### Log Format

All LoadForge components output structured JSON logs:

```json
{
  "timestamp": "2026-02-21T10:15:30.123Z",
  "level": "Information",
  "messageTemplate": "Test run {RunId} completed with result {Result}",
  "properties": {
    "RunId": "990e8400-e29b-41d4-a716-446655440000",
    "Result": "Pass",
    "Duration": 900,
    "TotalRequests": 1523456,
    "ErrorRate": 0.12
  },
  "traceId": "abc123",
  "spanId": "def456"
}
```

### Log Levels

| Level | Usage |
|-------|-------|
| `Trace` | Detailed debugging (disabled in prod) |
| `Debug` | Development debugging |
| `Information` | Normal operations |
| `Warning` | Potential issues |
| `Error` | Operation failures |
| `Critical` | System failures |

### Loki Configuration

```yaml
# loki/loki-config.yml
auth_enabled: false

server:
  http_listen_port: 3100

ingester:
  lifecycler:
    ring:
      kvstore:
        store: inmemory
      replication_factor: 1

schema_config:
  configs:
    - from: 2020-10-24
      store: boltdb-shipper
      object_store: filesystem
      schema: v11
      index:
        prefix: index_
        period: 24h

storage_config:
  boltdb_shipper:
    active_index_directory: /loki/index
    cache_location: /loki/cache
  filesystem:
    directory: /loki/chunks

limits_config:
  enforce_metric_name: false
  reject_old_samples: true
  reject_old_samples_max_age: 168h

chunk_store_config:
  max_look_back_period: 0s
```

### Promtail Configuration

```yaml
# promtail/promtail-config.yml
server:
  http_listen_port: 9080

positions:
  filename: /tmp/positions.yaml

clients:
  - url: http://loki:3100/loki/api/v1/push

scrape_configs:
  - job_name: loadforge
    static_configs:
      - targets:
          - localhost
        labels:
          app: loadforge
          __path__: /var/log/loadforge/*.log
    pipeline_stages:
      - json:
          expressions:
            level: level
            message: messageTemplate
            runId: properties.RunId
      - labels:
          level:
          runId:
```

### Useful Log Queries (LogQL)

```logql
# All errors in the last hour
{app="loadforge"} |= "Error" | json

# Errors for specific test run
{app="loadforge", runId="990e8400..."} | json | level="Error"

# Slow database queries
{app="loadforge"} | json | properties_Duration > 1000

# Authentication failures
{app="loadforge"} |= "authentication" |= "failed"

# Runner connection issues
{app="loadforge"} |= "runner" |= "disconnect"
```

---

## Health Checks

### Health Endpoint

```bash
# Basic health check
curl http://localhost:5000/health
# Response: {"status": "Healthy"}

# Detailed health check
curl http://localhost:5000/health/ready
# Response:
{
  "status": "Healthy",
  "checks": {
    "database": "Healthy",
    "redis": "Healthy",
    "runners": "Healthy"
  }
}
```

### Kubernetes Probes

```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 8080
  initialDelaySeconds: 30
  periodSeconds: 10
  failureThreshold: 3

readinessProbe:
  httpGet:
    path: /health/ready
    port: 8080
  initialDelaySeconds: 5
  periodSeconds: 5
  failureThreshold: 3
```

---

## Runbook

### High Error Rate

**Symptoms:**
- Alert: `HighErrorRate`
- Dashboard shows error spike

**Investigation:**
```bash
# Check error distribution
curl -s http://prometheus:9090/api/v1/query?query=sum(rate(loadforge_runner_requests_total{status="error"}[5m]))by(error_type)

# Check target system health
curl -s http://target-api/health

# Check runner logs
kubectl logs -l app=loadforge-runner --tail=100 | grep -i error
```

**Resolution:**
1. Check if target system is overloaded
2. Reduce VU count if necessary
3. Check for network issues
4. Review target system logs

### Runner Offline

**Symptoms:**
- Alert: `RunnerOffline`
- Dashboard shows reduced runner count

**Investigation:**
```bash
# Check runner status
kubectl get pods -l app=loadforge-runner

# Check runner logs
kubectl logs <runner-pod> --previous

# Check runner metrics
curl http://runner-1:8081/metrics
```

**Resolution:**
1. Check runner pod status
2. Review resource limits
3. Check network connectivity
4. Restart unhealthy runners

### Database Issues

**Symptoms:**
- High API latency
- Connection pool alerts

**Investigation:**
```bash
# Check connection pool
curl -s http://api:8080/metrics | grep db_connections

# Check slow queries
kubectl exec -it postgres-0 -- psql -U loadforge -c "SELECT * FROM pg_stat_activity WHERE state = 'active';"

# Check table sizes
kubectl exec -it postgres-0 -- psql -U loadforge -c "SELECT relname, pg_size_pretty(pg_total_relation_size(relid)) FROM pg_catalog.pg_statio_user_tables ORDER BY pg_total_relation_size(relid) DESC;"
```

**Resolution:**
1. Increase connection pool size
2. Add database indexes
3. Scale database resources
4. Archive old data

