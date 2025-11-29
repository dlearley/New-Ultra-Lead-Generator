# Multi-Service Application Makefile

.PHONY: help install test lint build docker clean dev infra plan apply destroy

# Default target
help: ## Show this help message
	@echo "Multi-Service Application"
	@echo ""
	@echo "Available commands:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'

# Development
install: ## Install all dependencies
	npm install

dev: ## Start development servers
	npm run dev

dev-web: ## Start web service only
	npm run dev:web

dev-admin: ## Start admin service only
	npm run dev:admin

dev-api: ## Start API service only
	npm run dev:api

# Testing
test: ## Run all tests
	npm run test

test-watch: ## Run tests in watch mode
	npm run test -- --watch

test-coverage: ## Run tests with coverage
	npm run test -- --coverage

lint: ## Run linter
	npm run lint

lint-fix: ## Fix linting issues
	npm run lint:fix

type-check: ## Run TypeScript type check
	npm run type-check

# Building
build: ## Build all services
	npm run build

build-web: ## Build web service only
	npm run build --workspace=web

build-admin: ## Build admin service only
	npm run build --workspace=admin

build-api: ## Build API service only
	npm run build --workspace=api

# Docker
docker: ## Build all Docker images
	npm run docker:build

docker-web: ## Build web Docker image
	npm run docker:build:web

docker-admin: ## Build admin Docker image
	npm run docker:build:admin

docker-api: ## Build API Docker image
	npm run docker:build:api

docker-push: ## Push Docker images to registry
	@echo "Pushing to registry..."
	# Add your registry push commands here

# Database
migration-run: ## Run database migrations
	npm run migration:run --workspace=api

migration-revert: ## Revert last migration
	npm run migration:revert --workspace=api

migration-generate: ## Generate new migration (use NAME=name)
	@if [ -z "$(NAME)" ]; then echo "Usage: make migration-generate NAME=migration_name"; exit 1; fi
	npm run migration:generate --workspace=api -- $(NAME)

search-index: ## Create search index
	npm run search:index --workspace=api

# Infrastructure
infra-init: ## Initialize Terraform
	cd infrastructure && terraform init

infra-plan: ## Plan infrastructure changes
	cd infrastructure && terraform plan

infra-apply: ## Apply infrastructure changes
	cd infrastructure && terraform apply

infra-destroy: ## Destroy infrastructure
	cd infrastructure && terraform destroy

infra-validate: ## Validate Terraform configuration
	cd infrastructure && terraform validate

infra-fmt: ## Format Terraform files
	cd infrastructure && terraform fmt

# CI/CD
ci: ## Run CI pipeline locally
	make lint
	make type-check
	make test
	make build

ci-full: ## Run full CI pipeline with Docker
	make ci
	make docker

# Cleanup
clean: ## Clean build artifacts
	rm -rf node_modules/.cache
	rm -rf services/web/.next
	rm -rf services/admin/.next
	rm -rf services/api/dist
	rm -rf packages/shared/dist
	rm -rf coverage
	rm -rf .terraform
	rm -rf *.tfstate
	rm -rf *.tfstate.backup

clean-docker: ## Clean Docker images and containers
	docker system prune -f
	docker volume prune -f

# Utilities
logs: ## Show application logs
	docker-compose logs -f

status: ## Show service status
	@echo "Web Service: http://localhost:3000"
	@echo "Admin Service: http://localhost:3001"
	@echo "API Service: http://localhost:3002"
	@echo "API Health: http://localhost:3002/api/health"

health: ## Check service health
	@echo "Checking service health..."
	@curl -s http://localhost:3002/api/health | jq '.' || echo "API service not running"

# Production
prod-build: ## Build for production
	NODE_ENV=production make build

prod-test: ## Run production tests
	NODE_ENV=production make test

deploy-staging: ## Deploy to staging
	@echo "Deploying to staging..."
	# Add staging deployment commands here

deploy-production: ## Deploy to production
	@echo "Deploying to production..."
	# Add production deployment commands here

# Monitoring
logs-api: ## Show API service logs
	aws logs tail /aws/ecs/production --log-stream-name-prefix api --follow

logs-web: ## Show web service logs
	aws logs tail /aws/ecs/production --log-stream-name-prefix web --follow

logs-admin: ## Show admin service logs
	aws logs tail /aws/ecs/production --log-stream-name-prefix admin --follow

metrics: ## Show CloudWatch metrics
	@echo "Opening CloudWatch console..."
	aws cloudwatch get-metric-statistics \
		--namespace AWS/ECS \
		--metric-name CPUUtilization \
		--dimensions Name=ServiceName,Value=web-service \
		--start-time $(date -u -v-1H +%Y-%m-%dT%H:%M:%SZ) \
		--end-time $(date -u +%Y-%m-%dT%H:%M:%SZ) \
		--period 300 --statistics Average

# Security
scan: ## Run security scan
	npm audit
	docker run --rm -v $(PWD):/app clair-scanner:latest

# Development tools
shell-api: ## Open shell in API container
	docker exec -it $(docker ps -q -f "name=api") sh

shell-db: ## Open database shell
	@echo "Opening database shell..."
	psql -h localhost -U multiservice_user -d multiservice_production

# Quick start
quick-start: ## Quick start for new developers
	@echo "🚀 Quick start for Multi-Service Application"
	@echo ""
	@echo "1. Installing dependencies..."
	make install
	@echo ""
	@echo "2. Running tests..."
	make test
	@echo ""
	@echo "3. Building services..."
	make build
	@echo ""
	@echo "4. Starting development servers..."
	make dev
	@echo ""
	@echo "✅ Setup complete! Services are starting..."
	@echo "   Web: http://localhost:3000"
	@echo "   Admin: http://localhost:3001"
	@echo "   API: http://localhost:3002"

# Full workflow
full-ci: ## Complete CI/CD workflow
	@echo "🔄 Running complete CI/CD workflow..."
	make clean
	make install
	make lint
	make type-check
	make test
	make build
	make docker
	@echo "✅ CI/CD workflow completed successfully!"

# Environment setup
setup-dev: ## Setup development environment
	@echo "🔧 Setting up development environment..."
	npm install -g nodemon typescript ts-node
	@echo "✅ Development environment setup complete!"

setup-prod: ## Setup production environment
	@echo "🏭 Setting up production environment..."
	@echo "Please ensure you have:"
	@echo "  - AWS CLI configured with appropriate permissions"
	@echo "  - Docker installed and running"
	@echo "  - Terraform installed"
	@echo "  - Required environment variables set"
	@echo ""
	@echo "Then run: make infra-init && make infra-apply"