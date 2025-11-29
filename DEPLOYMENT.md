# Deployment Guide

## Prerequisites

- Docker and Docker Compose
- Node.js 18+ (for local development)
- PostgreSQL 12+ (for production database)

## Local Development Setup

### 1. Clone and Install

```bash
git clone <repository>
cd admin-billing-audit
pnpm install
```

### 2. Environment Setup

Create `.env` files in both packages:

**packages/api/.env**
```
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres
DATABASE_NAME=admin_billing
PORT=3001
NODE_ENV=development
STRIPE_API_KEY=sk_test_
CORS_ORIGIN=http://localhost:3000
```

**packages/web/.env.local**
```
NEXT_PUBLIC_API_URL=http://localhost:3001/api
API_URL=http://localhost:3001/api
```

### 3. Database Setup

```bash
# Start PostgreSQL with Docker
docker run -d \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=admin_billing \
  -p 5432:5432 \
  postgres:15-alpine

# Run migrations (if TypeORM migrations are set up)
pnpm --filter api run migrate
```

### 4. Start Development Servers

```bash
# Terminal 1 - API
pnpm --filter api run dev

# Terminal 2 - Web
pnpm --filter web run dev
```

Visit:
- Frontend: http://localhost:3000
- API: http://localhost:3001

## Docker Compose Deployment

### Quick Start

```bash
docker-compose up -d
```

This will:
- Start PostgreSQL database
- Build and start the API server
- Build and start the Next.js frontend

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f api
docker-compose logs -f web
```

### Stop Services

```bash
docker-compose down
```

### Clean Up (with data deletion)

```bash
docker-compose down -v
```

## Production Deployment

### 1. Build Docker Images

```bash
# API
docker build -f packages/api/Dockerfile -t admin-billing-api:latest .

# Web
docker build -f packages/web/Dockerfile -t admin-billing-web:latest .
```

### 2. Push to Registry

```bash
docker tag admin-billing-api:latest <registry>/admin-billing-api:latest
docker tag admin-billing-web:latest <registry>/admin-billing-web:latest

docker push <registry>/admin-billing-api:latest
docker push <registry>/admin-billing-web:latest
```

### 3. Environment Variables (Production)

**API Environment:**
```
DATABASE_HOST=prod-db.example.com
DATABASE_PORT=5432
DATABASE_USER=prod_user
DATABASE_PASSWORD=<secure-password>
DATABASE_NAME=admin_billing_prod
PORT=3001
NODE_ENV=production
STRIPE_API_KEY=sk_live_<key>
CORS_ORIGIN=https://admin.example.com
JWT_SECRET=<secure-random-string>
```

**Web Environment:**
```
NEXT_PUBLIC_API_URL=https://api.example.com/api
API_URL=https://api.example.com/api
```

### 4. Database Migration

```bash
# Connection to production database
export DATABASE_URL=postgresql://user:password@host:5432/admin_billing_prod

# Run migrations
pnpm --filter api run migrate:prod
```

### 5. Kubernetes Deployment Example

**api-deployment.yaml**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: admin-billing-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: admin-billing-api
  template:
    metadata:
      labels:
        app: admin-billing-api
    spec:
      containers:
      - name: api
        image: registry/admin-billing-api:latest
        ports:
        - containerPort: 3001
        env:
        - name: DATABASE_HOST
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: host
        - name: DATABASE_PASSWORD
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: password
        livenessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 30
          periodSeconds: 10
```

**web-deployment.yaml**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: admin-billing-web
spec:
  replicas: 3
  selector:
    matchLabels:
      app: admin-billing-web
  template:
    metadata:
      labels:
        app: admin-billing-web
    spec:
      containers:
      - name: web
        image: registry/admin-billing-web:latest
        ports:
        - containerPort: 3000
        env:
        - name: NEXT_PUBLIC_API_URL
          value: "https://api.example.com/api"
```

### 6. Scale Services

```bash
# Scale API
kubectl scale deployment admin-billing-api --replicas=5

# Scale Web
kubectl scale deployment admin-billing-web --replicas=5
```

## Health Checks

### API Health Endpoint

Add to `packages/api/src/main.ts`:
```typescript
@Get('health')
health() {
  return { status: 'ok', timestamp: new Date() };
}
```

Test:
```bash
curl http://localhost:3001/health
```

### Database Health Check

```bash
# From container
docker-compose exec postgres pg_isready -U postgres
```

## Monitoring & Logging

### Log Aggregation

All operations log to:
1. Console (development)
2. Structured JSON logs (production)
3. Audit log database (all admin operations)

### Key Metrics to Monitor

- API response times
- Database connection pool usage
- Audit log volume
- Billing update frequency
- AI model accuracy metrics

### Example Prometheus Metrics

```
admin_billing_requests_total
admin_billing_request_duration_seconds
admin_billing_database_connections
admin_billing_audit_logs_total
```

## Backup & Recovery

### Database Backup

```bash
# Create backup
docker-compose exec postgres pg_dump -U postgres admin_billing > backup.sql

# Restore backup
docker-compose exec -T postgres psql -U postgres admin_billing < backup.sql
```

### Automated Backups

Set up cron job:
```bash
0 2 * * * docker-compose exec -T postgres pg_dump -U postgres admin_billing | gzip > /backups/admin_billing_$(date +\%Y\%m\%d).sql.gz
```

## Troubleshooting

### Database Connection Issues

```bash
# Check if database is running
docker-compose ps

# View database logs
docker-compose logs postgres

# Test connection
docker-compose exec api npm run test:db
```

### API Not Responding

```bash
# Check API logs
docker-compose logs api

# Verify port is open
netstat -tlnp | grep 3001
```

### Frontend Not Loading

```bash
# Check web logs
docker-compose logs web

# Clear cache
docker-compose exec web rm -rf .next

# Rebuild
docker-compose up --build web
```

## Performance Tuning

### Database Optimization

```sql
-- Create indexes for common queries
CREATE INDEX idx_billing_org_status ON billing(organizationId, status);
CREATE INDEX idx_audit_logs_org_date ON audit_logs(organizationId, createdAt DESC);
```

### API Optimization

- Enable gzip compression
- Implement response caching
- Use connection pooling
- Optimize database queries

### Frontend Optimization

- Enable static generation for pages
- Implement code splitting
- Use image optimization
- Enable API route caching

## Security Best Practices

1. **Secrets Management**: Use secret managers (AWS Secrets Manager, HashiCorp Vault)
2. **Database**: Enable SSL/TLS for connections
3. **API**: Use HTTPS in production
4. **CORS**: Restrict to known origins
5. **Rate Limiting**: Implement per-IP rate limits
6. **Audit Logging**: Enable comprehensive logging
7. **Data Encryption**: Encrypt sensitive data at rest and in transit

## Support

For issues or questions, refer to:
- README.md for feature documentation
- API documentation (Swagger/OpenAPI)
- Audit logs for debugging
