# User Guide - Building Test Scenarios

## Overview

Scenarios are the heart of LoadForge. A scenario defines what requests to send, how many virtual users to simulate, and how to measure success. This guide covers everything you need to create effective performance tests.

## Scenario Concepts

### Test Types

LoadForge supports five types of performance tests:

| Type | Purpose | Use Case |
|------|---------|----------|
| **Load** | Constant load over time | Validate normal capacity |
| **Ramp** | Gradual load increase | Find breaking point |
| **Spike** | Sudden traffic burst | Test elasticity |
| **Stress** | Beyond expected capacity | Find system limits |
| **Soak** | Extended duration | Detect memory leaks |

### Load Models

| Model | Description | When to Use |
|-------|-------------|-------------|
| **Virtual Users (VUs)** | Simulates concurrent users | Realistic user behavior |
| **Constant Arrival Rate** | Fixed requests per second | API capacity testing |

---

## Creating a Scenario

### Step 1: Navigate to Scenarios

1. Open your project
2. Click the **Scenarios** tab
3. Click **+ New Scenario**

### Step 2: Basic Configuration

```
┌─────────────────────────────────────────────────────────────┐
│  Create New Scenario                                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Name: [API Load Test - Production                    ]     │
│                                                              │
│  Description:                                                │
│  [Validate API handles 1000 concurrent users         ]      │
│                                                              │
│  Test Type:  (•) Load  ( ) Ramp  ( ) Spike  ( ) Stress      │
│                                                              │
│  Load Model: (•) Virtual Users  ( ) Constant Arrival Rate   │
│                                                              │
│  Default Environment: [Production ▼]                         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Step 3: Configure Stages

Stages define how load changes over time.

#### Example: Ramp Up and Hold

```
VUs
 │
1000 ├─────────────────────────────────
     │                  ╱
 500 │             ╱
     │        ╱
 100 │   ╱
     │
   0 ├───────────────────────────────────▶ Time
     │  2min    5min              15min
     
     Stage 1: Ramp from 0 → 1000 VUs (2 minutes)
     Stage 2: Hold at 1000 VUs (5 minutes)
     Stage 3: Ramp down to 0 VUs (1 minute)
```

#### Stage Configuration

| Field | Description | Example |
|-------|-------------|---------|
| **Name** | Descriptive stage name | "Ramp Up" |
| **Duration** | How long in seconds | 120 |
| **Target VUs** | End state VU count | 1000 |
| **Ramp Strategy** | How to reach target | Linear |

#### Ramp Strategies

| Strategy | Behavior | Best For |
|----------|----------|----------|
| **Linear** | Steady increase | Normal ramp |
| **Exponential** | Slow start, fast end | Gradual testing |
| **Step** | Jump at midpoint | Step functions |
| **Immediate** | Instant change | Spike tests |

```
Linear:              Exponential:         Step:
    ╱                      ╱│             │  ╭──
   ╱                     ╱  │             │  │
  ╱                   ╱     │          ───┤  │
 ╱                 ╱        │             │──╯
╱               ╱           │             │
```

### Step 4: Add Requests

Select which API endpoints to include in the test.

#### Request Distribution

| Mode | Description | Use Case |
|------|-------------|----------|
| **Weighted** | Based on weight % | Realistic traffic mix |
| **Sequential** | In defined order | Workflow testing |
| **Random** | Random selection | Chaos testing |

#### Example: Weighted Distribution

```
┌─────────────────────────────────────────────────────────────┐
│  Requests                                    Distribution   │
├─────────────────────────────────────────────────────────────┤
│  GET  /api/users          ████████████████████  50%        │
│  GET  /api/products       ████████████          30%        │
│  POST /api/orders         ████████              20%        │
└─────────────────────────────────────────────────────────────┘
```

### Step 5: Configure Think Time

Think time simulates realistic user behavior by adding delays between requests.

| Setting | Description | Recommendation |
|---------|-------------|----------------|
| **Min Think Time** | Minimum delay (ms) | 500ms |
| **Max Think Time** | Maximum delay (ms) | 2000ms |

```
Without Think Time:        With Think Time (1-2s):
User → Req → Req → Req     User → Req → [wait] → Req → [wait] → Req
(Unrealistic)              (Realistic user behavior)
```

### Step 6: Define Thresholds

Thresholds determine if a test passes or fails.

#### Common Thresholds

| Metric | Operator | Value | Purpose |
|--------|----------|-------|---------|
| **P95 Latency** | < | 300ms | Response time SLA |
| **P99 Latency** | < | 500ms | Worst case latency |
| **Error Rate** | < | 1% | Reliability target |
| **RPS** | > | 1000 | Throughput minimum |

#### Example Configuration

```yaml
Thresholds:
  - P95 Latency < 300ms
  - P99 Latency < 500ms  
  - Error Rate < 1%
  - RPS > 2000
```

---

## Scenario Examples

### Example 1: Basic Load Test

**Goal**: Validate API handles 500 concurrent users

```yaml
Name: Basic Load Test
Type: Load
Model: Virtual Users

Stages:
  - Name: Ramp Up
    Duration: 60s
    Target VUs: 500
    Strategy: Linear
    
  - Name: Steady State
    Duration: 300s
    Target VUs: 500
    Strategy: Linear
    
  - Name: Ramp Down
    Duration: 30s
    Target VUs: 0
    Strategy: Linear

Requests:
  - GET /api/health (weight: 10)
  - GET /api/users (weight: 40)
  - GET /api/products (weight: 30)
  - POST /api/orders (weight: 20)

Think Time: 1000-2000ms

Thresholds:
  - P95 < 200ms
  - Error Rate < 0.5%
```

### Example 2: Spike Test

**Goal**: Test system behavior during sudden traffic spike

```yaml
Name: Black Friday Spike Test
Type: Spike
Model: Virtual Users

Stages:
  - Name: Normal Load
    Duration: 120s
    Target VUs: 100
    Strategy: Linear
    
  - Name: Spike
    Duration: 30s
    Target VUs: 2000
    Strategy: Immediate
    
  - Name: Spike Hold
    Duration: 60s
    Target VUs: 2000
    Strategy: Linear
    
  - Name: Recovery
    Duration: 60s
    Target VUs: 100
    Strategy: Linear

Thresholds:
  - P95 < 1000ms (during spike)
  - Error Rate < 5% (during spike)
```

### Example 3: Stress Test

**Goal**: Find system breaking point

```yaml
Name: Stress Test - Find Limits
Type: Stress
Model: Virtual Users

Stages:
  - Name: Level 1
    Duration: 120s
    Target VUs: 500
    
  - Name: Level 2
    Duration: 120s
    Target VUs: 1000
    
  - Name: Level 3
    Duration: 120s
    Target VUs: 2000
    
  - Name: Level 4
    Duration: 120s
    Target VUs: 4000
    
  - Name: Level 5
    Duration: 120s
    Target VUs: 8000
    
  - Name: Recovery
    Duration: 300s
    Target VUs: 100

# No thresholds - observing behavior
```

### Example 4: Soak Test

**Goal**: Detect memory leaks over extended period

```yaml
Name: 24-Hour Soak Test
Type: Soak
Model: Virtual Users

Stages:
  - Name: Ramp Up
    Duration: 300s
    Target VUs: 200
    
  - Name: Soak
    Duration: 86400s  # 24 hours
    Target VUs: 200
    
  - Name: Ramp Down
    Duration: 60s
    Target VUs: 0

Thresholds:
  - P95 < 300ms
  - Error Rate < 0.1%
  - Memory increase < 10% per hour (monitored externally)
```

### Example 5: API Rate Testing

**Goal**: Verify API handles target RPS

```yaml
Name: API Throughput Test
Type: Load
Model: Constant Arrival Rate

Stages:
  - Name: Target Rate
    Duration: 600s
    Target RPS: 5000

Thresholds:
  - Achieved RPS > 4800
  - P95 < 100ms
  - Error Rate < 0.1%
```

---

## Data-Driven Testing

### CSV Data Feed

Upload test data to use unique values per virtual user.

**users.csv:**
```csv
user_id,email,password
1,user1@test.com,password123
2,user2@test.com,password456
3,user3@test.com,password789
```

**Using in requests:**
```
POST /api/login
{
  "email": "{{email}}",
  "password": "{{password}}"
}
```

### Random Data Generation

Generate unique data for each request:

| Variable | Syntax | Example Output |
|----------|--------|----------------|
| UUID | `{{$uuid}}` | `550e8400-e29b-...` |
| Timestamp | `{{$timestamp}}` | `1708000000` |
| Random Int | `{{$randomInt(1,100)}}` | `42` |
| Random String | `{{$randomString(10)}}` | `aBcDeFgHiJ` |

---

## Correlation

Extract values from responses to use in subsequent requests.

### Example: Login Flow

**Step 1: Login and extract token**
```
POST /api/login
Response: {"token": "eyJhbGc..."}

Extraction:
  - Variable: authToken
  - Source: JSON Body
  - Path: $.token
```

**Step 2: Use token in next request**
```
GET /api/user/profile
Headers:
  Authorization: Bearer {{authToken}}
```

---

## Best Practices

### 1. Start Small
- Begin with low VU counts
- Gradually increase based on results
- Understand baseline before pushing limits

### 2. Realistic Distribution
- Match production traffic patterns
- Include think time
- Use realistic data

### 3. Define Clear Thresholds
- Base on SLOs/SLAs
- Include both latency and errors
- Consider different percentiles

### 4. Monitor Target System
- Watch resource utilization
- Track application metrics
- Correlate with test events

### 5. Iterate and Refine
- Start with simple scenarios
- Add complexity gradually
- Document findings

---

## Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Lower RPS than expected | Connection limits | Increase runner count |
| High error rate at start | Cold start | Add warm-up stage |
| Inconsistent latency | Garbage collection | Monitor target system |
| VUs not reaching target | Rate limiting | Check target limits |

### Validation Checklist

- [ ] Environment URL is correct
- [ ] Authentication configured
- [ ] Headers include required values
- [ ] Request bodies are valid JSON
- [ ] Thresholds are realistic
- [ ] Enough runners allocated

