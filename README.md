# Local infrastructure stack

This repository ships an opinionated Docker Compose stack that mirrors the services required for the Phase 2/Phase 3 applications: PostgreSQL (with pgvector), Redis with a BullMQ dashboard, OpenSearch, and optional S3-compatible storage via MinIO.

## What's included

| Service | Image | Port(s) | Notes |
| --- | --- | --- | --- |
| PostgreSQL + pgvector | `pgvector/pgvector:pg16` | `5432` | Persistent volume `postgres_data` and health checks enabled |
| Redis | `redis:7.2-alpine` | `6379` | Persists data under `redis_data` |
| BullMQ dashboard | Custom Node service | `3002` | Basic-auth protected dashboard backed by Redis |
| OpenSearch | `opensearchproject/opensearch:2.11.0` | `9200`, `9600` | Runs single node with security bootstrap password |
| MinIO | `minio/minio:RELEASE.2024-05-10T01-41-38Z` | `9000`, `9001` | Optional file storage + automatic bucket bootstrap |

The stack attaches every service to the named `app-infra` bridge network and persists data with dedicated Docker volumes. Health checks ensure dependent services (for example the BullMQ dashboard) only start after their backing service is ready.

## Quick start

1. Copy the environment templates:
   ```bash
   cp .env.example .env
   cp apps/web/.env.example apps/web/.env
   cp apps/admin/.env.example apps/admin/.env
   cp apps/api/.env.example apps/api/.env
   ```
2. (Optional) install pnpm locally so you can reuse the provided scripts: https://pnpm.io/installation.
3. Bring the infrastructure online:
   ```bash
   pnpm docker:up
   # or: make docker-up
   ```
4. Apply the Phase 2 migrations so PostgreSQL has the required schemas/extension:
   ```bash
   pnpm db:migrate:phase2
   ```
5. Seed the database with demo data:
   ```bash
   pnpm seed
   ```
6. (Optional) Start the Phase 3 connectors shim (keeps external credentials loaded and ready for your real connector processes):
   ```bash
   pnpm connectors:phase3
   ```
7. Point your web/admin/api apps at the stack using the `.env` files you created in step 1. The defaults assume the following URLs:
   - Web: `http://localhost:3000`
   - Admin: `http://localhost:3100`
   - API: `http://localhost:4000`

To stop the infrastructure run `pnpm docker:down` (or `make docker-down`). Tail service logs with `pnpm docker:logs` or `make docker-logs`. There are additional scripts for service-specific logs, e.g. `pnpm docker:logs:postgres`.

## Environment variables

- The root `.env` file contains shared infrastructure credentials (database, Redis, OpenSearch, MinIO, AI providers, and connector tokens).
- Each application under `apps/*/.env.example` defines runtime configuration for that specific surface:
  - **Web**: NextAuth secrets, OAuth client ids, public URLs, analytics keys.
  - **Admin**: Admin portal port, JWT signing material, Okta/Google OAuth ids, storage configuration.
  - **API**: Database/Redis/OpenSearch URLs, MinIO credentials, JWT keys, and connector tokens including OpenAI/Anthropic keys.

Update these files with project-specific values before copying them to `.env`.

## Phase 2 migrations

SQL files live under `scripts/migrations/phase-2/`. The helper script `scripts/migrations/phase-2/apply.sh` (invoked via `pnpm db:migrate:phase2`) iterates over every `.sql` file in order and applies it to the database specified by `POSTGRES_URL`/`DATABASE_URL`. It automatically sources the root `.env` (override with `ENV_FILE=...`) and requires the `psql` CLI that ships with PostgreSQL (`brew install postgresql`, `apt install postgresql-client`, etc.). The default migration enables the `vector` + `pgcrypto` extensions, creates the `app_public` schema, and defines a `documents` table with an IVFFlat index ready for pgvector searches.

If you add additional migrations, drop them in this folder with a lexical prefix (e.g., `0002_add_users.sql`) so they run deterministically.

## Phase 3 connectors

The `connectors/phase-3` directory contains a lightweight runner that validates external credentials and keeps a heartbeat loop active. Replace `runner.mjs` with the real connector orchestration from Phase 3, but keep the `run.sh` contract intact so `pnpm connectors:phase3` (or `make connectors-phase3`) continues to work for the team. The script automatically sources the root `.env` (override with `ENV_FILE=...`) so the same credentials drive Docker and the connectors.

Environment variables required by this runner are already listed inside `.env.example` and the per-app files. Set them before starting the script.

## Demo Data Seeding

The repository includes comprehensive seed scripts to populate your database with realistic demo data across all entities:

```bash
# Seed database with demo data (idempotent)
pnpm seed

# Reset and reseed (clean slate)
pnpm seed:reset
```

The seed data includes:
- **10 diverse industries**: Dental, HVAC, Trucking, Plumbing, Roofing, Landscaping, Real Estate, Legal, Medical, Automotive
- **35+ US cities** across all regions (Northeast, Southeast, Midwest, Southwest, West)
- **pgvector embeddings**: 1536-dimension vectors for similarity search
- **OpenSearch indexing**: Full-text and geo-spatial search
- **Complete relationships**: Organizations, users, businesses, contacts, social profiles, lead lists, saved searches, alerts, and ICP configs

See [docs/SEEDING.md](docs/SEEDING.md) for complete documentation, configuration options, and dataset details.

## Helpful commands

| Command | Description |
| --- | --- |
| `pnpm docker:up` / `make docker-up` | Build and start all services with health checks |
| `pnpm docker:down` / `make docker-down` | Stop and remove containers, networks, and volumes |
| `pnpm docker:logs` | Tail combined logs for the stack |
| `pnpm docker:logs:<service>` | Tail logs for a single service (postgres, redis, opensearch, minio) |
| `pnpm db:migrate:phase2` | Apply SQL migrations from `scripts/migrations/phase-2` |
| `pnpm seed` | Seed database with comprehensive demo data |
| `pnpm seed:reset` | Reset database and reseed with fresh data |
| `pnpm connectors:phase3` | Boot the Phase 3 connector runner |

After the stack is running and migrations/connectors are loaded, your apps can use their `.env` files to connect to:

- PostgreSQL: `postgresql://postgres:postgres@localhost:5432/app_db`
- Redis: `redis://:redislocal@localhost:6379`
- BullMQ dashboard: `http://localhost:3002` (ops / super-secret)
- OpenSearch: `http://localhost:9200` (admin / admin)
- MinIO: `http://localhost:9000` (minio / minio123)

Feel free to customize credentials in `.env` and re-run `pnpm docker:up` to recreate the stack with your own values.
