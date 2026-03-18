#!/bin/bash

# Ultra Lead Generator - Deployment Script
# Usage: ./scripts/deploy.sh [environment]
# Environment: development (default) | staging | production

set -e

ENVIRONMENT=${1:-development}
echo "🚀 Deploying Ultra Lead Generator to $ENVIRONMENT..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ==========================================
# Validation
# ==========================================

echo ""
echo "📋 Validating environment..."

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${RED}❌ .env file not found!${NC}"
    echo "Please copy .env.example to .env and configure it:"
    echo "  cp .env.example .env"
    exit 1
fi

# Load environment variables
export $(grep -v '^#' .env | xargs)

# Check required environment variables
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}❌ DATABASE_URL not set in .env${NC}"
    exit 1
fi

if [ "$JWT_SECRET" = "your-super-secret-jwt-key-change-in-production" ]; then
    echo -e "${YELLOW}⚠️  Using default JWT_SECRET. Please change this in production!${NC}"
fi

# ==========================================
# Database Setup
# ==========================================

echo ""
echo "🗄️  Setting up database..."

cd apps/api

# Check if PostgreSQL is running
if command -v docker &> /dev/null; then
    echo "Checking PostgreSQL container..."
    if ! docker ps | grep -q "ultra-leads-postgres"; then
        echo "Starting PostgreSQL with Docker..."
        docker-compose up -d postgres redis
        sleep 5
    fi
else
    echo -e "${YELLOW}⚠️  Docker not found. Assuming PostgreSQL is running locally.${NC}"
fi

# Wait for database to be ready
echo "Waiting for database..."
max_attempts=30
attempt=0
while ! npx prisma db execute --stdin <<< "SELECT 1" 2>/dev/null; do
    attempt=$((attempt + 1))
    if [ $attempt -eq $max_attempts ]; then
        echo -e "${RED}❌ Database connection failed after $max_attempts attempts${NC}"
        exit 1
    fi
    echo "  Attempt $attempt/$max_attempts..."
    sleep 2
done

echo -e "${GREEN}✅ Database connected${NC}"

# ==========================================
# Database Migrations
# ==========================================

echo ""
echo "🔄 Running database migrations..."

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate deploy

echo -e "${GREEN}✅ Migrations complete${NC}"

# ==========================================
# Seed Data (Optional)
# ==========================================

echo ""
read -p "🌱 Seed database with sample data? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Seeding database..."
    npx prisma db seed
    echo -e "${GREEN}✅ Database seeded${NC}"
fi

# ==========================================
# Build Application
# ==========================================

echo ""
echo "🔨 Building application..."

cd ../..

# Install dependencies
pnpm install

# Build API
echo "Building API..."
cd apps/api
pnpm build

# Build Web
echo "Building Web..."
cd ../web
pnpm build

cd ../..

echo -e "${GREEN}✅ Build complete${NC}"

# ==========================================
# Health Check
# ==========================================

echo ""
echo "🏥 Running health checks..."

# Start API in background for health check
cd apps/api
pnpm start &
API_PID=$!

# Wait for API to start
sleep 5

# Health check
if curl -s http://localhost:3001/health > /dev/null; then
    echo -e "${GREEN}✅ API health check passed${NC}"
else
    echo -e "${YELLOW}⚠️  API health check failed (may need manual verification)${NC}"
fi

# Kill background API
kill $API_PID 2>/dev/null || true

cd ../..

# ==========================================
# Summary
# ==========================================

echo ""
echo "=========================================="
echo -e "${GREEN}✅ Deployment Complete!${NC}"
echo "=========================================="
echo ""
echo "Next steps:"
echo ""
echo "1. Start the development server:"
echo "   pnpm dev"
echo ""
echo "2. Or start with Docker:"
echo "   docker-compose up"
echo ""
echo "3. Access the application:"
echo "   Web: http://localhost:3000"
echo "   API: http://localhost:3001"
echo ""
echo "4. Run tests:"
echo "   pnpm test"
echo ""

if [ "$ENVIRONMENT" = "production" ]; then
    echo -e "${YELLOW}⚠️  Production Checklist:${NC}"
    echo "  - [ ] Changed default JWT_SECRET"
    echo "  - [ ] Changed default ENCRYPTION_KEY"
    echo "  - [ ] Configured SSL certificates"
    echo "  - [ ] Set up monitoring (Sentry)"
    echo "  - [ ] Configured backup strategy"
    echo "  - [ ] Added rate limiting"
    echo ""
fi

echo -e "${GREEN}🎉 Ultra Lead Generator is ready!${NC}"
