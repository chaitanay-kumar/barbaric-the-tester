# Changelog

All notable changes to LoadForge will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned
- AI-based bottleneck detection
- Anomaly detection for metrics
- Kubernetes autoscaling triggers
- Advanced RBAC with custom roles

---

## [1.0.0] - 2026-02-21

### Added
- **Core Platform**
  - Multi-tenant organization management
  - Role-based access control (Admin, TeamLead, Developer, Viewer)
  - JWT authentication with refresh tokens
  - Audit logging for all operations

- **Project Management**
  - Create and manage projects
  - Environment configuration (dev, staging, production)
  - Encrypted secrets management (AES-256)
  - Global and environment-specific variables

- **API Collections**
  - Postman collection import
  - OpenAPI/Swagger import
  - Manual API endpoint creation
  - Request headers, body, and assertions
  - Variable substitution (`{{variable}}`)

- **Test Scenarios**
  - Five test types: Load, Ramp, Spike, Stress, Soak
  - Virtual Users (VU) model
  - Constant Arrival Rate model
  - Multi-stage configuration
  - Ramp strategies (Linear, Exponential, Step, Immediate)
  - Weighted request distribution
  - Think time simulation
  - Data-driven testing (CSV, JSON)
  - Response correlation (JSON path extraction)

- **Test Execution**
  - Real-time metrics streaming (SignalR)
  - Distributed runner support
  - Graceful test stop
  - Automatic threshold evaluation

- **Metrics & Reporting**
  - P50, P90, P95, P99 latency percentiles
  - Requests per second (RPS)
  - Error rate tracking
  - Status code distribution
  - Active VU monitoring
  - Historical metrics storage

- **Baseline Management**
  - Mark runs as baseline
  - Automatic comparison
  - Regression detection (>20% degradation)

- **API & Integration**
  - RESTful API with Swagger documentation
  - CI/CD integration support
  - API tokens for automation
  - Webhook notifications (coming soon)

- **Operations**
  - Prometheus metrics endpoint
  - Structured JSON logging
  - Health check endpoints
  - Docker Compose deployment
  - Kubernetes Helm charts

### Security
- JWT-based authentication
- BCrypt password hashing (cost factor 12)
- AES-256-GCM secret encryption
- TLS enforcement
- Rate limiting
- CORS configuration
- Security headers

---

## [0.9.0] - 2026-02-01 (Beta)

### Added
- Initial beta release
- Core API functionality
- Basic scenario builder
- Simple metrics dashboard

### Known Issues
- Real-time updates may lag under high load
- Postman v2.0 collections require manual fixes

---

## Migration Guide

### Upgrading from 0.9.x to 1.0.0

1. **Backup your database**
   ```bash
   pg_dump -U postgres loadforge > backup.sql
   ```

2. **Update Docker images**
   ```bash
   docker-compose pull
   ```

3. **Run database migrations**
   ```bash
   docker-compose exec api dotnet ef database update
   ```

4. **Verify health**
   ```bash
   curl http://localhost:5000/health
   ```

### Breaking Changes in 1.0.0

| Area | Change | Migration |
|------|--------|-----------|
| API | `/api/tests` renamed to `/api/runs` | Update API calls |
| Auth | Token expiry reduced to 24h | Implement refresh flow |
| Scenarios | `duration` now in seconds (was minutes) | Multiply by 60 |

---

## Versioning

LoadForge follows semantic versioning:

- **MAJOR**: Incompatible API changes
- **MINOR**: Backward-compatible functionality
- **PATCH**: Backward-compatible bug fixes

## Support

| Version | Status | Support Until |
|---------|--------|---------------|
| 1.0.x | Active | Current |
| 0.9.x | Deprecated | 2026-04-01 |

