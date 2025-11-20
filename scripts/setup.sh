#!/bin/bash

# CRM Integration Platform Setup Script

echo "🚀 Setting up CRM Integration Platform..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo "⚠️  PostgreSQL is not installed. Please install PostgreSQL for the database."
fi

# Check if Redis is installed
if ! command -v redis-cli &> /dev/null; then
    echo "⚠️  Redis is not installed. Please install Redis for the queue system."
fi

echo "✅ Prerequisites check completed"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

# Setup API
echo "🔧 Setting up API..."
cd apps/api

# Install API dependencies
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install API dependencies"
    exit 1
fi

# Generate Prisma client
echo "🗄️  Generating Prisma client..."
npx prisma generate

if [ $? -ne 0 ]; then
    echo "❌ Failed to generate Prisma client"
    exit 1
fi

# Setup database (requires DATABASE_URL)
if [ -z "$DATABASE_URL" ]; then
    echo "⚠️  DATABASE_URL not set. Please configure it in apps/api/.env"
    echo "   Example: DATABASE_URL=\"postgresql://username:password@localhost:5432/crm_integration\""
else
    echo "🏗️  Setting up database..."
    npx prisma db push

    if [ $? -ne 0 ]; then
        echo "❌ Failed to setup database. Please check your DATABASE_URL."
        exit 1
    fi
fi

# Setup Web App
echo "🎨 Setting up Web App..."
cd ../web

# Install web dependencies
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install web dependencies"
    exit 1
fi

cd ../..

echo "✅ Setup completed successfully!"
echo ""
echo "🎯 Next steps:"
echo "1. Configure your environment variables:"
echo "   - Copy apps/api/.env.example to apps/api/.env"
echo "   - Copy apps/web/.env.local.example to apps/web/.env.local"
echo "   - Update with your database, Redis, and CRM credentials"
echo ""
echo "2. Start the development servers:"
echo "   - API: npm run start:api (port 3001)"
echo "   - Web: npm run start:web (port 3000)"
echo ""
echo "3. Access the application:"
echo "   - Dashboard: http://localhost:3000"
echo "   - API Health: http://localhost:3001/api/integrations/health"
echo ""
echo "📚 For more information, see README.md"