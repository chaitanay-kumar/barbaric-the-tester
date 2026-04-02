# API Reference - Authentication

## Overview

LoadForge uses JWT (JSON Web Tokens) for authentication. All API requests (except public endpoints) require a valid Bearer token in the Authorization header.

## Base URL

```
Production: https://api.loadforge.internal
Development: http://localhost:5000
```

## Authentication Endpoints

### Login

Authenticate a user and receive a JWT token.

```http
POST /api/auth/login
Content-Type: application/json
```

#### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email` | string | ✅ | User's email address |
| `password` | string | ✅ | User's password |

#### Example Request

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "SecurePassword123!"
  }'
```

#### Success Response (200 OK)

```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "dGhpcyBpcyBhIHJlZnJlc2ggdG9rZW4...",
    "expiresAt": "2026-02-22T12:00:00Z",
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "admin@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "Admin",
      "organizationId": "660e8400-e29b-41d4-a716-446655440000",
      "organizationName": "Acme Corp"
    }
  }
}
```

#### Error Responses

| Status | Error | Description |
|--------|-------|-------------|
| 401 | Invalid credentials | Email or password incorrect |
| 401 | Account disabled | User account is inactive |
| 401 | Organization disabled | Organization is inactive |
| 429 | Too many requests | Rate limit exceeded (5/min) |

```json
{
  "success": false,
  "message": "Invalid email or password"
}
```

---

### Register Organization

Create a new organization with an admin user.

```http
POST /api/auth/register
Content-Type: application/json
```

#### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email` | string | ✅ | Admin user's email |
| `password` | string | ✅ | Password (min 12 chars) |
| `firstName` | string | ✅ | First name |
| `lastName` | string | ✅ | Last name |
| `organizationName` | string | ✅ | Organization display name |
| `organizationSlug` | string | ✅ | URL-friendly identifier |

#### Example Request

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@newcompany.com",
    "password": "SecurePassword123!",
    "firstName": "Jane",
    "lastName": "Smith",
    "organizationName": "New Company Inc",
    "organizationSlug": "new-company"
  }'
```

#### Success Response (200 OK)

```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "cmVmcmVzaCB0b2tlbiBoZXJl...",
    "expiresAt": "2026-02-22T12:00:00Z",
    "user": {
      "id": "770e8400-e29b-41d4-a716-446655440000",
      "email": "admin@newcompany.com",
      "firstName": "Jane",
      "lastName": "Smith",
      "role": "Admin",
      "organizationId": "880e8400-e29b-41d4-a716-446655440000",
      "organizationName": "New Company Inc"
    }
  }
}
```

#### Validation Rules

| Field | Rules |
|-------|-------|
| email | Valid email format, unique |
| password | Min 12 chars, uppercase, lowercase, number, special |
| organizationSlug | Lowercase, alphanumeric + hyphens, unique |

#### Error Responses

| Status | Error | Description |
|--------|-------|-------------|
| 400 | Email already registered | Email exists in system |
| 400 | Organization slug taken | Slug already in use |
| 400 | Validation error | Invalid input format |

---

### Get Current User

Retrieve the authenticated user's information.

```http
GET /api/auth/me
Authorization: Bearer {token}
```

#### Example Request

```bash
curl http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

#### Success Response (200 OK)

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "admin@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "Admin",
    "organizationId": "660e8400-e29b-41d4-a716-446655440000",
    "organizationName": "Acme Corp"
  }
}
```

---

### Change Password

Change the authenticated user's password.

```http
POST /api/auth/change-password
Authorization: Bearer {token}
Content-Type: application/json
```

#### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `currentPassword` | string | ✅ | Current password |
| `newPassword` | string | ✅ | New password (min 12 chars) |

#### Example Request

```bash
curl -X POST http://localhost:5000/api/auth/change-password \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{
    "currentPassword": "OldPassword123!",
    "newPassword": "NewSecurePassword456!"
  }'
```

#### Success Response (200 OK)

```json
{
  "success": true,
  "data": "Password changed successfully"
}
```

#### Error Responses

| Status | Error | Description |
|--------|-------|-------------|
| 400 | Incorrect password | Current password doesn't match |
| 400 | Password too weak | Doesn't meet requirements |
| 400 | Password reused | Same as recent password |

---

## Using Authentication

### Adding Bearer Token

All authenticated requests must include the JWT token:

```bash
curl http://localhost:5000/api/projects \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Token Structure

The JWT contains the following claims:

```json
{
  "sub": "user-uuid",
  "email": "user@example.com",
  "userId": "user-uuid",
  "organizationId": "org-uuid",
  "role": "Developer",
  "iat": 1708000000,
  "exp": 1708086400,
  "jti": "unique-token-id"
}
```

### Token Expiration

| Token Type | Lifetime | Refresh |
|------------|----------|---------|
| Access Token | 24 hours | Use refresh token |
| Refresh Token | 7 days | Re-authenticate |

### Handling Expired Tokens

When a token expires, the API returns:

```json
{
  "success": false,
  "message": "Token has expired"
}
```

**HTTP Status:** `401 Unauthorized`

---

## Security Best Practices

### Token Storage

| Platform | Recommended Storage |
|----------|---------------------|
| Web Browser | HttpOnly cookie or memory |
| Mobile App | Secure keychain/keystore |
| CI/CD | Environment variables |
| CLI | Secure credential store |

### Never Store Tokens In

- ❌ localStorage (XSS vulnerable)
- ❌ URL parameters
- ❌ Git repositories
- ❌ Log files

### Token Rotation

For API tokens used in CI/CD:

```bash
# Generate new token
POST /api/tokens

# Revoke old token immediately after rotation
DELETE /api/tokens/{oldTokenId}
```

---

## Code Examples

### JavaScript/TypeScript

```typescript
const login = async (email: string, password: string): Promise<string> => {
  const response = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  
  const data = await response.json();
  
  if (!data.success) {
    throw new Error(data.message);
  }
  
  return data.data.token;
};

// Using the token
const fetchProjects = async (token: string) => {
  const response = await fetch('http://localhost:5000/api/projects', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return response.json();
};
```

### Python

```python
import requests

def login(email: str, password: str) -> str:
    response = requests.post(
        'http://localhost:5000/api/auth/login',
        json={'email': email, 'password': password}
    )
    data = response.json()
    
    if not data['success']:
        raise Exception(data['message'])
    
    return data['data']['token']

# Using the token
def get_projects(token: str):
    response = requests.get(
        'http://localhost:5000/api/projects',
        headers={'Authorization': f'Bearer {token}'}
    )
    return response.json()
```

### cURL

```bash
# Login and save token
TOKEN=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password123"}' \
  | jq -r '.data.token')

# Use token
curl http://localhost:5000/api/projects \
  -H "Authorization: Bearer $TOKEN"
```

---

## Error Reference

| HTTP Status | Error Code | Description |
|-------------|------------|-------------|
| 400 | VALIDATION_ERROR | Invalid input |
| 401 | INVALID_CREDENTIALS | Wrong email/password |
| 401 | TOKEN_EXPIRED | JWT has expired |
| 401 | TOKEN_INVALID | JWT is malformed |
| 403 | FORBIDDEN | Insufficient permissions |
| 429 | RATE_LIMITED | Too many requests |

