# Multi-Service Application

A comprehensive multi-service application with CI/CD pipeline, containerization, and infrastructure as code.

## Architecture Overview

This application consists of three main services:
- **Web Service**: Next.js frontend application (port 3000)
- **Admin Service**: Next.js admin panel (port 3001)  
- **API Service**: Express.js backend API (port 3002)

## Infrastructure Components

- **ECS Fargate**: Container orchestration for all services
- **RDS PostgreSQL**: Primary database
- **OpenSearch**: Search and analytics engine
- **S3**: Object storage for assets, uploads, and backups
- **ElastiCache Redis**: Caching layer
- **Application Load Balancer**: Traffic distribution and SSL termination
- **CloudWatch**: Monitoring and logging
- **Secrets Manager**: Secure credential storage

## Quick Start

### Prerequisites

- Node.js 18+
- Docker
- AWS CLI configured with appropriate permissions
- Terraform 1.0+

### Local Development

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start development servers:**
   ```bash
   npm run dev
   ```

3. **Run tests:**
   ```bash
   npm test
   ```

4. **Build services:**
   ```bash
   npm run build
   ```

### Docker Development

1. **Build all images:**
   ```bash
   npm run docker:build
   ```

2. **Build individual service:**
   ```bash
   npm run docker:build:web
   npm run docker:build:admin
   npm run docker:build:api
   ```

## CI/CD Pipeline

### Workflow Triggers

- **Push to main/develop**: Runs linting, testing, and builds
- **Pull requests**: Full validation including integration tests
- **Tags/Releases**: Builds Docker images, pushes to registry, and deploys infrastructure

### Pipeline Stages

1. **Matrix Testing**: Parallel lint/test/build for each service
2. **Integration Tests**: Database and search service integration
3. **Docker Build**: Multi-stage builds for production images
4. **Infrastructure Validation**: Terraform validation and planning
5. **Deployment**: Automated deployment to ECS
6. **Security Scanning**: Vulnerability scanning with Trivy

### Environment Variables

#### Required for API Service
```bash
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=password
DB_NAME=multiservice

# Search
OPENSEARCH_URL=http://localhost:9200

# Cache
REDIS_URL=redis://localhost:6379

# Application
NODE_ENV=production
PORT=3002
```

#### Required for Web/Admin Services
```bash
NODE_ENV=production
PORT=3000  # or 3001 for admin
```

## Infrastructure as Code

### Terraform Structure

```
infrastructure/
├── main.tf                 # Root configuration
├── modules/
│   ├── ecs/               # ECS cluster and services
│   ├── rds/               # PostgreSQL database
│   ├── opensearch/        # Search cluster
│   ├── s3/                # Storage buckets
│   └── monitoring/        # CloudWatch alarms and dashboards
```

### Deployment Commands

1. **Initialize Terraform:**
   ```bash
   cd infrastructure
   terraform init
   ```

2. **Plan deployment:**
   ```bash
   terraform plan -out=tfplan
   ```

3. **Apply changes:**
   ```bash
   terraform apply tfplan
   ```

4. **Destroy infrastructure:**
   ```bash
   terraform destroy
   ```

## Database Management

### Running Migrations

1. **Run all pending migrations:**
   ```bash
   npm run migration:run
   ```

2. **Revert last migration:**
   ```bash
   npm run migration:revert
   ```

3. **Generate new migration:**
   ```bash
   npm run migration:generate -- MigrationName
   ```

### Search Index Management

1. **Create search index:**
   ```bash
   npm run search:index
   ```

## Health Checks

### Service Endpoints

- **Web Service**: `GET /`
- **Admin Service**: `GET /`
- **API Service**: `GET /api/health`

### Health Check Response Format

```json
{
  "status": "healthy",
  "timestamp": "2023-11-20T19:44:00.000Z",
  "services": {
    "database": "connected",
    "search": "connected"
  }
}
```

## Monitoring and Alerting

### CloudWatch Dashboards

- **Application Dashboard**: ECS, RDS, and OpenSearch metrics
- **Infrastructure Dashboard**: VPC, ALB, and resource utilization

### Alert Types

- **High CPU/Memory**: ECS services, RDS, OpenSearch
- **Low Storage**: RDS free storage space
- **High Connections**: RDS connection count
- **Service Errors**: ALB 5XX error rates
- **Cluster Status**: OpenSearch cluster health

### Log Groups

- `/aws/ec2/{project}-{env}-application`: Application logs
- `/aws/ecs/{project}-{env}`: Container logs
- `/aws/rds/instance/{db-identifier}`: Database logs
- `/aws/opensearch/{domain}`: Search service logs

## Security

### Container Security

- Multi-stage Docker builds for minimal attack surface
- Non-root user execution
- Security scanning with Trivy
- Image vulnerability assessment

### Infrastructure Security

- VPC with private subnets for services
- Security groups with least privilege access
- Encrypted storage (EBS, S3, RDS, OpenSearch)
- KMS-managed encryption keys
- IAM roles with minimal permissions

### Secrets Management

- AWS Systems Manager Parameter Store for configuration
- SecureString type for sensitive data
- Automatic rotation support
- Audit logging for access

## Rollback Strategy

### Application Rollback

1. **ECS Service Rollback:**
   ```bash
   aws ecs update-service \
     --cluster production \
     --service web-service \
     --task-definition previous-task-definition
   ```

2. **Database Rollback:**
   ```bash
   npm run migration:revert
   ```

### Infrastructure Rollback

1. **Terraform State Management:**
   ```bash
   terraform plan -out=rollback-plan -target=resource.to.rollback
   terraform apply rollback-plan
   ```

2. **Version Control:**
   - All infrastructure changes tracked in Git
   - Semantic versioning for releases
   - Branch protection for main branch

## Troubleshooting

### Common Issues

#### Service Not Starting
1. Check CloudWatch logs for the specific service
2. Verify environment variables in ECS task definition
3. Validate security group configurations
4. Check resource limits (CPU/memory)

#### Database Connection Issues
1. Verify RDS instance is running
2. Check security group allows traffic from ECS
3. Validate connection parameters
4. Review VPC routing configuration

#### Search Index Issues
1. Verify OpenSearch cluster is healthy
2. Check index mappings and permissions
3. Review authentication configuration
4. Validate network connectivity

### Debug Commands

```bash
# Check ECS service status
aws ecs describe-services --cluster production --services web-service

# View container logs
aws logs tail /aws/ecs/production --follow

# Check RDS instance status
aws rds describe-db-instances --db-instance-identifier production-db

# Verify OpenSearch domain health
aws opensearch describe-domain --domain-name production-search
```

## Performance Optimization

### Application Performance

- Container resource limits based on usage patterns
- Health checks with appropriate timeouts
- Graceful shutdown handling
- Connection pooling for database

### Infrastructure Performance

- Auto Scaling for ECS services based on metrics
- RDS read replicas for read-heavy workloads
- OpenSearch cluster configuration for search performance
- CloudFront CDN for static assets

## Backup and Disaster Recovery

### Data Backups

- **RDS**: Automated daily backups with 7-day retention
- **S3**: Versioning enabled with lifecycle policies
- **OpenSearch**: Automated snapshots to S3

### Disaster Recovery

- Multi-AZ deployment for high availability
- Infrastructure as Code for quick recreation
- Regular backup restoration testing
- Documentation for recovery procedures

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

### Code Quality Standards

- ESLint for code linting
- Prettier for code formatting
- TypeScript for type safety
- Jest for unit testing
- Integration tests for critical paths

## License

This project is licensed under the MIT License - see the LICENSE file for details.