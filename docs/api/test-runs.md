# API Reference - Test Runs

## Overview

The Test Runs API allows you to start, monitor, and manage performance test executions. This is the core functionality of LoadForge.

## Endpoints Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects/{projectId}/runs` | List test runs |
| POST | `/api/projects/{projectId}/runs` | Start new test run |
| GET | `/api/projects/{projectId}/runs/{runId}` | Get run details |
| POST | `/api/projects/{projectId}/runs/{runId}/stop` | Stop running test |
| POST | `/api/projects/{projectId}/runs/{runId}/set-baseline` | Mark as baseline |
| GET | `/api/projects/{projectId}/runs/{runId}/compare` | Compare to baseline |

---

## List Test Runs

Retrieve all test runs for a project with optional filtering.

```http
GET /api/projects/{projectId}/runs
Authorization: Bearer {token}
```

### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `scenarioId` | uuid | - | Filter by scenario |
| `status` | string | - | Filter by status |
| `page` | int | 1 | Page number |
| `pageSize` | int | 20 | Items per page (max 100) |

### Example Request

```bash
curl "http://localhost:5000/api/projects/550e8400.../runs?status=Completed&page=1&pageSize=10" \
  -H "Authorization: Bearer {token}"
```

### Success Response (200 OK)

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "990e8400-e29b-41d4-a716-446655440000",
        "runNumber": "RUN-20260221-0001",
        "scenarioId": "770e8400-e29b-41d4-a716-446655440000",
        "scenarioName": "API Load Test",
        "environmentName": "Production",
        "status": "Completed",
        "result": "Pass",
        "trigger": "Manual",
        "triggeredBy": "admin@example.com",
        "startedAt": "2026-02-21T10:00:00Z",
        "completedAt": "2026-02-21T10:15:00Z",
        "durationSeconds": 900,
        "isBaseline": true,
        "createdAt": "2026-02-21T09:59:55Z"
      }
    ],
    "totalCount": 45,
    "pageNumber": 1,
    "pageSize": 10,
    "totalPages": 5,
    "hasNext": true,
    "hasPrevious": false
  }
}
```

### Status Values

| Status | Description |
|--------|-------------|
| `Pending` | Run created, waiting to start |
| `Queued` | In queue for runner assignment |
| `Initializing` | Runners preparing |
| `Running` | Test in progress |
| `Stopping` | Stop requested, winding down |
| `Completed` | Test finished successfully |
| `Failed` | Test failed with errors |
| `Cancelled` | Test manually cancelled |

### Result Values

| Result | Description |
|--------|-------------|
| `Pass` | All thresholds met |
| `Fail` | One or more thresholds failed |
| `Error` | Test encountered errors |

---

## Start Test Run

Start a new performance test execution.

```http
POST /api/projects/{projectId}/runs
Authorization: Bearer {token}
Content-Type: application/json
```

### Required Role

`Developer` or higher

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `scenarioId` | uuid | ✅ | Scenario to execute |
| `environmentId` | uuid | ✅ | Target environment |

### Example Request

```bash
curl -X POST "http://localhost:5000/api/projects/550e8400.../runs" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "scenarioId": "770e8400-e29b-41d4-a716-446655440000",
    "environmentId": "880e8400-e29b-41d4-a716-446655440000"
  }'
```

### Success Response (201 Created)

```json
{
  "success": true,
  "data": {
    "id": "990e8400-e29b-41d4-a716-446655440000",
    "runNumber": "RUN-20260221-0002"
  }
}
```

### Error Responses

| Status | Error | Description |
|--------|-------|-------------|
| 400 | Concurrent limit reached | Max concurrent runs exceeded |
| 404 | Scenario not found | Invalid scenario ID |
| 404 | Environment not found | Invalid environment ID |

---

## Get Test Run Details

Retrieve detailed information about a test run including metrics.

```http
GET /api/projects/{projectId}/runs/{runId}
Authorization: Bearer {token}
```

### Example Request

```bash
curl "http://localhost:5000/api/projects/550e8400.../runs/990e8400..." \
  -H "Authorization: Bearer {token}"
```

### Success Response (200 OK)

```json
{
  "success": true,
  "data": {
    "id": "990e8400-e29b-41d4-a716-446655440000",
    "runNumber": "RUN-20260221-0001",
    "scenarioId": "770e8400-e29b-41d4-a716-446655440000",
    "scenarioName": "API Load Test",
    "environmentName": "Production",
    "status": "Completed",
    "result": "Pass",
    "trigger": "Manual",
    "triggerSource": null,
    "triggeredBy": "admin@example.com",
    "startedAt": "2026-02-21T10:00:00Z",
    "completedAt": "2026-02-21T10:15:00Z",
    "durationSeconds": 900,
    "isBaseline": true,
    "errorMessage": null,
    "thresholdResults": [
      {
        "metric": "P95Latency",
        "operator": "LessThan",
        "expectedValue": 300,
        "actualValue": 245.5,
        "passed": true
      },
      {
        "metric": "ErrorRate",
        "operator": "LessThan",
        "expectedValue": 1,
        "actualValue": 0.12,
        "passed": true
      },
      {
        "metric": "RPS",
        "operator": "GreaterThan",
        "expectedValue": 1000,
        "actualValue": 2345.6,
        "passed": true
      }
    ],
    "runners": [
      {
        "runnerId": "aaa...",
        "runnerName": "runner-1",
        "assignedVUs": 500,
        "status": "Completed",
        "totalRequests": 523456,
        "failedRequests": 234
      },
      {
        "runnerId": "bbb...",
        "runnerName": "runner-2",
        "assignedVUs": 500,
        "status": "Completed",
        "totalRequests": 518234,
        "failedRequests": 198
      }
    ],
    "metrics": [
      {
        "timestamp": "2026-02-21T10:00:00Z",
        "totalRequests": 0,
        "failedRequests": 0,
        "rps": 0,
        "avgLatencyMs": 0,
        "p50LatencyMs": 0,
        "p95LatencyMs": 0,
        "p99LatencyMs": 0,
        "activeVUs": 0
      },
      {
        "timestamp": "2026-02-21T10:00:01Z",
        "totalRequests": 156,
        "failedRequests": 0,
        "rps": 156,
        "avgLatencyMs": 45.2,
        "p50LatencyMs": 42,
        "p95LatencyMs": 89,
        "p99LatencyMs": 124,
        "activeVUs": 50
      },
      {
        "timestamp": "2026-02-21T10:00:02Z",
        "totalRequests": 312,
        "failedRequests": 1,
        "rps": 312,
        "avgLatencyMs": 48.6,
        "p50LatencyMs": 44,
        "p95LatencyMs": 95,
        "p99LatencyMs": 156,
        "activeVUs": 100
      }
    ],
    "createdAt": "2026-02-21T09:59:55Z"
  }
}
```

### Metrics Fields

| Field | Type | Description |
|-------|------|-------------|
| `timestamp` | datetime | Metric collection time |
| `totalRequests` | long | Cumulative request count |
| `failedRequests` | long | Cumulative failures |
| `rps` | double | Requests per second |
| `avgLatencyMs` | double | Average latency (ms) |
| `p50LatencyMs` | double | 50th percentile latency |
| `p95LatencyMs` | double | 95th percentile latency |
| `p99LatencyMs` | double | 99th percentile latency |
| `activeVUs` | int | Active virtual users |

---

## Stop Test Run

Stop a running test execution gracefully.

```http
POST /api/projects/{projectId}/runs/{runId}/stop
Authorization: Bearer {token}
```

### Required Role

`Developer` or higher

### Example Request

```bash
curl -X POST "http://localhost:5000/api/projects/550e8400.../runs/990e8400.../stop" \
  -H "Authorization: Bearer {token}"
```

### Success Response (200 OK)

```json
{
  "success": true,
  "data": "Stop signal sent"
}
```

### Error Responses

| Status | Error | Description |
|--------|-------|-------------|
| 400 | Test is not running | Can only stop running tests |
| 404 | Run not found | Invalid run ID |

### Stop Behavior

When stopped:
1. Runners receive stop signal
2. Current VU iterations complete
3. No new requests are started
4. Metrics are finalized
5. Status changes to `Stopping` then `Completed`

---

## Set Baseline

Mark a completed test run as the baseline for comparison.

```http
POST /api/projects/{projectId}/runs/{runId}/set-baseline
Authorization: Bearer {token}
```

### Required Role

`TeamLead` or higher

### Example Request

```bash
curl -X POST "http://localhost:5000/api/projects/550e8400.../runs/990e8400.../set-baseline" \
  -H "Authorization: Bearer {token}"
```

### Success Response (200 OK)

```json
{
  "success": true,
  "data": "Run marked as baseline"
}
```

### Behavior

- Only one baseline per scenario
- Previous baseline is automatically unset
- Only completed runs can be set as baseline

---

## Compare to Baseline

Compare a test run's metrics against the baseline.

```http
GET /api/projects/{projectId}/runs/{runId}/compare
Authorization: Bearer {token}
```

### Example Request

```bash
curl "http://localhost:5000/api/projects/550e8400.../runs/990e8400.../compare" \
  -H "Authorization: Bearer {token}"
```

### Success Response (200 OK)

```json
{
  "success": true,
  "data": {
    "runId": "990e8400-e29b-41d4-a716-446655440001",
    "baselineRunId": "990e8400-e29b-41d4-a716-446655440000",
    "baselineRunNumber": "RUN-20260220-0001",
    "metrics": {
      "p95LatencyMs": {
        "baseline": 245.5,
        "current": 289.3,
        "changePercent": 17.84
      },
      "avgLatencyMs": {
        "baseline": 45.2,
        "current": 52.1,
        "changePercent": 15.27
      },
      "rps": {
        "baseline": 2345.6,
        "current": 2156.8,
        "changePercent": -8.05
      },
      "errorRate": {
        "baseline": 0.12,
        "current": 0.45,
        "changePercent": 275.0
      }
    },
    "hasRegression": true
  }
}
```

### Regression Detection

A regression is flagged when:
- P95 latency increases by > 20%
- Error rate increases by > 20%
- RPS decreases by > 20%

---

## Real-Time Metrics (WebSocket)

Subscribe to live metrics during test execution.

### Connection

```javascript
const connection = new signalR.HubConnectionBuilder()
  .withUrl("http://localhost:5000/hubs/metrics", {
    accessTokenFactory: () => token
  })
  .build();

await connection.start();
```

### Subscribe to Run

```javascript
// Subscribe to specific run
await connection.invoke("SubscribeToRun", runId);

// Receive metrics updates
connection.on("MetricsUpdate", (metrics) => {
  console.log("RPS:", metrics.rps);
  console.log("P95:", metrics.p95LatencyMs);
  console.log("Active VUs:", metrics.activeVUs);
});

// Unsubscribe
await connection.invoke("UnsubscribeFromRun", runId);
```

### Metrics Update Payload

```json
{
  "runId": "990e8400...",
  "timestamp": "2026-02-21T10:05:23Z",
  "totalRequests": 156789,
  "failedRequests": 234,
  "rps": 2345.6,
  "avgLatencyMs": 48.2,
  "p50LatencyMs": 42,
  "p95LatencyMs": 95,
  "p99LatencyMs": 156,
  "activeVUs": 1000,
  "currentStage": "Hold Load",
  "stageProgress": 0.65
}
```

---

## CI/CD Integration

### Triggering Tests via API

```bash
#!/bin/bash
# ci-test.sh

# Start test
RESPONSE=$(curl -s -X POST "http://localhost:5000/api/projects/$PROJECT_ID/runs" \
  -H "Authorization: Bearer $API_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"scenarioId\": \"$SCENARIO_ID\", \"environmentId\": \"$ENV_ID\"}")

RUN_ID=$(echo $RESPONSE | jq -r '.data.id')
echo "Started run: $RUN_ID"

# Poll for completion
while true; do
  STATUS=$(curl -s "http://localhost:5000/api/projects/$PROJECT_ID/runs/$RUN_ID" \
    -H "Authorization: Bearer $API_TOKEN" | jq -r '.data.status')
  
  if [ "$STATUS" = "Completed" ]; then
    break
  elif [ "$STATUS" = "Failed" ]; then
    echo "Test failed!"
    exit 1
  fi
  
  echo "Status: $STATUS"
  sleep 10
done

# Check result
RESULT=$(curl -s "http://localhost:5000/api/projects/$PROJECT_ID/runs/$RUN_ID" \
  -H "Authorization: Bearer $API_TOKEN" | jq -r '.data.result')

if [ "$RESULT" != "Pass" ]; then
  echo "Performance test failed thresholds!"
  exit 1
fi

echo "Performance test passed!"
exit 0
```

### GitHub Actions Example

```yaml
name: Performance Test

on:
  push:
    branches: [main]

jobs:
  perf-test:
    runs-on: ubuntu-latest
    steps:
      - name: Run Load Test
        env:
          LOADFORGE_TOKEN: ${{ secrets.LOADFORGE_TOKEN }}
          PROJECT_ID: ${{ vars.PROJECT_ID }}
          SCENARIO_ID: ${{ vars.SCENARIO_ID }}
          ENV_ID: ${{ vars.ENV_ID }}
        run: |
          # Start test
          RUN=$(curl -s -X POST "https://api.loadforge.internal/api/projects/$PROJECT_ID/runs" \
            -H "Authorization: Bearer $LOADFORGE_TOKEN" \
            -H "Content-Type: application/json" \
            -d '{"scenarioId":"'$SCENARIO_ID'","environmentId":"'$ENV_ID'"}')
          
          RUN_ID=$(echo $RUN | jq -r '.data.id')
          
          # Wait for completion (max 30 min)
          for i in {1..180}; do
            RESULT=$(curl -s "https://api.loadforge.internal/api/projects/$PROJECT_ID/runs/$RUN_ID" \
              -H "Authorization: Bearer $LOADFORGE_TOKEN" | jq -r '.data')
            
            STATUS=$(echo $RESULT | jq -r '.status')
            
            if [ "$STATUS" = "Completed" ]; then
              PASS=$(echo $RESULT | jq -r '.result')
              if [ "$PASS" = "Pass" ]; then
                echo "✅ Performance test passed!"
                exit 0
              else
                echo "❌ Performance test failed thresholds"
                exit 1
              fi
            fi
            
            sleep 10
          done
          
          echo "❌ Test timeout"
          exit 1
```

