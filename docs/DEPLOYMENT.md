# Deployment Guide

This guide provides step-by-step instructions for deploying the multi-service application to AWS.

## Prerequisites

### AWS Account Setup

1. **Configure AWS CLI:**
   ```bash
   aws configure
   ```

2. **Verify permissions:**
   - AdministratorAccess or equivalent IAM permissions
   - Service access for ECS, RDS, OpenSearch, S3, CloudWatch

3. **Create S3 bucket for Terraform state:**
   ```bash
   aws s3 mb s3://multiservice-terraform-state
   aws s3api put-bucket-versioning --bucket multiservice-terraform-state --versioning-configuration Status=Enabled
   ```

### Local Tools

- Node.js 18+
- Docker Desktop
- Terraform 1.0+
- AWS CLI 2.0+

## Infrastructure Deployment

### 1. Clone and Setup Repository

```bash
git clone <repository-url>
cd multiservice-app
npm install
```

### 2. Configure Terraform Backend

Edit `infrastructure/main.tf` to update the backend configuration:

```hcl
backend "s3" {
  bucket = "multiservice-terraform-state"
  key    = "terraform.tfstate"
  region = "us-east-1"
  dynamodb_table = "multiservice-terraform-locks"
}
```

### 3. Initialize Terraform

```bash
cd infrastructure
terraform init
```

### 4. Plan Infrastructure

```bash
# For production
terraform plan -var="environment=production" -out=production.tfplan

# For staging
terraform plan -var="environment=staging" -out=staging.tfplan
```

### 5. Deploy Infrastructure

```bash
# Apply production plan
terraform apply production.tfplan

# Or for staging
terraform apply staging.tfplan
```

### 6. Configure Secrets

After infrastructure deployment, configure secrets in AWS Systems Manager:

```bash
# Database credentials
aws ssm put-parameter --name "/multiservice/production/db/host" --value "your-rds-endpoint" --type String
aws ssm put-parameter --name "/multiservice/production/db/password" --value "secure-password" --type SecureString

# OpenSearch credentials
aws ssm put-parameter --name "/multiservice/production/opensearch/url" --value "your-opensearch-endpoint" --type SecureString

# Redis credentials
aws ssm put-parameter --name "/multiservice/production/redis/url" --value "your-redis-endpoint" --type SecureString
```

## Application Deployment

### Option 1: Automated via GitHub Actions

1. **Tag the release:**
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

2. **Create GitHub Release:**
   - Go to repository releases page
   - Create new release from the tag
   - CI/CD pipeline will automatically deploy

### Option 2: Manual Docker Deployment

1. **Build Docker images:**
   ```bash
   npm run docker:build
   ```

2. **Tag images for ECR:**
   ```bash
   # Login to ECR
   aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com

   # Tag and push images
   docker tag multiservice-web:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/multiservice-web:v1.0.0
   docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/multiservice-web:v1.0.0

   # Repeat for admin and api services
   ```

3. **Update ECS task definitions:**
   ```bash
   # Update task definitions with new image
   aws ecs register-task-definition --cli-input-json file://task-definition-web.json
   aws ecs register-task-definition --cli-input-json file://task-definition-admin.json
   aws ecs register-task-definition --cli-input-json file://task-definition-api.json
   ```

4. **Update ECS services:**
   ```bash
   aws ecs update-service --cluster production --service web-service --force-new-deployment
   aws ecs update-service --cluster production --service admin-service --force-new-deployment
   aws ecs update-service --cluster production --service api-service --force-new-deployment
   ```

## Database Setup

### 1. Connect to RDS Instance

```bash
# Using psql
psql -h your-rds-endpoint -U multiservice_user -d multiservice_production

# Or using SSH tunnel if needed
ssh -L 5432:your-rds-endpoint:5432 your-bastion-host
```

### 2. Run Database Migrations

```bash
# From application directory
npm run migration:run --workspace=api
```

### 3. Create Search Index

```bash
npm run search:index --workspace=api
```

### 4. Seed Initial Data (Optional)

```bash
# Create admin user
npm run seed:admin --workspace=api
```

## SSL Certificate Setup

### Option 1: AWS Certificate Manager (Recommended)

1. **Request Certificate:**
   ```bash
   aws acm request-certificate --domain-name example.com --subject-alternative-names www.example.com,admin.example.com,api.example.com
   ```

2. **Validate Domain:**
   - Add DNS records as provided by ACM
   - Wait for validation to complete

3. **Update Load Balancer:**
   ```bash
   aws elbv2 modify-listener --listener-arn <listener-arn> --certificates CertificateArn=<cert-arn>
   ```

### Option 2: Let's Encrypt with Certbot

1. **Install Certbot:**
   ```bash
   sudo apt-get update
   sudo apt-get install certbot
   ```

2. **Generate Certificates:**
   ```bash
   certbot certonly --standalone -d example.com -d www.example.com -d admin.example.com -d api.example.com
   ```

3. **Upload to ACM:**
   ```bash
   aws acm import-certificate --certificate file://cert.pem --private-key file://privkey.pem --certificate-chain file://chain.pem
   ```

## DNS Configuration

### Route 53 Setup

1. **Create Hosted Zone:**
   ```bash
   aws route53 create-hosted-zone --name example.com --caller-reference $(date +%s)
   ```

2. **Add Records:**
   ```json
   {
     "Comment": "Load balancer records",
     "Changes": [
       {
         "Action": "CREATE",
         "ResourceRecordSet": {
           "Name": "example.com",
           "Type": "A",
           "AliasTarget": {
             "HostedZoneId": "Z35SXDOTRQ7X7K",
             "DNSName": "your-alb-dns-name",
             "EvaluateTargetHealth": false
           }
         }
       },
       {
         "Action": "CREATE", 
         "ResourceRecordSet": {
           "Name": "admin.example.com",
           "Type": "A",
           "AliasTarget": {
             "HostedZoneId": "Z35SXDOTRQ7X7K",
             "DNSName": "your-alb-dns-name",
             "EvaluateTargetHealth": false
           }
         }
       }
     ]
   }
   ```

## Monitoring Setup

### 1. Configure CloudWatch Alarms

Alarms are automatically created by Terraform. Verify they're active:

```bash
aws cloudwatch describe-alarms --alarm-names-prefix multiservice-production
```

### 2. Set Up Notification Channels

Update SNS topic subscriptions:

```bash
aws sns subscribe --topic-arn <sns-topic-arn> --protocol email --notification-endpoint alerts@example.com
aws sns subscribe --topic-arn <sns-topic-arn> --protocol https --notification-endpoint <slack-webhook-url>
```

### 3. Create Dashboards

Access CloudWatch console and view the automatically created dashboards:
- `{project}-{env}-application-dashboard`

## Health Checks

### Verify Service Health

```bash
# Web service
curl -I https://example.com/

# Admin service  
curl -I https://admin.example.com/

# API service
curl https://api.example.com/api/health
```

### Expected Health Response

```json
{
  "status": "healthy",
  "timestamp": "2023-11-20T19:44:00.000Z",
  "services": {
    "database": "connected",
    "search": "connected",
    "cache": "connected"
  }
}
```

## Scaling Configuration

### Auto Scaling Setup

1. **Create Auto Scaling Target:**
   ```bash
   aws application-autoscaling register-scalable-target \
     --service-namespace ecs \
     --scalable-dimension ecs:service:DesiredCount \
     --resource-id service/production/web-service \
     --min-capacity 2 \
     --max-capacity 10
   ```

2. **Create Scaling Policies:**
   ```bash
   # CPU-based scaling
   aws application-autoscaling put-scaling-policy \
     --service-namespace ecs \
     --scalable-dimension ecs:service:DesiredCount \
     --resource-id service/production/web-service \
     --policy-name web-cpu-scaling \
     --policy-type TargetTrackingScaling \
     --target-tracking-scaling-policy-configuration file://cpu-scaling-policy.json
   ```

## Backup and Recovery

### Database Backups

Backups are configured automatically. Verify:

```bash
aws rds describe-db-snapshots --db-instance-identifier multiservice-production-db
```

### Manual Backup

```bash
aws rds create-db-snapshot --db-instance-identifier multiservice-production-db --db-snapshot-identifier manual-backup-$(date +%Y%m%d)
```

### Restore from Backup

```bash
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier multiservice-production-db-restored \
  --db-snapshot-identifier manual-backup-20231120 \
  --db-instance-class db.t3.micro \
  --port 5432 \
  --availability-zone us-east-1a
```

## Troubleshooting

### Common Issues and Solutions

#### Service Not Starting

1. **Check ECS service events:**
   ```bash
   aws ecs describe-services --cluster production --services web-service
   ```

2. **View container logs:**
   ```bash
   aws logs tail /aws/ecs/production --follow
   ```

3. **Verify task definition:**
   ```bash
   aws ecs describe-task-definition --task-definition production-web
   ```

#### Database Connection Issues

1. **Test connectivity:**
   ```bash
   nc -zv your-rds-endpoint 5432
   ```

2. **Check security groups:**
   ```bash
   aws ec2 describe-security-groups --group-ids <sg-id>
   ```

3. **Verify credentials:**
   ```bash
   aws ssm get-parameters --names "/multiservice/production/db/password" --with-decryption
   ```

#### Load Balancer Issues

1. **Check ALB logs:**
   ```bash
   aws s3 ls s3://your-alb-logs-bucket/
   ```

2. **Verify target group health:**
   ```bash
   aws elbv2 describe-target-health --target-group-arn <target-group-arn>
   ```

## Rollback Procedures

### Application Rollback

1. **Identify previous task definition:**
   ```bash
   aws ecs list-task-definitions --family-prefix production-web
   ```

2. **Update service with previous version:**
   ```bash
   aws ecs update-service \
     --cluster production \
     --service web-service \
     --task-definition <previous-task-def-arn>
   ```

### Infrastructure Rollback

1. **Review Terraform state:**
   ```bash
   terraform show
   ```

2. **Plan selective rollback:**
   ```bash
   terraform plan -target=aws_instance.example -out=rollback.tfplan
   terraform apply rollback.tfplan
   ```

### Database Rollback

1. **Identify migration to revert:**
   ```bash
   npm run migration:show --workspace=api
   ```

2. **Revert migration:**
   ```bash
   npm run migration:revert --workspace=api
   ```

## Post-Deployment Checklist

- [ ] All services are healthy
- [ ] Database migrations completed
- [ ] Search index created
- [ ] SSL certificates valid
- [ ] DNS records resolving
- [ ] Monitoring alerts configured
- [ ] Backup policies active
- [ ] Security groups configured
- [ ] Load balancer distributing traffic
- [ ] Auto scaling policies active
- [ ] Log aggregation working
- [ ] Performance metrics collected
- [ ] Documentation updated