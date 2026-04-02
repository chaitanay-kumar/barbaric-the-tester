# Quick Start Guide

Get LoadForge up and running in 5 minutes.

## Prerequisites

- Docker & Docker Compose installed
- 8GB RAM available
- Ports 4200, 5000, 5432, 6379 available

## Step 1: Start LoadForge

```bash
# Clone or navigate to LoadForge directory
cd loadforge

# Start all services
docker-compose up -d

# Wait for services to be healthy (about 30 seconds)
docker-compose ps
```

Expected output:
```
NAME                STATUS              PORTS
loadforge-api       running (healthy)   0.0.0.0:5000->8080/tcp
loadforge-db        running (healthy)   0.0.0.0:5432->5432/tcp
loadforge-redis     running (healthy)   0.0.0.0:6379->6379/tcp
loadforge-ui        running             0.0.0.0:4200->80/tcp
```

## Step 2: Access the Application

Open your browser and navigate to:

**Frontend:** http://localhost:4200  
**API Swagger:** http://localhost:5000/swagger

## Step 3: Create Your Account

1. Click **"Sign up"** on the login page
2. Fill in your details:
   - Email: `admin@yourcompany.com`
   - Password: `SecurePassword123!`
   - First Name: `Admin`
   - Last Name: `User`
   - Organization Name: `Your Company`
   - Organization Slug: `your-company`
3. Click **"Register"**

You'll be automatically logged in.

## Step 4: Create Your First Project

1. Click **"+ New Project"**
2. Enter project details:
   - Name: `My API Tests`
   - Slug: `my-api-tests`
   - Description: `Performance tests for my API`
   - Base URL: `https://api.example.com`
3. Click **"Create Project"**

## Step 5: Add an API Endpoint

1. Open your project
2. Go to **Collections** tab
3. Click **"+ New Collection"**
4. Add an endpoint:
   - Name: `Get Users`
   - Method: `GET`
   - URL: `{{baseUrl}}/users`
5. Save the collection

## Step 6: Create a Test Scenario

1. Go to **Scenarios** tab
2. Click **"+ New Scenario"**
3. Configure:
   - Name: `Load Test - Users API`
   - Type: `Load`
   - Model: `Virtual Users`
4. Add a stage:
   - Name: `Ramp Up`
   - Duration: `60` seconds
   - Target VUs: `100`
5. Add another stage:
   - Name: `Steady State`
   - Duration: `120` seconds
   - Target VUs: `100`
6. Add your requests with weights
7. Add thresholds:
   - P95 Latency < 300ms
   - Error Rate < 1%
8. Save the scenario

## Step 7: Run Your First Test

1. Click **"Run Test"** on your scenario
2. Select the environment
3. Click **"Start"**
4. Watch real-time metrics in the dashboard!

## What You'll See

During the test, you'll see:
- **Active VUs** - Current virtual users
- **RPS** - Requests per second
- **Latency** - P50, P95, P99 percentiles
- **Error Rate** - Percentage of failed requests
- **Stage Progress** - Current stage indicator

## Step 8: Analyze Results

After the test completes:
1. View the **Summary** with aggregated metrics
2. Check **Threshold Results** (Pass/Fail)
3. Review **Timeline** of metrics over time
4. Compare to **Baseline** (if set)

---

## Quick Commands

```bash
# View logs
docker-compose logs -f api

# Stop LoadForge
docker-compose down

# Reset database
docker-compose down -v
docker-compose up -d

# Scale runners
docker-compose up -d --scale runner=5
```

## Next Steps

- [Building Scenarios](./scenarios.md) - Advanced scenario configuration
- [Importing Collections](./importing.md) - Import from Postman/OpenAPI
- [CI/CD Integration](../deployment/cicd.md) - Automate testing
- [API Reference](../api/authentication.md) - Full API documentation

## Getting Help

- Check [Troubleshooting Guide](../operations/troubleshooting.md)
- Open an issue on GitHub
- Contact #loadforge-support on Slack

---

*Congratulations! You've run your first performance test with LoadForge! 🎉*

