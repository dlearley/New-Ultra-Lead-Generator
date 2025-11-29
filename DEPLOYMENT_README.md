# Multi-Service Application CI/CD and Infrastructure

This repository contains a complete multi-service application with:

- **Three services**: Web (Next.js), Admin (Next.js), API (Express.js)
- **CI/CD Pipeline**: GitHub Actions with matrix builds, testing, and deployment
- **Infrastructure as Code**: Terraform modules for AWS ECS, RDS, OpenSearch, S3
- **Containerization**: Docker multi-stage builds for all services
- **Monitoring**: CloudWatch alarms, dashboards, and log aggregation
- **Security**: SSL/TLS, encryption, secrets management, and scanning

## Quick Start

1. **Local Development:**
   ```bash
   npm install
   npm run dev
   ```

2. **Run Tests:**
   ```bash
   npm test
   ```

3. **Build Services:**
   ```bash
   npm run build
   ```

4. **Deploy Infrastructure:**
   ```bash
   cd infrastructure
   terraform init
   terraform apply
   ```

## Services

- **Web Service**: `http://localhost:3000` - Main frontend application
- **Admin Service**: `http://localhost:3001` - Administrative interface  
- **API Service**: `http://localhost:3002` - Backend API with health check at `/api/health`

## CI/CD Pipeline

The GitHub Actions workflow includes:

- **Matrix Testing**: Parallel lint/test/build for each service
- **Integration Tests**: Database, Redis, and OpenSearch integration
- **Docker Builds**: Multi-stage builds with security scanning
- **Infrastructure Validation**: Terraform validation and planning
- **Automated Deployment**: ECS service updates on tags/releases
- **Security Scanning**: Trivy vulnerability scanning

## Infrastructure Components

- **ECS Fargate**: Container orchestration with auto-scaling
- **RDS PostgreSQL**: Primary database with automated backups
- **OpenSearch**: Search and analytics cluster
- **S3**: Object storage with lifecycle policies
- **ElastiCache Redis**: In-memory caching
- **Application Load Balancer**: SSL termination and traffic distribution
- **CloudWatch**: Monitoring, logging, and alerting

## Documentation

- [README.md](README.md) - Complete application documentation
- [DEPLOYMENT.md](docs/DEPLOYMENT.md) - Step-by-step deployment guide
- [ENVIRONMENT_VARIABLES.md](docs/ENVIRONMENT_VARIABLES.md) - Configuration reference
- [TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) - Common issues and solutions

## Acceptance Criteria

✅ **CI passes with artifact uploads**: Matrix lint/test/build produces Docker images and test results

✅ **Tagged builds produce container images + IaC plans**: On tags/releases, Docker images are built/pushed and Terraform plans are generated

✅ **README/docs explain deployment + troubleshooting**: Comprehensive documentation covers all aspects of deployment and maintenance

## Features

### Development
- TypeScript for type safety
- ESLint and Prettier for code quality
- Jest for unit and integration testing
- Hot reload for local development

### Production
- Multi-stage Docker builds for minimal images
- Health checks and graceful shutdowns
- Auto-scaling based on metrics
- Rolling deployments with zero downtime

### Security
- Container security scanning
- Encrypted storage and transit
- Secrets management with AWS SSM
- SSL/TLS with certificate management

### Monitoring
- CloudWatch dashboards and alarms
- Structured logging with correlation IDs
- Performance metrics and error tracking
- Automated alerting via SNS

### Reliability
- Multi-AZ deployment for high availability
- Automated backups and disaster recovery
- Circuit breakers and retry logic
- Comprehensive error handling

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes with tests
4. Submit a pull request

## License

MIT License - see LICENSE file for details.