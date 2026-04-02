# LoadForge - Enterprise Performance Testing Platform

<p align="center">
  <img src="docs/assets/logo.png" alt="LoadForge Logo" width="200"/>
</p>

<p align="center">
  <strong>Design, Execute, and Analyze Performance Tests at Scale</strong>
</p>

<p align="center">
  <a href="#quick-start">Quick Start</a> •
  <a href="#features">Features</a> •
  <a href="docs/README.md">Documentation</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#contributing">Contributing</a>
</p>

---

LoadForge is an internal, enterprise-grade API performance testing platform that enables engineering teams to design, execute, analyze, and automate performance tests across microservices and APIs.

## ✨ Why LoadForge?

| Traditional Tools | LoadForge |
|-------------------|-----------|
| ❌ Complex scripting | ✅ Visual scenario builder |
| ❌ Local execution | ✅ Distributed 100k+ VUs |
| ❌ Manual result analysis | ✅ Real-time dashboards |
| ❌ No CI/CD integration | ✅ First-class CI/CD support |
| ❌ Scattered secrets | ✅ Centralized, encrypted secrets |
| ❌ No governance | ✅ RBAC & audit logging |

## 🚀 Quick Start

```bash
# Start LoadForge with Docker
docker-compose up -d

# Access the UI
open http://localhost:4200

# API Documentation
open http://localhost:5000/swagger
```

📖 **[Full Quick Start Guide →](docs/user-guide/quick-start.md)**

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        LoadForge Platform                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐    │
│  │   Angular    │────▶│   .NET API   │────▶│  PostgreSQL  │    │
│  │   Frontend   │     │   Gateway    │     │   Database   │    │
│  └──────────────┘     └──────────────┘     └──────────────┘    │
│         │                    │                                   │
│         │                    ▼                                   │
│         │             ┌──────────────┐     ┌──────────────┐    │
│         │             │    Redis     │     │   Workers    │    │
│         │             │   (Metrics)  │     │   (Queue)    │    │
│         │             └──────────────┘     └──────────────┘    │
│         │                                         │             │
│         │                                         ▼             │
│         │             ┌─────────────────────────────────┐      │
│         └────────────▶│     Distributed Runners         │      │
│                       │  ┌────┐ ┌────┐ ┌────┐ ┌────┐   │      │
│                       │  │ R1 │ │ R2 │ │ R3 │ │ Rn │   │      │
│                       │  └────┘ └────┘ └────┘ └────┘   │      │
│                       └─────────────────────────────────┘      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## 🎯 Features

### Performance Test Types

| Type | Description | Use Case |
|------|-------------|----------|
| **Load** | Constant load simulation | Validate expected capacity |
| **Ramp** | Gradual load increase | Find breaking points |
| **Spike** | Sudden traffic bursts | Test auto-scaling |
| **Stress** | Beyond capacity testing | Find system limits |
| **Soak** | Extended duration tests | Detect memory leaks |

### Core Capabilities

<table>
<tr>
<td width="50%">

**📊 Real-Time Metrics**
- P50, P90, P95, P99 latencies
- Requests per second (RPS)
- Error rate & distribution
- Live VU monitoring

**🔄 Distributed Execution**
- 100,000+ concurrent VUs
- Horizontal runner scaling
- Automatic load distribution

**✅ Threshold Validation**
- Pass/fail criteria
- SLA enforcement
- Regression detection

</td>
<td width="50%">

**🔐 Enterprise Security**
- AES-256 encrypted secrets
- JWT authentication
- Role-based access (RBAC)
- Audit logging

**🔌 CI/CD Integration**
- REST API triggers
- CLI support
- GitHub Actions, Jenkins
- Exit codes for pipelines

**📅 Scheduling**
- Cron-based execution
- Nightly soak tests
- Automated baselines

</td>
</tr>
</table>

📖 **[Full Feature Documentation →](docs/README.md)**

## 📁 Project Structure

```
loadforge/
├── backend/                    # .NET 8 Backend
│   ├── src/
│   │   ├── LoadForge.Api/      # REST API
│   │   ├── LoadForge.Core/     # Domain entities & interfaces
│   │   ├── LoadForge.Infrastructure/  # Database & external services
│   │   ├── LoadForge.Runner/   # Load generation engine
│   │   └── LoadForge.Worker/   # Background job processor
│   └── LoadForge.sln
├── frontend/
│   └── loadforge-ui/           # Angular 18 Frontend
│       └── src/app/
│           ├── components/     # UI Components
│           ├── services/       # API Services
│           ├── models/         # TypeScript models
│           └── guards/         # Auth guards
├── docker-compose.yml          # Docker orchestration
└── README.md
```

## 🛠 Technology Stack

### Backend
- **.NET 8** - API & Services
- **Entity Framework Core** - ORM
- **PostgreSQL** - Primary database
- **Redis** - Real-time metrics & caching
- **JWT** - Authentication
- **BCrypt** - Password hashing
- **SignalR** - Real-time updates

### Frontend
- **Angular 18** - SPA Framework
- **Signals** - Reactive state management
- **Angular Material** - UI Components
- **Chart.js** - Metrics visualization

### Infrastructure
- **Docker & Docker Compose**
- **Kubernetes (Helm charts)**
- **Prometheus** - Metrics export

## 🚦 Getting Started

### Prerequisites
- .NET 8 SDK
- Node.js 20+
- Docker & Docker Compose
- PostgreSQL 16+

### Quick Start with Docker

```bash
# Clone and start all services
cd loadforge
docker-compose up -d

# Access the application
# Frontend: http://localhost:4200
# API: http://localhost:5000
# Swagger: http://localhost:5000/swagger
```

### Development Setup

#### Backend
```bash
cd backend

# Restore dependencies
dotnet restore

# Run database migrations
cd src/LoadForge.Api
dotnet ef database update

# Start the API
dotnet run
```

#### Frontend
```bash
cd frontend/loadforge-ui

# Install dependencies
npm install

# Start development server
npm start
```

## 📊 API Endpoints

### Authentication
- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Register organization
- `GET /api/auth/me` - Get current user

### Projects
- `GET /api/projects` - List projects
- `POST /api/projects` - Create project
- `GET /api/projects/{id}` - Get project details
- `PUT /api/projects/{id}` - Update project
- `DELETE /api/projects/{id}` - Delete project

### Scenarios
- `GET /api/projects/{projectId}/scenarios` - List scenarios
- `POST /api/projects/{projectId}/scenarios` - Create scenario
- `GET /api/projects/{projectId}/scenarios/{id}` - Get scenario
- `PUT /api/projects/{projectId}/scenarios/{id}` - Update scenario

### Test Runs
- `GET /api/projects/{projectId}/runs` - List runs
- `POST /api/projects/{projectId}/runs` - Start new run
- `GET /api/projects/{projectId}/runs/{id}` - Get run details
- `POST /api/projects/{projectId}/runs/{id}/stop` - Stop run
- `POST /api/projects/{projectId}/runs/{id}/set-baseline` - Mark as baseline
- `GET /api/projects/{projectId}/runs/{id}/compare` - Compare to baseline

## 👥 User Roles

| Role | Permissions |
|------|-------------|
| **Admin** | Full access, manage org, runners, secrets |
| **Team Lead** | Create projects, scenarios, manage thresholds |
| **Developer** | Import APIs, create/run tests, view results |
| **Viewer** | Read-only access to reports |

## 📈 Metrics Collected

- **Latency**: Min, Max, Avg, P50, P90, P95, P99
- **Throughput**: Requests per second (RPS)
- **Error Rate**: Failed requests percentage
- **Status Codes**: Distribution of HTTP status codes
- **Active VUs**: Virtual users count over time
- **Bytes**: Data sent/received

## 🔐 Security

- JWT-based authentication
- Role-based access control (RBAC)
- AES-256 encrypted secrets
- TLS enforcement
- Audit logging
- Rate limiting
- Multi-tenant isolation

## 📚 Documentation

| Guide | Description |
|-------|-------------|
| **[Quick Start](docs/user-guide/quick-start.md)** | Get running in 5 minutes |
| **[Architecture Overview](docs/architecture/overview.md)** | System design & components |
| **[Security Architecture](docs/architecture/security.md)** | Security implementation |
| **[API Reference](docs/api/authentication.md)** | Complete API documentation |
| **[Building Scenarios](docs/user-guide/scenarios.md)** | Creating performance tests |
| **[Production Deployment](docs/deployment/production.md)** | Docker & Kubernetes setup |
| **[Monitoring Guide](docs/operations/monitoring.md)** | Observability & alerting |
| **[Changelog](docs/CHANGELOG.md)** | Version history |

## 📋 Roadmap

### Phase 1 ✅ Complete
- [x] Multi-tenant project management
- [x] API collection import (Postman/OpenAPI)
- [x] Visual scenario builder
- [x] 5 test types (Load/Ramp/Spike/Stress/Soak)
- [x] Real-time metrics dashboard
- [x] Threshold validation
- [x] Basic reporting & export

### Phase 2 🚧 In Progress
- [ ] Distributed runner orchestration
- [ ] Baseline comparison & regression alerts
- [ ] CI/CD integration (GitHub Actions, Jenkins)
- [ ] Scheduled test execution
- [ ] Advanced RBAC with custom roles

### Phase 3 📅 Planned
- [ ] AI-based bottleneck detection
- [ ] Anomaly detection & alerting
- [ ] Historical trend analytics
- [ ] Kubernetes autoscaling triggers
- [ ] Resource monitoring of target systems

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](docs/development/contributing.md) for details.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

Internal use only. Proprietary software.

© 2026 LoadForge Team. All rights reserved.

---

<p align="center">
  <strong>Built with ❤️ for performance engineers everywhere</strong>
</p>

<p align="center">
  <a href="docs/user-guide/quick-start.md">Get Started</a> •
  <a href="docs/README.md">Documentation</a> •
  <a href="https://github.com/loadforge/loadforge/issues">Report Bug</a> •
  <a href="https://github.com/loadforge/loadforge/issues">Request Feature</a>
</p>

