#!/bin/bash

# Admin Data Sources Management System - Development Setup

echo "🛠️  Setting up development environment..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2)
REQUIRED_VERSION="18.0.0"

if ! node -e "process.exit(require('semver').gte('$NODE_VERSION', '$REQUIRED_VERSION') ? 0 : 1)" 2>/dev/null; then
    echo "❌ Node.js version $NODE_VERSION is too old. Please upgrade to v18+"
    exit 1
fi

# Setup backend
echo "📦 Setting up backend..."
cd backend
if [ ! -f ".env" ]; then
    cp .env.example .env
    echo "📝 Created backend .env file - please configure it"
fi

if [ ! -d "node_modules" ]; then
    npm install
fi

# Setup frontend
echo "📦 Setting up frontend..."
cd ../frontend
if [ ! -d "node_modules" ]; then
    npm install
fi

# Go back to project root
cd ..

echo ""
echo "✅ Development environment setup complete!"
echo ""
echo "🔧 To start development servers:"
echo "   Backend:  cd backend && npm run dev"
echo "   Frontend: cd frontend && npm run dev"
echo ""
echo "🐳 Or use Docker: ./start.sh"
echo ""
echo "📝 Don't forget to:"
echo "   1. Configure backend/.env with your database settings"
echo "   2. Set up PostgreSQL database"
echo "   3. Run database migrations: cd backend && npm run build && node dist/index.js"