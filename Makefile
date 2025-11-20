.PHONY: help install dev test migrate openapi clean

help:
	@echo "Available commands:"
	@echo "  make install    - Install dependencies"
	@echo "  make dev        - Run development server"
	@echo "  make worker     - Run Celery worker"
	@echo "  make test       - Run tests"
	@echo "  make migrate    - Run database migrations"
	@echo "  make openapi    - Generate OpenAPI spec"
	@echo "  make docker     - Start Docker services"
	@echo "  make clean      - Clean temporary files"

install:
	pip install -r requirements.txt

dev:
	uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

worker:
	celery -A app.worker.celery_app worker --loglevel=info

test:
	pytest tests/ -v --cov=app --cov-report=term-missing

migrate:
	alembic upgrade head

openapi:
	python scripts/generate_openapi.py

docker:
	docker-compose up -d

docker-logs:
	docker-compose logs -f

docker-down:
	docker-compose down

clean:
	find . -type d -name "__pycache__" -exec rm -rf {} +
	find . -type f -name "*.pyc" -delete
	find . -type f -name "*.pyo" -delete
	find . -type d -name "*.egg-info" -exec rm -rf {} +
	rm -rf .pytest_cache
	rm -rf .coverage
	rm -rf htmlcov
	rm -f test.db
