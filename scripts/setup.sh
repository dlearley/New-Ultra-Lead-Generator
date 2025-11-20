#!/bin/bash

echo "=== Webhook & API Key Management Setup ==="
echo ""

echo "Checking prerequisites..."

if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed"
    exit 1
fi
echo "✓ Python 3 found"

if ! command -v pip &> /dev/null; then
    echo "❌ pip is not installed"
    exit 1
fi
echo "✓ pip found"

echo ""
echo "Installing Python dependencies..."
pip install -r requirements.txt

echo ""
echo "Checking environment variables..."
if [ ! -f .env ]; then
    echo "Creating .env file from template..."
    cp .env.example .env
    echo "⚠️  Please edit .env with your configuration"
else
    echo "✓ .env file exists"
fi

echo ""
echo "Checking database connection..."
if command -v docker &> /dev/null; then
    echo "Docker found. Starting services..."
    docker-compose up -d postgres redis
    sleep 5
    echo "✓ Database services started"
else
    echo "⚠️  Docker not found. Make sure PostgreSQL and Redis are running"
fi

echo ""
echo "Running database migrations..."
alembic upgrade head

echo ""
echo "Generating OpenAPI specification..."
python scripts/generate_openapi.py

echo ""
echo "=== Setup Complete ==="
echo ""
echo "Next steps:"
echo "1. Review and update .env with your configuration"
echo "2. Start the API server: make dev"
echo "3. Start the worker: make worker (in another terminal)"
echo "4. Visit http://localhost:8000/admin for the admin UI"
echo "5. View API docs at http://localhost:8000/docs"
echo ""
echo "For Docker deployment:"
echo "  docker-compose up -d"
echo ""
