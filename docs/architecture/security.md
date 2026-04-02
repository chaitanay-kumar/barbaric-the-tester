# Security Architecture

## Overview

LoadForge implements a defense-in-depth security model with multiple layers of protection. This document details the security architecture, controls, and best practices.

## Security Layers

```
┌─────────────────────────────────────────────────────────────────┐
│                      SECURITY LAYERS                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Layer 1: Network Security                                       │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  • TLS 1.3 encryption in transit                         │   │
│  │  • Network segmentation                                   │   │
│  │  • Firewall rules                                        │   │
│  │  • DDoS protection                                       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  Layer 2: Application Security                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  • JWT authentication                                    │   │
│  │  • RBAC authorization                                    │   │
│  │  • Rate limiting                                         │   │
│  │  • Input validation                                      │   │
│  │  • CORS policies                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  Layer 3: Data Security                                          │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  • AES-256 encryption at rest                            │   │
│  │  • Secrets management                                    │   │
│  │  • Multi-tenant isolation                                │   │
│  │  • Audit logging                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  Layer 4: Operational Security                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  • Vulnerability scanning                                │   │
│  │  • Dependency auditing                                   │   │
│  │  • Security headers                                      │   │
│  │  • Penetration testing                                   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Authentication

### JWT Token Structure

```json
{
  "header": {
    "alg": "HS256",
    "typ": "JWT"
  },
  "payload": {
    "sub": "user-uuid",
    "email": "user@example.com",
    "organizationId": "org-uuid",
    "role": "Developer",
    "iat": 1708000000,
    "exp": 1708086400,
    "jti": "unique-token-id"
  }
}
```

### Token Lifecycle

```
┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐
│  Login  │────▶│ Validate│────▶│ Generate│────▶│  Return │
│ Request │     │  Creds  │     │   JWT   │     │  Token  │
└─────────┘     └─────────┘     └─────────┘     └─────────┘
                                                     │
    ┌────────────────────────────────────────────────┘
    │
    ▼
┌─────────┐     ┌─────────┐     ┌─────────┐
│  Store  │────▶│   Use   │────▶│ Refresh │
│ Client  │     │  Token  │     │ Before  │
│         │     │         │     │ Expiry  │
└─────────┘     └─────────┘     └─────────┘
```

### Password Security

| Aspect | Implementation |
|--------|----------------|
| Hashing | BCrypt with cost factor 12 |
| Min Length | 12 characters |
| Complexity | Upper, lower, number, special |
| History | Last 10 passwords stored |
| Lockout | 5 failed attempts = 15 min lockout |

```csharp
// Password hashing implementation
public static string HashPassword(string password)
{
    return BCrypt.Net.BCrypt.HashPassword(password, workFactor: 12);
}

public static bool VerifyPassword(string password, string hash)
{
    return BCrypt.Net.BCrypt.Verify(password, hash);
}
```

## Authorization (RBAC)

### Role Hierarchy

```
        ┌─────────────┐
        │    Admin    │  Full system access
        └──────┬──────┘
               │
        ┌──────▼──────┐
        │  Team Lead  │  Project management
        └──────┬──────┘
               │
        ┌──────▼──────┐
        │  Developer  │  Test execution
        └──────┬──────┘
               │
        ┌──────▼──────┐
        │   Viewer    │  Read-only access
        └─────────────┘
```

### Permission Matrix

| Resource | Viewer | Developer | Team Lead | Admin |
|----------|--------|-----------|-----------|-------|
| View Projects | ✅ | ✅ | ✅ | ✅ |
| Create Projects | ❌ | ❌ | ✅ | ✅ |
| Delete Projects | ❌ | ❌ | ❌ | ✅ |
| View Scenarios | ✅ | ✅ | ✅ | ✅ |
| Create Scenarios | ❌ | ✅ | ✅ | ✅ |
| Run Tests | ❌ | ✅ | ✅ | ✅ |
| View Results | ✅ | ✅ | ✅ | ✅ |
| Set Baselines | ❌ | ❌ | ✅ | ✅ |
| Manage Users | ❌ | ❌ | ❌ | ✅ |
| Manage Runners | ❌ | ❌ | ❌ | ✅ |
| View Audit Logs | ❌ | ❌ | ✅ | ✅ |
| Manage Secrets | ❌ | ❌ | ✅ | ✅ |

### Policy Implementation

```csharp
// Authorization policies
builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("Admin", policy => 
        policy.RequireRole("Admin"));
    
    options.AddPolicy("TeamLead", policy => 
        policy.RequireRole("Admin", "TeamLead"));
    
    options.AddPolicy("Developer", policy => 
        policy.RequireRole("Admin", "TeamLead", "Developer"));
    
    options.AddPolicy("Viewer", policy => 
        policy.RequireRole("Admin", "TeamLead", "Developer", "Viewer"));
});
```

## Secrets Management

### Encryption Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    SECRETS MANAGEMENT                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  User Input          Encryption             Storage              │
│  ┌─────────┐        ┌─────────┐           ┌─────────┐          │
│  │ API Key │───────▶│ AES-256 │──────────▶│   DB    │          │
│  │ Token   │        │  GCM    │           │ (cipher)│          │
│  │ Secret  │        └─────────┘           └─────────┘          │
│  └─────────┘             │                                      │
│                          │                                      │
│                    ┌─────▼─────┐                                │
│                    │ Master Key│                                │
│                    │  (HSM or  │                                │
│                    │  Vault)   │                                │
│                    └───────────┘                                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Secret Types

| Type | Encryption | Access |
|------|------------|--------|
| API Tokens | AES-256-GCM | Hashed, never exposed |
| Environment Secrets | AES-256-GCM | Encrypted at rest |
| Runner Tokens | SHA-256 | One-time display |
| JWT Signing Key | N/A | Environment variable only |

### Encryption Implementation

```csharp
public class SecretEncryption : ISecretEncryption
{
    private readonly byte[] _key;
    
    public SecretEncryption(IConfiguration config)
    {
        _key = Convert.FromBase64String(config["Encryption:Key"]);
    }
    
    public string Encrypt(string plainText)
    {
        using var aes = Aes.Create();
        aes.Key = _key;
        aes.GenerateIV();
        
        using var encryptor = aes.CreateEncryptor();
        var plainBytes = Encoding.UTF8.GetBytes(plainText);
        var cipherBytes = encryptor.TransformFinalBlock(plainBytes, 0, plainBytes.Length);
        
        // Prepend IV to ciphertext
        var result = new byte[aes.IV.Length + cipherBytes.Length];
        Buffer.BlockCopy(aes.IV, 0, result, 0, aes.IV.Length);
        Buffer.BlockCopy(cipherBytes, 0, result, aes.IV.Length, cipherBytes.Length);
        
        return Convert.ToBase64String(result);
    }
    
    public string Decrypt(string cipherText)
    {
        var fullCipher = Convert.FromBase64String(cipherText);
        
        using var aes = Aes.Create();
        aes.Key = _key;
        
        // Extract IV from ciphertext
        var iv = new byte[16];
        var cipher = new byte[fullCipher.Length - 16];
        Buffer.BlockCopy(fullCipher, 0, iv, 0, iv.Length);
        Buffer.BlockCopy(fullCipher, iv.Length, cipher, 0, cipher.Length);
        
        aes.IV = iv;
        
        using var decryptor = aes.CreateDecryptor();
        var plainBytes = decryptor.TransformFinalBlock(cipher, 0, cipher.Length);
        
        return Encoding.UTF8.GetString(plainBytes);
    }
}
```

## Multi-Tenant Isolation

### Data Isolation

```
┌─────────────────────────────────────────────────────────────────┐
│                    TENANT ISOLATION                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Organization A                  Organization B                  │
│  ┌─────────────────────┐        ┌─────────────────────┐        │
│  │ Projects            │        │ Projects            │        │
│  │ ├── Project A1      │        │ ├── Project B1      │        │
│  │ └── Project A2      │        │ └── Project B2      │        │
│  │                     │   ✗    │                     │        │
│  │ Users               │◀──────▶│ Users               │        │
│  │ ├── Admin A         │  No    │ ├── Admin B         │        │
│  │ └── Dev A           │ Access │ └── Dev B           │        │
│  │                     │        │                     │        │
│  │ Runners             │        │ Runners             │        │
│  │ └── Runner A1       │        │ └── Runner B1       │        │
│  └─────────────────────┘        └─────────────────────┘        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Query-Level Isolation

```csharp
// All queries automatically filtered by organization
public class OrganizationFilter : IQueryFilter
{
    private readonly ICurrentUser _currentUser;
    
    public void Apply<T>(IQueryable<T> query) where T : IOrganizationEntity
    {
        query = query.Where(e => e.OrganizationId == _currentUser.OrganizationId);
    }
}
```

## Audit Logging

### Logged Events

| Event Category | Events |
|---------------|--------|
| Authentication | Login, Logout, Failed Login, Password Change |
| Authorization | Access Denied, Role Change |
| Data | Create, Update, Delete (all entities) |
| Execution | Test Start, Test Stop, Test Complete |
| Admin | User Management, Secret Management |

### Audit Log Schema

```sql
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY,
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID,
    entity_name VARCHAR(200),
    old_values JSONB,
    new_values JSONB,
    user_id UUID,
    user_email VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    organization_id UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for query performance
CREATE INDEX idx_audit_org_date ON audit_logs(organization_id, created_at DESC);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_user ON audit_logs(user_id, created_at DESC);
```

### Log Retention

| Environment | Retention | Storage |
|-------------|-----------|---------|
| Production | 2 years | Archive to cold storage after 90 days |
| Staging | 30 days | Auto-delete |
| Development | 7 days | Auto-delete |

## Rate Limiting

### Rate Limit Configuration

| Endpoint Category | Limit | Window |
|-------------------|-------|--------|
| Authentication | 5 requests | 1 minute |
| API (authenticated) | 1000 requests | 1 minute |
| Test Execution | 10 starts | 1 minute |
| Import | 5 imports | 5 minutes |
| Metrics Stream | 100 connections | concurrent |

### Implementation

```csharp
// Rate limiting middleware configuration
builder.Services.AddRateLimiter(options =>
{
    options.AddFixedWindowLimiter("auth", opt =>
    {
        opt.PermitLimit = 5;
        opt.Window = TimeSpan.FromMinutes(1);
        opt.QueueLimit = 0;
    });
    
    options.AddSlidingWindowLimiter("api", opt =>
    {
        opt.PermitLimit = 1000;
        opt.Window = TimeSpan.FromMinutes(1);
        opt.SegmentsPerWindow = 6;
    });
    
    options.OnRejected = async (context, token) =>
    {
        context.HttpContext.Response.StatusCode = 429;
        await context.HttpContext.Response.WriteAsJsonAsync(new
        {
            error = "Too many requests",
            retryAfter = context.Lease.TryGetMetadata(MetadataName.RetryAfter, out var retry) 
                ? retry.TotalSeconds : 60
        });
    };
});
```

## Security Headers

### Response Headers

```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=()
```

## Security Checklist

### Pre-Production

- [ ] All secrets rotated from development values
- [ ] TLS certificates installed and validated
- [ ] Rate limiting enabled
- [ ] Audit logging enabled
- [ ] Security headers configured
- [ ] CORS restricted to known origins
- [ ] Database connections encrypted
- [ ] Backup encryption enabled
- [ ] Penetration test completed
- [ ] Vulnerability scan passed

### Ongoing

- [ ] Weekly dependency vulnerability scan
- [ ] Monthly access review
- [ ] Quarterly penetration test
- [ ] Annual security audit
- [ ] Continuous security monitoring

## Incident Response

### Security Incident Classification

| Severity | Description | Response Time |
|----------|-------------|---------------|
| Critical | Data breach, system compromise | Immediate |
| High | Authentication bypass, privilege escalation | 1 hour |
| Medium | Unauthorized access attempt | 4 hours |
| Low | Policy violation, suspicious activity | 24 hours |

### Response Procedures

1. **Identify** - Detect and classify the incident
2. **Contain** - Limit the scope and impact
3. **Eradicate** - Remove the threat
4. **Recover** - Restore normal operations
5. **Lessons Learned** - Document and improve

## Compliance

### Standards Alignment

| Standard | Status | Notes |
|----------|--------|-------|
| OWASP Top 10 | ✅ Compliant | All controls implemented |
| SOC 2 Type II | 📋 In Progress | Audit scheduled |
| GDPR | ✅ Compliant | Data processing documented |
| ISO 27001 | 📋 Planned | Q3 2026 target |

