# API Reference - Projects

## Overview

Projects are the top-level organizational unit in LoadForge. Each project contains environments, API collections, scenarios, and test runs.

## Endpoints Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects` | List all projects |
| POST | `/api/projects` | Create new project |
| GET | `/api/projects/{id}` | Get project details |
| PUT | `/api/projects/{id}` | Update project |
| DELETE | `/api/projects/{id}` | Delete project |

---

## List Projects

Retrieve all projects for the current organization.

```http
GET /api/projects
Authorization: Bearer {token}
```

### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | int | 1 | Page number |
| `pageSize` | int | 20 | Items per page (max 100) |

### Example Request

```bash
curl "http://localhost:5000/api/projects?page=1&pageSize=10" \
  -H "Authorization: Bearer {token}"
```

### Success Response (200 OK)

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "name": "Payment API",
        "slug": "payment-api",
        "description": "Payment processing API performance tests",
        "environmentCount": 3,
        "scenarioCount": 5,
        "createdAt": "2026-01-15T10:30:00Z",
        "updatedAt": "2026-02-20T14:22:00Z"
      },
      {
        "id": "660e8400-e29b-41d4-a716-446655440000",
        "name": "User Service",
        "slug": "user-service",
        "description": "User management microservice",
        "environmentCount": 2,
        "scenarioCount": 8,
        "createdAt": "2026-01-20T09:00:00Z",
        "updatedAt": "2026-02-21T08:15:00Z"
      }
    ],
    "totalCount": 12,
    "pageNumber": 1,
    "pageSize": 10,
    "totalPages": 2,
    "hasNext": true,
    "hasPrevious": false
  }
}
```

---

## Create Project

Create a new project in the organization.

```http
POST /api/projects
Authorization: Bearer {token}
Content-Type: application/json
```

### Required Role

`TeamLead` or higher

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | ✅ | Project display name |
| `slug` | string | ✅ | URL-friendly identifier |
| `description` | string | ❌ | Project description |
| `defaultBaseUrl` | string | ❌ | Default API base URL |

### Example Request

```bash
curl -X POST "http://localhost:5000/api/projects" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Order Service",
    "slug": "order-service",
    "description": "E-commerce order processing API",
    "defaultBaseUrl": "https://api.orders.example.com"
  }'
```

### Success Response (201 Created)

```json
{
  "success": true,
  "data": {
    "id": "770e8400-e29b-41d4-a716-446655440000",
    "name": "Order Service",
    "slug": "order-service",
    "description": "E-commerce order processing API",
    "environments": [
      {
        "id": "880e8400-e29b-41d4-a716-446655440000",
        "name": "Development",
        "baseUrl": "https://api.orders.example.com",
        "isDefault": true
      }
    ],
    "collections": [],
    "scenarios": [],
    "createdAt": "2026-02-21T10:00:00Z",
    "updatedAt": "2026-02-21T10:00:00Z"
  }
}
```

### Validation Rules

| Field | Rules |
|-------|-------|
| name | 1-200 characters |
| slug | Lowercase, alphanumeric, hyphens only, 1-100 characters, unique per org |
| description | Max 1000 characters |
| defaultBaseUrl | Valid URL format |

### Error Responses

| Status | Error | Description |
|--------|-------|-------------|
| 400 | Slug already exists | Another project has this slug |
| 400 | Validation error | Invalid input |
| 403 | Forbidden | Insufficient permissions |

---

## Get Project Details

Retrieve detailed information about a project including environments, collections, and scenarios.

```http
GET /api/projects/{id}
Authorization: Bearer {token}
```

### Example Request

```bash
curl "http://localhost:5000/api/projects/550e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer {token}"
```

### Success Response (200 OK)

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Payment API",
    "slug": "payment-api",
    "description": "Payment processing API performance tests",
    "environments": [
      {
        "id": "aaa...",
        "name": "Development",
        "baseUrl": "https://dev-api.payments.example.com",
        "isDefault": true
      },
      {
        "id": "bbb...",
        "name": "Staging",
        "baseUrl": "https://staging-api.payments.example.com",
        "isDefault": false
      },
      {
        "id": "ccc...",
        "name": "Production",
        "baseUrl": "https://api.payments.example.com",
        "isDefault": false
      }
    ],
    "collections": [
      {
        "id": "ddd...",
        "name": "Payment Endpoints",
        "endpointCount": 12
      },
      {
        "id": "eee...",
        "name": "Refund Endpoints",
        "endpointCount": 5
      }
    ],
    "scenarios": [
      {
        "id": "fff...",
        "name": "Load Test - Checkout",
        "executionType": "Load"
      },
      {
        "id": "ggg...",
        "name": "Spike Test - Flash Sale",
        "executionType": "Spike"
      }
    ],
    "createdAt": "2026-01-15T10:30:00Z",
    "updatedAt": "2026-02-20T14:22:00Z"
  }
}
```

### Error Responses

| Status | Error | Description |
|--------|-------|-------------|
| 404 | Not found | Project doesn't exist or not in your org |

---

## Update Project

Update project details.

```http
PUT /api/projects/{id}
Authorization: Bearer {token}
Content-Type: application/json
```

### Required Role

`TeamLead` or higher

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | ❌ | New project name |
| `description` | string | ❌ | New description |

> **Note:** Slug cannot be changed after creation.

### Example Request

```bash
curl -X PUT "http://localhost:5000/api/projects/550e8400..." \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Payment Gateway API",
    "description": "Updated description for payment processing"
  }'
```

### Success Response (200 OK)

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Payment Gateway API",
    "slug": "payment-api",
    "description": "Updated description for payment processing",
    "environments": [...],
    "collections": [...],
    "scenarios": [...],
    "createdAt": "2026-01-15T10:30:00Z",
    "updatedAt": "2026-02-21T10:30:00Z"
  }
}
```

---

## Delete Project

Soft-delete a project (marks as inactive).

```http
DELETE /api/projects/{id}
Authorization: Bearer {token}
```

### Required Role

`Admin` only

### Example Request

```bash
curl -X DELETE "http://localhost:5000/api/projects/550e8400..." \
  -H "Authorization: Bearer {token}"
```

### Success Response (204 No Content)

No response body.

### Warning

Deleting a project:
- Archives all scenarios and test runs
- Does not delete historical data
- Can be restored by an admin

---

## Code Examples

### TypeScript

```typescript
import { ApiService } from './api.service';

// List projects
const projects = await apiService.getProjects(1, 20);
console.log(`Found ${projects.data.totalCount} projects`);

// Create project
const newProject = await apiService.createProject({
  name: 'My New API',
  slug: 'my-new-api',
  description: 'Performance tests for my new API',
  defaultBaseUrl: 'https://api.example.com'
});

// Get project details
const project = await apiService.getProject(newProject.data.id);
console.log(`Project has ${project.data.scenarios.length} scenarios`);

// Update project
await apiService.updateProject(project.data.id, {
  description: 'Updated description'
});

// Delete project
await apiService.deleteProject(project.data.id);
```

### Python

```python
import requests

BASE_URL = "http://localhost:5000/api"
headers = {"Authorization": f"Bearer {token}"}

# List projects
response = requests.get(f"{BASE_URL}/projects", headers=headers)
projects = response.json()["data"]["items"]

# Create project
new_project = requests.post(
    f"{BASE_URL}/projects",
    headers=headers,
    json={
        "name": "My API",
        "slug": "my-api",
        "description": "Performance tests"
    }
).json()

# Get details
project = requests.get(
    f"{BASE_URL}/projects/{new_project['data']['id']}",
    headers=headers
).json()
```

### cURL Script

```bash
#!/bin/bash
TOKEN="your-jwt-token"
BASE_URL="http://localhost:5000/api"

# List all projects
curl -s "$BASE_URL/projects" \
  -H "Authorization: Bearer $TOKEN" | jq '.data.items[].name'

# Create new project
PROJECT=$(curl -s -X POST "$BASE_URL/projects" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Project",
    "slug": "test-project"
  }')

PROJECT_ID=$(echo $PROJECT | jq -r '.data.id')
echo "Created project: $PROJECT_ID"

# Get project details
curl -s "$BASE_URL/projects/$PROJECT_ID" \
  -H "Authorization: Bearer $TOKEN" | jq
```

