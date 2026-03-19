#!/bin/bash

# Ultra Lead Generator - Production Deployment Script
# Usage: ./deploy.sh [environment]
# Environment: production (default), staging

set -e

ENV=${1:-production}
APP_NAME="ultra-lead-generator"
VERSION=$(git describe --tags --always --dirty 2>/dev/null || echo "latest")

echo "🚀 Deploying Ultra Lead Generator to $ENV"
echo "Version: $VERSION"
echo ""

# Configuration
if [ "$ENV" == "production" ]; then
  SERVER_IP=${SERVER_IP:-"your-production-server-ip"}
  DOMAIN=${DOMAIN:-"api.yourdomain.com"}
  DB_NAME="ultralead_prod"
elif [ "$ENV" == "staging" ]; then
  SERVER_IP=${SERVER_IP:-"your-staging-server-ip"}
  DOMAIN=${DOMAIN:-"api-staging.yourdomain.com"}
  DB_NAME="ultralead_staging"
else
  echo "❌ Unknown environment: $ENV"
  exit 1
fi

echo "📋 Pre-deployment checklist..."
echo "  - Environment: $ENV"
echo "  - Server: $SERVER_IP"
echo "  - Domain: $DOMAIN"
echo "  - Database: $DB_NAME"
echo ""

# Build applications
echo "🔨 Building applications..."
cd apps/api
npm install
npm run build
cd ../web
npm install
npm run build
cd ../..

# Database migrations
echo "🗄️ Running database migrations..."
cd apps/api
npx prisma migrate deploy
cd ../..

# Create deployment package
echo "📦 Creating deployment package..."
DEPLOY_DIR="deploy-$VERSION"
mkdir -p $DEPLOY_DIR
cp -r apps/api/dist $DEPLOY_DIR/api
cp -r apps/web/dist $DEPLOY_DIR/web
cp apps/api/package.json $DEPLOY_DIR/api/
cp apps/api/prisma/schema.prisma $DEPLOY_DIR/api/prisma/
cp docker-compose.yml $DEPLOY_DIR/
cp .env.example $DEPLOY_DIR/.env

# Update environment file
sed -i "s/NODE_ENV=development/NODE_ENV=$ENV/g" $DEPLOY_DIR/.env
sed -i "s/DATABASE_URL=.*/DATABASE_URL=postgresql:\/\/user:pass@localhost:5433\/$DB_NAME/g" $DEPLOY_DIR/.env

echo ""
echo "📤 Uploading to server..."

# Create remote directory
ssh root@$SERVER_IP "mkdir -p /opt/$APP_NAME"

# Upload files
scp -r $DEPLOY_DIR/* root@$SERVER_IP:/opt/$APP_NAME/
scp docker-compose.yml root@$SERVER_IP:/opt/$APP_NAME/
scp -r apps/api/prisma root@$SERVER_IP:/opt/$APP_NAME/api/

echo ""
echo "🔧 Running remote deployment..."

ssh root@$SERVER_IP << EOF
  cd /opt/$APP_NAME

  # Pull latest images
  docker-compose pull

  # Start services
  docker-compose up -d

  # Run migrations
  docker-compose exec -T api npx prisma migrate deploy

  # Health check
  sleep 5
  if curl -sf http://localhost:3001/health; then
    echo "✅ Health check passed"
  else
    echo "❌ Health check failed"
    exit 1
  fi

  # Reload nginx
  nginx -t && systemctl reload nginx
EOF

echo ""
echo "✅ Deployment complete!"
echo ""
echo "🔗 URLs:"
echo "  API: https://$DOMAIN"
echo "  Health: https://$DOMAIN/health"
echo ""
echo "📊 Monitor:"
echo "  docker-compose -f /opt/$APP_NAME/docker-compose.yml logs -f"
echo ""

# Cleanup
rm -rf $DEPLOY_DIR

echo "🎉 Done!"
