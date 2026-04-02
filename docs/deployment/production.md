# Production Deployment Guide

## Overview

This guide covers deploying LoadForge in a production environment with high availability, security, and scalability considerations.

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       PRODUCTION ARCHITECTURE                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────┐     ┌─────────────────────────────────────┐           │
│  │   CDN       │────▶│        Load Balancer (L7)           │           │
│  │ (Static)    │     │     (nginx / AWS ALB / Traefik)     │           │
│  └─────────────┘     └────────────────┬────────────────────┘           │
│                                       │                                  │
│              ┌────────────────────────┼────────────────────────┐        │
│              │                        │                        │        │
│              ▼                        ▼                        ▼        │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐    │
│  │   API Pod 1     │    │   API Pod 2     │    │   API Pod N     │    │
│  │  (replicas: 3+) │    │                 │    │                 │    │
│  └────────┬────────┘    └────────┬────────┘    └────────┬────────┘    │
│           │                      │                      │              │
│           └──────────────────────┼──────────────────────┘              │
│                                  │                                      │
│        ┌─────────────────────────┼─────────────────────────┐           │
│        │                         │                         │           │
│        ▼                         ▼                         ▼           │
│  ┌───────────┐           ┌───────────┐           ┌───────────┐        │
│  │PostgreSQL │           │   Redis   │           │  Worker   │        │
│  │ Primary   │           │  Cluster  │           │  Pods     │        │
│  │    +      │           │  (3 node) │           │ (replicas │        │
│  │ Replicas  │           │           │           │   : 2+)   │        │
│  └───────────┘           └───────────┘           └───────────┘        │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                      RUNNER CLUSTER                              │   │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐            │   │
│  │  │Runner 1 │  │Runner 2 │  │Runner 3 │  │Runner N │            │   │
│  │  │ 5K VUs  │  │ 5K VUs  │  │ 5K VUs  │  │ 5K VUs  │            │   │
│  │  └─────────┘  └─────────┘  └─────────┘  └─────────┘            │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## Prerequisites

### Infrastructure Requirements

| Component | Minimum | Recommended | Notes |
|-----------|---------|-------------|-------|
| **API Nodes** | 2 vCPU, 4GB RAM | 4 vCPU, 8GB RAM | 3+ replicas |
| **Worker Nodes** | 2 vCPU, 4GB RAM | 4 vCPU, 8GB RAM | 2+ replicas |
| **Runner Nodes** | 4 vCPU, 8GB RAM | 8 vCPU, 16GB RAM | Scale to VU needs |
| **PostgreSQL** | 4 vCPU, 16GB RAM | 8 vCPU, 32GB RAM | SSD storage |
| **Redis** | 2 vCPU, 4GB RAM | 4 vCPU, 8GB RAM | 3-node cluster |

### Network Requirements

| Port | Service | Protocol | Source |
|------|---------|----------|--------|
| 443 | Load Balancer | HTTPS | Public |
| 5000 | API (internal) | HTTP | LB only |
| 5432 | PostgreSQL | TCP | API/Workers |
| 6379 | Redis | TCP | API/Workers/Runners |

---

## Docker Compose Deployment

### Production Docker Compose

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  # Load Balancer
  nginx:
    image: nginx:alpine
    ports:
      - "443:443"
      - "80:80"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
    depends_on:
      - api
    restart: always
    networks:
      - loadforge-network

  # API Service (multiple replicas)
  api:
    image: loadforge/api:${VERSION:-latest}
    deploy:
      replicas: 3
      resources:
        limits:
          cpus: '2'
          memory: 4G
        reservations:
          cpus: '1'
          memory: 2G
    environment:
      ASPNETCORE_ENVIRONMENT: Production
      ConnectionStrings__DefaultConnection: ${DB_CONNECTION_STRING}
      ConnectionStrings__Redis: ${REDIS_CONNECTION_STRING}
      Jwt__Secret: ${JWT_SECRET}
      Jwt__Issuer: ${JWT_ISSUER}
      Jwt__Audience: ${JWT_AUDIENCE}
      Encryption__Key: ${ENCRYPTION_KEY}
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    restart: always
    networks:
      - loadforge-network

  # Worker Service
  worker:
    image: loadforge/worker:${VERSION:-latest}
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: '2'
          memory: 4G
    environment:
      ConnectionStrings__DefaultConnection: ${DB_CONNECTION_STRING}
      ConnectionStrings__Redis: ${REDIS_CONNECTION_STRING}
    restart: always
    networks:
      - loadforge-network

  # PostgreSQL (Primary)
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: loadforge
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres-data:/var/lib/postgresql/data
      - ./postgres/init.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: always
    networks:
      - loadforge-network

  # Redis Cluster
  redis:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis-data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "${REDIS_PASSWORD}", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: always
    networks:
      - loadforge-network

volumes:
  postgres-data:
  redis-data:

networks:
  loadforge-network:
    driver: bridge
```

### Environment Configuration

```bash
# .env.production
VERSION=1.0.0

# Database
DB_CONNECTION_STRING=Host=postgres;Port=5432;Database=loadforge;Username=loadforge;Password=${DB_PASSWORD};Pooling=true;MinPoolSize=10;MaxPoolSize=100
DB_USER=loadforge
DB_PASSWORD=<generate-secure-password>

# Redis
REDIS_CONNECTION_STRING=redis:6379,password=${REDIS_PASSWORD}
REDIS_PASSWORD=<generate-secure-password>

# JWT
JWT_SECRET=<generate-256-bit-secret>
JWT_ISSUER=https://loadforge.yourcompany.com
JWT_AUDIENCE=https://loadforge.yourcompany.com

# Encryption
ENCRYPTION_KEY=<generate-32-byte-base64-key>
```

### Nginx Configuration

```nginx
# nginx/nginx.conf
worker_processes auto;
events {
    worker_connections 4096;
}

http {
    upstream api {
        least_conn;
        server api:8080;
        keepalive 32;
    }

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=100r/s;
    limit_conn_zone $binary_remote_addr zone=conn_limit:10m;

    server {
        listen 80;
        server_name loadforge.yourcompany.com;
        return 301 https://$server_name$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name loadforge.yourcompany.com;

        # SSL Configuration
        ssl_certificate /etc/nginx/ssl/fullchain.pem;
        ssl_certificate_key /etc/nginx/ssl/privkey.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
        ssl_prefer_server_ciphers off;
        ssl_session_cache shared:SSL:10m;

        # Security Headers
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-Frame-Options "DENY" always;
        add_header X-XSS-Protection "1; mode=block" always;

        # API Proxy
        location /api/ {
            limit_req zone=api_limit burst=50 nodelay;
            limit_conn conn_limit 50;

            proxy_pass http://api;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_set_header Connection "";
            proxy_connect_timeout 60s;
            proxy_send_timeout 60s;
            proxy_read_timeout 60s;
        }

        # WebSocket (SignalR)
        location /hubs/ {
            proxy_pass http://api;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
            proxy_read_timeout 86400;
        }

        # Health check
        location /health {
            proxy_pass http://api;
        }

        # Static files (Angular)
        location / {
            root /usr/share/nginx/html;
            try_files $uri $uri/ /index.html;
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
}
```

---

## Kubernetes Deployment

### Namespace and ConfigMap

```yaml
# k8s/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: loadforge
  labels:
    app: loadforge

---
# k8s/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: loadforge-config
  namespace: loadforge
data:
  ASPNETCORE_ENVIRONMENT: "Production"
  JWT_ISSUER: "https://loadforge.yourcompany.com"
  JWT_AUDIENCE: "https://loadforge.yourcompany.com"
```

### Secrets

```yaml
# k8s/secrets.yaml
apiVersion: v1
kind: Secret
metadata:
  name: loadforge-secrets
  namespace: loadforge
type: Opaque
stringData:
  db-connection-string: "Host=postgres;Port=5432;Database=loadforge;Username=loadforge;Password=SECRET"
  redis-connection-string: "redis:6379,password=SECRET"
  jwt-secret: "<256-bit-secret>"
  encryption-key: "<32-byte-base64-key>"
```

### API Deployment

```yaml
# k8s/api-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: loadforge-api
  namespace: loadforge
spec:
  replicas: 3
  selector:
    matchLabels:
      app: loadforge-api
  template:
    metadata:
      labels:
        app: loadforge-api
    spec:
      containers:
        - name: api
          image: loadforge/api:1.0.0
          ports:
            - containerPort: 8080
          envFrom:
            - configMapRef:
                name: loadforge-config
          env:
            - name: ConnectionStrings__DefaultConnection
              valueFrom:
                secretKeyRef:
                  name: loadforge-secrets
                  key: db-connection-string
            - name: ConnectionStrings__Redis
              valueFrom:
                secretKeyRef:
                  name: loadforge-secrets
                  key: redis-connection-string
            - name: Jwt__Secret
              valueFrom:
                secretKeyRef:
                  name: loadforge-secrets
                  key: jwt-secret
          resources:
            requests:
              cpu: "500m"
              memory: "1Gi"
            limits:
              cpu: "2000m"
              memory: "4Gi"
          livenessProbe:
            httpGet:
              path: /health
              port: 8080
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /health
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 5
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 100
              podAffinityTerm:
                labelSelector:
                  matchExpressions:
                    - key: app
                      operator: In
                      values:
                        - loadforge-api
                topologyKey: kubernetes.io/hostname

---
apiVersion: v1
kind: Service
metadata:
  name: loadforge-api
  namespace: loadforge
spec:
  selector:
    app: loadforge-api
  ports:
    - port: 8080
      targetPort: 8080
  type: ClusterIP

---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: loadforge-api-hpa
  namespace: loadforge
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: loadforge-api
  minReplicas: 3
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
```

### Ingress

```yaml
# k8s/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: loadforge-ingress
  namespace: loadforge
  annotations:
    kubernetes.io/ingress.class: nginx
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/proxy-body-size: "50m"
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  tls:
    - hosts:
        - loadforge.yourcompany.com
      secretName: loadforge-tls
  rules:
    - host: loadforge.yourcompany.com
      http:
        paths:
          - path: /api
            pathType: Prefix
            backend:
              service:
                name: loadforge-api
                port:
                  number: 8080
          - path: /hubs
            pathType: Prefix
            backend:
              service:
                name: loadforge-api
                port:
                  number: 8080
          - path: /
            pathType: Prefix
            backend:
              service:
                name: loadforge-frontend
                port:
                  number: 80
```

---

## Production Checklist

### Pre-Deployment

- [ ] **Secrets Management**
  - [ ] All secrets generated and stored securely
  - [ ] No default passwords in use
  - [ ] Encryption keys generated (32+ bytes)
  
- [ ] **Database**
  - [ ] PostgreSQL configured with replication
  - [ ] Connection pooling enabled
  - [ ] Automated backups configured
  - [ ] Point-in-time recovery tested

- [ ] **Network**
  - [ ] TLS certificates installed
  - [ ] Firewall rules configured
  - [ ] VPC/Network segmentation applied
  - [ ] DDoS protection enabled

### Security

- [ ] **Authentication**
  - [ ] JWT secrets are unique and secure
  - [ ] Token expiration configured
  - [ ] Rate limiting enabled

- [ ] **Authorization**
  - [ ] RBAC policies tested
  - [ ] Admin accounts limited
  - [ ] API tokens have minimal scope

- [ ] **Data Protection**
  - [ ] Secrets encrypted at rest
  - [ ] TLS for all connections
  - [ ] Audit logging enabled

### Monitoring

- [ ] **Observability**
  - [ ] Prometheus metrics exposed
  - [ ] Grafana dashboards deployed
  - [ ] Log aggregation configured
  - [ ] Alerting rules defined

- [ ] **Health Checks**
  - [ ] Liveness probes configured
  - [ ] Readiness probes configured
  - [ ] Dependency health monitored

### Operations

- [ ] **Backup & Recovery**
  - [ ] Database backup schedule
  - [ ] Backup encryption enabled
  - [ ] Recovery procedure tested
  - [ ] RTO/RPO defined

- [ ] **Scaling**
  - [ ] HPA configured
  - [ ] Resource limits set
  - [ ] Node affinity rules applied

---

## Post-Deployment Verification

```bash
# Check API health
curl -k https://loadforge.yourcompany.com/health

# Verify database connectivity
curl -k https://loadforge.yourcompany.com/api/health/db

# Test authentication
curl -X POST https://loadforge.yourcompany.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password"}'

# Check metrics endpoint
curl -k https://loadforge.yourcompany.com/metrics
```

---

## Rollback Procedure

### Docker Compose

```bash
# Rollback to previous version
export VERSION=0.9.0
docker-compose -f docker-compose.prod.yml up -d
```

### Kubernetes

```bash
# Check rollout history
kubectl rollout history deployment/loadforge-api -n loadforge

# Rollback to previous revision
kubectl rollout undo deployment/loadforge-api -n loadforge

# Rollback to specific revision
kubectl rollout undo deployment/loadforge-api -n loadforge --to-revision=2

# Monitor rollback
kubectl rollout status deployment/loadforge-api -n loadforge
```

