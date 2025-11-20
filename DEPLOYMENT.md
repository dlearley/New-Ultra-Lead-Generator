# Deployment Guide

## Overview

This guide covers deploying the Webhook & API Key Management system to production.

## Prerequisites

- Python 3.11+
- PostgreSQL 14+
- Redis 6+
- Systemd (for service management) or Docker/Kubernetes

## Environment Variables

Create a `.env` file with production values:

```bash
# Database
DATABASE_URL=postgresql://user:password@db-host:5432/webhooks_db

# Redis
REDIS_URL=redis://redis-host:6379/0

# Security
SECRET_KEY=generate-a-strong-random-secret-key

# API Settings
API_VERSION=v1
ENVIRONMENT=production
LOG_LEVEL=INFO

# Celery
CELERY_BROKER_URL=redis://redis-host:6379/1
CELERY_RESULT_BACKEND=redis://redis-host:6379/2

# Webhook Settings
WEBHOOK_MAX_RETRIES=5
WEBHOOK_INITIAL_RETRY_DELAY=1
WEBHOOK_RETRY_MULTIPLIER=2
WEBHOOK_TIMEOUT=30

# Rate Limiting
DEFAULT_RATE_LIMIT=1000
RATE_LIMIT_WINDOW=3600
```

**⚠️ Security Note:** Never commit `.env` to version control!

## Deployment Options

### Option 1: Docker Compose (Recommended for Quick Start)

1. **Clone the repository:**
```bash
git clone <repository-url>
cd webhook-api-keys
```

2. **Create `.env` file:**
```bash
cp .env.example .env
# Edit .env with your production values
```

3. **Start services:**
```bash
docker-compose up -d
```

4. **Run migrations:**
```bash
docker-compose exec api alembic upgrade head
```

5. **Verify:**
```bash
curl http://localhost:8000/health
```

### Option 2: Manual Deployment

#### 1. Install Dependencies

```bash
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

#### 2. Setup Database

```bash
# Create PostgreSQL database
createdb webhooks_db

# Run migrations
alembic upgrade head
```

#### 3. Create Systemd Services

**API Service** (`/etc/systemd/system/webhooks-api.service`):

```ini
[Unit]
Description=Webhooks API Service
After=network.target postgresql.service redis.service

[Service]
Type=notify
User=www-data
WorkingDirectory=/opt/webhooks-api
Environment="PATH=/opt/webhooks-api/venv/bin"
EnvironmentFile=/opt/webhooks-api/.env
ExecStart=/opt/webhooks-api/venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
Restart=always

[Install]
WantedBy=multi-user.target
```

**Worker Service** (`/etc/systemd/system/webhooks-worker.service`):

```ini
[Unit]
Description=Webhooks Worker Service
After=network.target postgresql.service redis.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/webhooks-api
Environment="PATH=/opt/webhooks-api/venv/bin"
EnvironmentFile=/opt/webhooks-api/.env
ExecStart=/opt/webhooks-api/venv/bin/celery -A app.worker.celery_app worker --loglevel=info --concurrency=4
Restart=always

[Install]
WantedBy=multi-user.target
```

#### 4. Enable and Start Services

```bash
sudo systemctl daemon-reload
sudo systemctl enable webhooks-api webhooks-worker
sudo systemctl start webhooks-api webhooks-worker
sudo systemctl status webhooks-api webhooks-worker
```

### Option 3: Kubernetes

See `k8s/` directory for Kubernetes manifests (not included, create as needed).

## Nginx Configuration

**Reverse Proxy** (`/etc/nginx/sites-available/webhooks-api`):

```nginx
upstream webhooks_api {
    server 127.0.0.1:8000;
}

server {
    listen 80;
    server_name api.yourdomain.com;
    
    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;
    
    ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # API proxy
    location / {
        proxy_pass http://webhooks_api;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
    
    # Static files (if needed)
    location /static {
        alias /opt/webhooks-api/static;
        expires 30d;
    }
    
    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
    limit_req zone=api_limit burst=20 nodelay;
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/webhooks-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## SSL/TLS Configuration

Use Let's Encrypt for free SSL certificates:

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d api.yourdomain.com
```

## Monitoring

### Health Checks

```bash
# API health
curl https://api.yourdomain.com/health

# Expected: {"status": "healthy"}
```

### Logs

**Docker:**
```bash
docker-compose logs -f api
docker-compose logs -f worker
```

**Systemd:**
```bash
journalctl -u webhooks-api -f
journalctl -u webhooks-worker -f
```

### Metrics

Consider adding:
- Prometheus for metrics collection
- Grafana for visualization
- Sentry for error tracking
- Datadog/New Relic for APM

## Database Backups

**PostgreSQL Backup Script:**

```bash
#!/bin/bash
# /opt/webhooks-api/scripts/backup.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR=/backups/webhooks-db
BACKUP_FILE=$BACKUP_DIR/webhooks_db_$DATE.sql.gz

mkdir -p $BACKUP_DIR

pg_dump -h localhost -U webhook_user webhooks_db | gzip > $BACKUP_FILE

# Keep only last 7 days
find $BACKUP_DIR -name "webhooks_db_*.sql.gz" -mtime +7 -delete

echo "Backup completed: $BACKUP_FILE"
```

**Cron Job:**
```bash
# Daily backup at 2 AM
0 2 * * * /opt/webhooks-api/scripts/backup.sh
```

## Scaling

### Horizontal Scaling

1. **API Servers**: Run multiple instances behind a load balancer
2. **Workers**: Increase Celery worker instances
3. **Database**: Use PostgreSQL replication for read replicas
4. **Redis**: Use Redis Cluster or Redis Sentinel

### Vertical Scaling

- Increase server resources (CPU, RAM)
- Optimize database queries
- Add database indexes
- Enable caching

## Security Checklist

- [ ] Use HTTPS for all endpoints
- [ ] Set strong `SECRET_KEY` in production
- [ ] Enable database connection SSL
- [ ] Use Redis AUTH password
- [ ] Restrict database/Redis access by IP
- [ ] Enable firewall rules
- [ ] Regular security updates
- [ ] API rate limiting configured
- [ ] Log monitoring enabled
- [ ] Backup strategy implemented
- [ ] SSL certificates configured
- [ ] Security headers enabled in Nginx
- [ ] Remove default admin credentials

## Performance Tuning

### Database

```sql
-- Add indexes for common queries
CREATE INDEX idx_webhook_deliveries_status ON webhook_deliveries(status);
CREATE INDEX idx_webhook_deliveries_endpoint_id ON webhook_deliveries(endpoint_id);
CREATE INDEX idx_api_keys_organization_id ON api_keys(organization_id);
```

### Redis

```bash
# In redis.conf
maxmemory 2gb
maxmemory-policy allkeys-lru
```

### Uvicorn

```bash
# Use multiple workers (= CPU cores)
uvicorn app.main:app --workers 4 --host 0.0.0.0 --port 8000
```

### Celery

```bash
# Increase concurrency
celery -A app.worker.celery_app worker --concurrency=8
```

## Troubleshooting

### API Not Responding

```bash
# Check service status
sudo systemctl status webhooks-api

# Check logs
journalctl -u webhooks-api -n 100

# Check port
sudo netstat -tlnp | grep 8000
```

### Worker Not Processing Tasks

```bash
# Check worker status
sudo systemctl status webhooks-worker

# Check Celery queue
celery -A app.worker.celery_app inspect active

# Check Redis connection
redis-cli ping
```

### Database Connection Issues

```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Test connection
psql -h localhost -U webhook_user -d webhooks_db

# Check connection limits
psql -c "SELECT count(*) FROM pg_stat_activity;"
```

## Updates and Maintenance

### Deploying Updates

```bash
# Pull latest code
git pull origin main

# Activate virtual environment
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run migrations
alembic upgrade head

# Restart services
sudo systemctl restart webhooks-api webhooks-worker
```

### Database Migrations

```bash
# Check current version
alembic current

# Upgrade to latest
alembic upgrade head

# Rollback one version
alembic downgrade -1
```

## Support

For issues or questions:
- Check logs first
- Review documentation
- Open GitHub issue
- Contact support team

## License

MIT License - See LICENSE file for details
