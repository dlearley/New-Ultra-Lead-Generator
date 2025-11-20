.PHONY: docker-up docker-down docker-logs logs-% db-migrate-phase2 connectors-phase3

ENV_FILE ?= .env

docker-up:
	@echo "Starting local infrastructure..."
	docker compose --env-file $${ENV_FILE} up -d --build --remove-orphans
	docker compose ps

docker-down:
	@echo "Stopping containers..."
	docker compose --env-file $${ENV_FILE} down --remove-orphans -v

docker-logs:
	docker compose logs -f --tail=200

logs-%:
	docker compose logs -f $*

db-migrate-phase2:
	bash ./scripts/migrations/phase-2/apply.sh

connectors-phase3:
	bash ./connectors/phase-3/run.sh
