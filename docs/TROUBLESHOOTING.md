# Troubleshooting Guide

This guide provides comprehensive troubleshooting steps for common issues in the multi-service application.

## Service Health Diagnostics

### Quick Health Check

```bash
# Check all services
curl -I https://example.com/
curl -I https://admin.example.com/
curl https://api.example.com/api/health

# Check AWS CLI access
aws sts get-caller-identity
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

## Container and ECS Issues

### Service Not Starting

#### Symptoms
- 502/503 errors from load balancer
- ECS service showing 0 running tasks
- Container exiting immediately

#### Diagnostic Steps

1. **Check ECS Service Status:**
   ```bash
   aws ecs describe-services --cluster production --services web-service
   ```

2. **View Service Events:**
   ```bash
   aws ecs describe-services --cluster production --services web-service --query 'services[0].events'
   ```

3. **Check Task Definition:**
   ```bash
   aws ecs describe-task-definition --task-definition production-web
   ```

4. **View Container Logs:**
   ```bash
   aws logs tail /aws/ecs/production --log-stream-name-prefix web --follow
   ```

#### Common Fixes

**Memory/CPU Issues:**
```bash
# Check task definition resources
aws ecs describe-task-definition --task-definition production-web --query 'taskDefinition.cpu'
aws ecs describe-task-definition --task-definition production-web --query 'taskDefinition.memory'

# Increase resources if needed
```

**Environment Variable Issues:**
```bash
# Check SSM parameters
aws ssm get-parameters --names "/multiservice/production/db/host" --with-decryption
aws ssm get-parameters --names "/multiservice/production/db/password" --with-decryption
```

**Security Group Issues:**
```bash
# Check security group rules
aws ec2 describe-security-groups --group-ids <sg-id>
```

### Container Crash Loop

#### Symptoms
- Tasks repeatedly stopping and starting
- Exit code 1 or 137 in logs
- Memory/CPU throttling

#### Diagnostic Steps

1. **Get Exit Code:**
   ```bash
   aws logs filter-log-events \
     --log-group-name /aws/ecs/production \
     --filter-pattern "ExitCode"
   ```

2. **Check Resource Usage:**
   ```bash
   aws cloudwatch get-metric-statistics \
     --namespace AWS/ECS \
     --metric-name CPUUtilization \
     --dimensions Name=ServiceName,Value=web-service \
     --start-time $(date -u -v-1H +%Y-%m-%dT%H:%M:%SZ) \
     --end-time $(date -u +%Y-%m-%dT%H:%M:%SZ) \
     --period 60 --statistics Average
   ```

#### Common Fixes

**Increase Memory:**
```bash
# Update task definition with more memory
aws ecs register-task-definition --cli-input-json file://updated-task-def.json
aws ecs update-service --cluster production --service web-service --task-definition new-task-def
```

**Fix Application Code:**
- Check for unhandled exceptions
- Verify graceful shutdown handling
- Check for infinite loops

## Database Issues

### Connection Refused

#### Symptoms
- "Connection refused" errors
- Timeout when connecting to RDS
- API health check failing on database

#### Diagnostic Steps

1. **Test Network Connectivity:**
   ```bash
   # From EC2 instance in same VPC
   nc -zv <rds-endpoint> 5432
   
   # Using telnet
   telnet <rds-endpoint> 5432
   ```

2. **Check RDS Instance Status:**
   ```bash
   aws rds describe-db-instances --db-instance-identifier production-db
   ```

3. **Verify Security Groups:**
   ```bash
   # Check RDS security group allows traffic from ECS
   aws ec2 describe-security-groups --filters Name=group-name,Values=*rds*
   ```

4. **Check VPC Routing:**
   ```bash
   aws ec2 describe-route-tables --filters Name=vpc-id,Values=<vpc-id>
   ```

#### Common Fixes

**Security Group Configuration:**
```bash
# Add inbound rule to RDS security group
aws ec2 authorize-security-group-ingress \
  --group-id <rds-sg-id> \
  --protocol tcp \
  --port 5432 \
  --source <ecs-sg-id>
```

**NACL Configuration:**
```bash
# Check network ACLs
aws ec2 describe-network-acls --filters Name=vpc-id,Values=<vpc-id>
```

### Database Performance Issues

#### Symptoms
- Slow query responses
- High CPU utilization on RDS
- Connection timeouts

#### Diagnostic Steps

1. **Check RDS Metrics:**
   ```bash
   aws cloudwatch get-metric-statistics \
     --namespace AWS/RDS \
     --metric-name CPUUtilization \
     --dimensions Name=DBInstanceIdentifier,Value=production-db \
     --start-time $(date -u -v-1H +%Y-%m-%dT%H:%M:%SZ) \
     --end-time $(date -u +%Y-%m-%dT%H:%M:%SZ) \
     --period 300 --statistics Average
   ```

2. **Check Connection Count:**
   ```bash
   aws cloudwatch get-metric-statistics \
     --namespace AWS/RDS \
     --metric-name DatabaseConnections \
     --dimensions Name=DBInstanceIdentifier,Value=production-db \
     --start-time $(date -u -v-1H +%Y-%m-%dT%H:%M:%SZ) \
     --end-time $(date -u +%Y-%m-%dT%H:%M:%SZ) \
     --period 300 --statistics Average
   ```

3. **Analyze Slow Queries:**
   ```sql
   -- Connect to database and run
   SELECT query, mean_time, calls 
   FROM pg_stat_statements 
   ORDER BY mean_time DESC 
   LIMIT 10;
   ```

#### Common Fixes

**Scale Up RDS Instance:**
```bash
aws rds modify-db-instance \
  --db-instance-identifier production-db \
  --db-instance-class db.t3.medium \
  --apply-immediately
```

**Optimize Queries:**
- Add missing indexes
- Rewrite complex queries
- Implement connection pooling

## OpenSearch Issues

### Cluster Health Problems

#### Symptoms
- Search requests failing
- Cluster status red/yellow
- High CPU on OpenSearch nodes

#### Diagnostic Steps

1. **Check Cluster Health:**
   ```bash
   curl -u admin:password https://<opensearch-endpoint>/_cluster/health
   ```

2. **Check Node Status:**
   ```bash
   curl -u admin:password https://<opensearch-endpoint>/_cat/nodes?v
   ```

3. **Check Index Status:**
   ```bash
   curl -u admin:password https://<opensearch-endpoint>/_cat/indices?v
   ```

4. **Check OpenSearch Metrics:**
   ```bash
   aws cloudwatch get-metric-statistics \
     --namespace AWS/ES \
     --metric-name ClusterStatus.red \
     --dimensions Name=DomainName,Value=production-search,ClientId=<account-id> \
     --start-time $(date -u -v-1H +%Y-%m-%dT%H:%M:%SZ) \
     --end-time $(date -u +%Y-%m-%dT%H:%M:%SZ) \
     --period 60 --statistics Maximum
   ```

#### Common Fixes

**Restart Cluster:**
```bash
aws opensearch update-domain-config \
  --domain-name production-search \
  --cluster-config Options={InstanceCount=2}
```

**Fix Index Mappings:**
```bash
# Recreate problematic index
curl -X DELETE -u admin:password https://<opensearch-endpoint>/problematic-index
curl -X PUT -u admin:password https://<opensearch-endpoint>/problematic-index -d @index-mapping.json
```

## Load Balancer Issues

### 502/503 Errors

#### Symptoms
- Gateway errors from ALB
- Health checks failing
- Service unavailable errors

#### Diagnostic Steps

1. **Check ALB Logs:**
   ```bash
   aws s3 ls s3://your-alb-logs-bucket/
   aws s3 cp s3://your-alb-logs-bucket/2023/11/20/alb-logs.txt - | head -20
   ```

2. **Check Target Group Health:**
   ```bash
   aws elbv2 describe-target-health --target-group-arn <target-group-arn>
   ```

3. **Check ALB Metrics:**
   ```bash
   aws cloudwatch get-metric-statistics \
     --namespace AWS/ApplicationELB \
     --metric-name HTTPCode_Target_5XX_Count \
     --dimensions Name=LoadBalancer,Value=<alb-name> \
     --start-time $(date -u -v-1H +%Y-%m-%dT%H:%M:%SZ) \
     --end-time $(date -u +%Y-%m-%dT%H:%M:%SZ) \
     --period 300 --statistics Sum
   ```

#### Common Fixes

**Health Check Configuration:**
```bash
aws elbv2 modify-target-group \
  --target-group-arn <target-group-arn> \
  --health-check-path /api/health \
  --health-check-interval-seconds 30 \
  --health-check-timeout-seconds 5 \
  --healthy-threshold-count 2 \
  --unhealthy-threshold-count 2
```

**Fix Target Registration:**
```bash
# Ensure targets are registered
aws elbv2 register-targets \
  --target-group-arn <target-group-arn> \
  --targets Id=<instance-id>
```

## SSL/TLS Issues

### Certificate Problems

#### Symptoms
- SSL handshake failures
- Certificate expiration warnings
- Mixed content errors

#### Diagnostic Steps

1. **Check Certificate Status:**
   ```bash
   aws acm describe-certificate --certificate-arn <cert-arn>
   ```

2. **Verify Certificate Chain:**
   ```bash
   openssl s_client -connect example.com:443 -showcerts
   ```

3. **Check ALB Listener:**
   ```bash
   aws elbv2 describe-listeners --load-balancer-arn <alb-arn>
   ```

#### Common Fixes

**Update Certificate:**
```bash
aws elbv2 modify-listener \
  --listener-arn <listener-arn> \
  --certificates CertificateArn=<new-cert-arn>
```

**Fix Mixed Content:**
- Update HTTP resources to HTTPS
- Configure HSTS headers
- Update API endpoints

## Performance Issues

### Slow Response Times

#### Symptoms
- High latency on API calls
- Slow page loads
- Database query timeouts

#### Diagnostic Steps

1. **Check Application Metrics:**
   ```bash
   aws cloudwatch get-metric-statistics \
     --namespace AWS/ECS \
     --metric-name CPUUtilization \
     --dimensions Name=ServiceName,Value=api-service \
     --start-time $(date -u -v-1H +%Y-%m-%dT%H:%M:%SZ) \
     --end-time $(date -u +%Y-%m-%dT%H:%M:%SZ) \
     --period 300 --statistics Average
   ```

2. **Analyze Application Logs:**
   ```bash
   aws logs filter-log-events \
     --log-group-name /aws/ecs/production \
     --filter-pattern "ERROR" \
     --start-time $(date -d '1 hour ago' +%s)000
   ```

3. **Check Database Performance:**
   ```sql
   -- Find slow queries
   SELECT query, mean_time, calls, total_time
   FROM pg_stat_statements
   WHERE mean_time > 1000
   ORDER BY mean_time DESC
   LIMIT 10;
   ```

#### Common Fixes

**Scale Services:**
```bash
# Increase desired count
aws ecs update-service \
  --cluster production \
  --service api-service \
  --desired-count 4

# Enable auto scaling
aws application-autoscaling put-scaling-policy \
  --service-namespace ecs \
  --scalable-dimension ecs:service:DesiredCount \
  --resource-id service/production/api-service \
  --policy-name api-cpu-scaling \
  --policy-type TargetTrackingScaling \
  --target-tracking-scaling-policy-configuration file://scaling-policy.json
```

**Optimize Database:**
```sql
-- Add indexes
CREATE INDEX CONCURRENTLY idx_users_email ON users(email);
CREATE INDEX CONCURRENTLY idx_leads_status ON business_leads(status);

-- Update statistics
ANALYZE;
```

## Security Issues

### Access Denied Errors

#### Symptoms
- 403 Forbidden responses
- IAM permission errors
- Failed authentication

#### Diagnostic Steps

1. **Check IAM Policies:**
   ```bash
   aws iam simulate-principal-policy \
     --policy-source-arn <role-arn> \
     --action-names s3:GetObject \
     --resource-arns arn:aws:s3:::bucket/*
   ```

2. **Check Security Group Rules:**
   ```bash
   aws ec2 describe-security-groups --group-ids <sg-id>
   ```

3. **Check CloudTrail Logs:**
   ```bash
   aws logs filter-log-events \
     --log-group-name /aws/cloudtrail/logs \
     --filter-pattern "AccessDenied"
   ```

#### Common Fixes

**Update IAM Policies:**
```bash
aws iam put-role-policy \
  --role-name ecs-task-role \
  --policy-name s3-access \
  --policy-document file://s3-policy.json
```

**Fix Security Groups:**
```bash
aws ec2 authorize-security-group-ingress \
  --group-id <sg-id> \
  --protocol tcp \
  --port 443 \
  --cidr 0.0.0.0/0
```

## Monitoring and Alerting Issues

### Missing Alerts

#### Symptoms
- No alerts for failures
- CloudWatch alarms not triggering
- Missing notifications

#### Diagnostic Steps

1. **Check Alarm Status:**
   ```bash
   aws cloudwatch describe-alarms --alarm-names <alarm-name>
   ```

2. **Check SNS Topic:**
   ```bash
   aws sns list-subscriptions-by-topic --topic-arn <topic-arn>
   ```

3. **Test Notification:**
   ```bash
   aws sns publish --topic-arn <topic-arn> --message "Test notification"
   ```

#### Common Fixes

**Update Alarm Configuration:**
```bash
aws cloudwatch put-metric-alarm \
  --alarm-name production-cpu-high \
  --alarm-description "CPU usage above 80%" \
  --metric-name CPUUtilization \
  --namespace AWS/ECS \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2 \
  --alarm-actions <sns-topic-arn>
```

**Fix SNS Subscription:**
```bash
aws sns subscribe \
  --topic-arn <topic-arn> \
  --protocol email \
  --notification-endpoint admin@example.com
```

## Emergency Procedures

### Complete Service Outage

1. **Assess Impact:**
   ```bash
   # Check all services
   for service in web admin api; do
     curl -I https://$service.example.com/
   done
   ```

2. **Check Infrastructure:**
   ```bash
   # Verify core services
   aws rds describe-db-instances --db-instance-identifier production-db
   aws opensearch describe-domain --domain-name production-search
   aws ecs describe-clusters --clusters production
   ```

3. **Immediate Recovery:**
   ```bash
   # Restart ECS services
   aws ecs update-service --cluster production --service web-service --force-new-deployment
   aws ecs update-service --cluster production --service admin-service --force-new-deployment
   aws ecs update-service --cluster production --service api-service --force-new-deployment
   ```

4. **Monitor Recovery:**
   ```bash
   # Watch logs
   aws logs tail /aws/ecs/production --follow
   ```

### Database Corruption

1. **Stop Application:**
   ```bash
   aws ecs update-service --cluster production --service api-service --desired-count 0
   ```

2. **Create Backup:**
   ```bash
   aws rds create-db-snapshot \
     --db-instance-identifier production-db \
     --db-snapshot-identifier emergency-backup-$(date +%Y%m%d%H%M%S)
   ```

3. **Restore from Backup:**
   ```bash
   aws rds restore-db-instance-from-db-snapshot \
     --db-instance-identifier production-db-restored \
     --db-snapshot-identifier <last-good-snapshot> \
     --db-instance-class db.t3.micro
   ```

4. **Update Configuration:**
   ```bash
   # Update SSM parameters with new endpoint
   aws ssm put-parameter --name "/multiservice/production/db/host" --value <new-endpoint>
   ```

## Debugging Tools and Commands

### Useful One-Liners

```bash
# Get all ECS task IPs
aws ecs list-tasks --cluster production | jq -r '.taskArns[]' | xargs -I {} aws ecs describe-tasks --cluster production --tasks {}

# Check all RDS metrics
aws cloudwatch list-metrics --namespace AWS/RDS

# Find failed CloudFormation stacks
aws cloudformation describe-stacks | jq '.Stacks[] | select(.StackStatus | contains("FAILED"))'

# Check S3 bucket permissions
aws s3api get-bucket-policy --bucket multiservice-assets

# Test API endpoint
curl -w "@curl-format.txt" -o /dev/null -s https://api.example.com/api/health
```

### Log Analysis

```bash
# Filter errors from last hour
aws logs filter-log-events \
  --log-group-name /aws/ecs/production \
  --start-time $(date -d '1 hour ago' +%s)000 \
  --filter-pattern "ERROR"

# Count error occurrences
aws logs filter-log-events \
  --log-group-name /aws/ecs/production \
  --filter-pattern "ERROR" \
  | jq '.events | length'

# Extract IP addresses from access logs
grep -oE '\b[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\b' access.log | sort | uniq -c | sort -nr
```

### Performance Testing

```bash
# Load test API endpoint
ab -n 1000 -c 10 https://api.example.com/api/health

# Test database connection speed
pgbench -h <rds-endpoint> -U <username> -d <database> -c 10 -j 2 -t 1000

# Test search performance
curl -X POST "https://<opensearch-endpoint>/business-leads/_search" \
  -H 'Content-Type: application/json' \
  -d '{"query": {"match_all": {}}, "size": 100}'
```

## Contact Information

For critical issues:
- **On-call Engineer**: [Phone/Slack]
- **Infrastructure Team**: [Email/Slack]
- **Security Team**: [Email/Slack]

## Documentation Updates

When troubleshooting issues:
1. Document the problem and solution
2. Update this troubleshooting guide
3. Add new common issues and fixes
4. Share knowledge with the team