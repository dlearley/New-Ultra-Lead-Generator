# Environment Variables Configuration

This document outlines all the environment variables required for the multi-service application.

## Service-Specific Variables

### Web Service (Port 3000)

```bash
# Application
NODE_ENV=production
PORT=3000

# API Configuration
NEXT_PUBLIC_API_URL=https://api.example.com

# Feature Flags
NEXT_PUBLIC_FEATURE_FLAG_ANALYTICS=true
NEXT_PUBLIC_FEATURE_FLAG_CHAT=false
```

### Admin Service (Port 3001)

```bash
# Application
NODE_ENV=production
PORT=3001

# API Configuration
NEXT_PUBLIC_API_URL=https://api.example.com

# Authentication
NEXTAUTH_URL=https://admin.example.com
NEXTAUTH_SECRET=your-secret-key

# Feature Flags
NEXT_PUBLIC_FEATURE_FLAG_USER_MANAGEMENT=true
NEXT_PUBLIC_FEATURE_FLAG_SYSTEM_MONITORING=true
```

### API Service (Port 3002)

```bash
# Application
NODE_ENV=production
PORT=3002

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=multiservice_user
DB_PASSWORD=secure-password
DB_NAME=multiservice_production
DB_SSL=true
DB_POOL_MIN=2
DB_POOL_MAX=10

# OpenSearch Configuration
OPENSEARCH_URL=https://search-domain.example.com
OPENSEARCH_USERNAME=admin
OPENSEARCH_PASSWORD=secure-password
OPENSEARCH_INDEX_PREFIX=multiservice

# Redis Configuration
REDIS_URL=redis://cluster.example.com:6379
REDIS_PASSWORD=redis-password
REDIS_DB=0

# JWT Configuration
JWT_SECRET=your-jwt-secret
JWT_EXPIRES_IN=24h

# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
S3_BUCKET_NAME=multiservice-assets

# Email Configuration
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USERNAME=noreply@example.com
SMTP_PASSWORD=smtp-password
SMTP_FROM_EMAIL=noreply@example.com

# Monitoring
SENTRY_DSN=https://your-sentry-dsn
LOG_LEVEL=info

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# CORS Configuration
CORS_ORIGIN=https://example.com,https://admin.example.com
CORS_CREDENTIALS=true
```

## Infrastructure Variables

### Terraform Variables

```bash
# AWS Configuration
aws_region=us-east-1
environment=production
project_name=multiservice

# VPC Configuration
vpc_cidr=10.0.0.0/16
public_subnet_cidrs=["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]
private_subnet_cidrs=["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]

# ECS Configuration
ecs_web_cpu=256
ecs_web_memory=512
ecs_web_desired_count=2

ecs_admin_cpu=256
ecs_admin_memory=512
ecs_admin_desired_count=1

ecs_api_cpu=512
ecs_api_memory=1024
ecs_api_desired_count=2

# RDS Configuration
rds_instance_class=db.t3.micro
rds_allocated_storage=20
rds_max_allocated_storage=100
rds_backup_retention_period=7
rds_multi_az=false

# OpenSearch Configuration
opensearch_instance_type=t3.small.search
opensearch_instance_count=2
opensearch_volume_size=100
opensearch_version=OpenSearch_2.8

# S3 Configuration
s3_lifecycle_transition_days=30
s3_lifecycle_glacier_days=90
s3_lifecycle_deep_archive_days=365
s3_lifecycle_expiration_days=2555
```

## Security Configuration

### SSL/TLS Certificates

```bash
# Certificate Configuration
SSL_CERTIFICATE_ARN=arn:aws:acm:us-east-1:account:certificate/certificate-id
TLS_SECURITY_POLICY=Policy-Min-TLS-1-2-2019-07
```

### Encryption Keys

```bash
# KMS Configuration
KMS_KEY_ID=arn:aws:kms:us-east-1:account:key/key-id
ENCRYPTION_AT_REST_ENABLED=true
NODE_TO_NODE_ENCRYPTION_ENABLED=true
```

## Monitoring and Logging

### CloudWatch Configuration

```bash
# Log Retention
CLOUDWATCH_LOG_RETENTION_DAYS=30

# Alert Configuration
ALERT_EMAIL=alerts@example.com
ALERT_SLACK_WEBHOOK=https://hooks.slack.com/services/your-webhook

# Metric Thresholds
CPU_THRESHOLD=80
MEMORY_THRESHOLD=80
DISK_THRESHOLD=20
CONNECTION_THRESHOLD=150
ERROR_RATE_THRESHOLD=10
```

## Development Environment

### Local Development Variables

```bash
# Database (Local)
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_NAME=multiservice_dev

# Redis (Local)
REDIS_URL=redis://localhost:6379

# OpenSearch (Local)
OPENSEARCH_URL=http://localhost:9200

# Feature Flags
FEATURE_FLAG_DEBUG=true
FEATURE_FLAG_MOCK_SERVICES=false
```

## Testing Environment

### CI/CD Variables

```bash
# Testing Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_NAME=multiservice_test

# Test Configuration
TEST_TIMEOUT=30000
TEST_PARALLEL=true
TEST_COVERAGE_THRESHOLD=80

# Integration Test Services
POSTGRES_CONTAINER=postgres:15
REDIS_CONTAINER=redis:7-alpine
OPENSEARCH_CONTAINER=opensearchproject/opensearch:2.8.0
```

## Environment-Specific Values

### Production

```bash
NODE_ENV=production
LOG_LEVEL=warn
DEBUG=false
ENABLE_PROFILING=false
```

### Staging

```bash
NODE_ENV=staging
LOG_LEVEL=info
DEBUG=true
ENABLE_PROFILING=true
```

### Development

```bash
NODE_ENV=development
LOG_LEVEL=debug
DEBUG=true
ENABLE_PROFILING=true
HOT_RELOAD=true
```

## Secret Management

### AWS Systems Manager Parameter Store

Parameters are stored in the hierarchy: `/{project}/{environment}/{service}/{parameter}`

```bash
# Database Secrets
/multiservice/production/db/host
/multiservice/production/db/port
/multiservice/production/db/username
/multiservice/production/db/password
/multiservice/production/db/name

# OpenSearch Secrets
/multiservice/production/opensearch/url
/multiservice/production/opensearch/username
/multiservice/production/opensearch/password

# Redis Secrets
/multiservice/production/redis/url
/multiservice/production/redis/password

# Application Secrets
/multiservice/production/jwt/secret
/multiservice/production/nextauth/secret
```

## Configuration Validation

### Required Variables Check

The application validates required environment variables on startup:

```typescript
// Example validation in API service
const requiredEnvVars = [
  'DB_HOST',
  'DB_USERNAME', 
  'DB_PASSWORD',
  'DB_NAME',
  'OPENSEARCH_URL',
  'REDIS_URL',
  'JWT_SECRET'
];

requiredEnvVars.forEach(varName => {
  if (!process.env[varName]) {
    throw new Error(`Missing required environment variable: ${varName}`);
  }
});
```

### Variable Type Validation

```typescript
// Example type validation
const config = {
  port: parseInt(process.env.PORT || '3002'),
  dbPort: parseInt(process.env.DB_PORT || '5432'),
  sslEnabled: process.env.DB_SSL === 'true',
  logLevel: process.env.LOG_LEVEL || 'info'
};
```

## Best Practices

1. **Use SecureString** for sensitive data in Parameter Store
2. **Rotate secrets** regularly using AWS Secrets Manager
3. **Never commit** secrets to version control
4. **Use different** credentials for each environment
5. **Implement least privilege** access for IAM roles
6. **Enable audit logging** for parameter access
7. **Use environment-specific** configurations
8. **Validate** all required variables on startup