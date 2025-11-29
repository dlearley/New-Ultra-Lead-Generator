# Enterprise Monorepo

![CI Pipeline](https://github.com/[owner]/[repo]/actions/workflows/ci.yml/badge.svg)
![Lint Status](https://github.com/[owner]/[repo]/actions/workflows/ci.yml/badge.svg?label=lint)
![Test Status](https://github.com/[owner]/[repo]/actions/workflows/ci.yml/badge.svg?label=tests)
![Build Status](https://github.com/[owner]/[repo]/actions/workflows/ci.yml/badge.svg?label=build)

> **Note**: Replace `[owner]` and `[repo]` in badge URLs with your actual GitHub repository details

A modern, scalable monorepo with pnpm and Turborepo, featuring:

- **Web App**: Next.js 15 (React 18)
- **Admin Dashboard**: Next.js 15 (React 18)
- **API Server**: NestJS
- **Shared Packages**: UI components, Core utilities

## Architecture

```
apps/
├── web/          # Next.js web application
├── admin/        # Next.js admin dashboard
└── api/          # NestJS REST API

packages/
├── ui/           # Shared React UI components
└── core/         # Shared utilities and types
```

## Prerequisites

- Node.js >= 20.0.0
- pnpm >= 9.0.0
- Docker & Docker Compose (for local services)

## Getting Started

### Install Dependencies

```bash
pnpm install
```

### Development

Run all applications in development mode:

```bash
pnpm dev
```

Individual app development:

```bash
pnpm --filter @monorepo/web dev
pnpm --filter @monorepo/admin dev
pnpm --filter @monorepo/api dev
```

### Building

Build all applications:

```bash
pnpm build
```

Build specific app:

```bash
pnpm --filter @monorepo/web build
```

### Testing

Run all tests:

```bash
pnpm test
```

Run tests with coverage:

```bash
pnpm test:coverage
```

Run tests for specific app:

```bash
pnpm --filter @monorepo/web test
```

### Linting

Lint all code:

```bash
pnpm lint
```

Lint specific app:

```bash
pnpm --filter @monorepo/web lint
```

### Type Checking

Check types across the monorepo:

```bash
pnpm type-check
```

### Code Formatting

Format code with Prettier:

```bash
pnpm format
```

Check formatting:

```bash
pnpm format:check
```

## Services

The project includes Docker Compose for local development services:

### Running Services

```bash
docker-compose up -d
```

### Services Included

- **PostgreSQL 16** with pgvector extension
- **Redis 7.2** for caching and message queues
- **OpenSearch 2.11** for search functionality
- **MinIO** for S3-compatible object storage
- **BullMQ Dashboard** for job queue monitoring

### Service Ports

- PostgreSQL: 5432
- Redis: 6379
- OpenSearch: 9200, 9600
- MinIO: 9000 (API), 9001 (Console)
- BullMQ Dashboard: 3002

### Connection Details

See `.env.example` or `.env` for service credentials and configuration.

## CI/CD Pipeline

The CI pipeline runs on every push and pull request to `main` and `develop` branches.

### Pipeline Stages

1. **Setup**: Matrix configuration for apps and Node versions
2. **Services**: PostgreSQL, Redis, OpenSearch, MinIO containers
3. **Lint**: ESLint checks across all apps
4. **Type Check**: TypeScript compilation checks
5. **Test**: Unit and integration tests with coverage
6. **Build**: Build production bundles
7. **E2E**: Playwright E2E tests (web app)
8. **Deploy**: Tag-based deployment stubs (AWS ECS, Fly.io)

### Coverage Reports

Coverage reports are automatically posted to pull requests showing:

- Statement coverage percentage
- Branch coverage percentage
- Function coverage percentage
- Line coverage percentage

### Deployment

Deployment is triggered on version tags (`v*`):

- **AWS ECS**: Placeholder for AWS deployment
- **Fly.io**: Placeholder for Fly.io deployment

## Environment Variables

See `.env.example` for required environment variables. Copy to `.env` for local development.

```bash
cp .env.example .env
```

## Package Manager

This project uses **pnpm** for package management. Install it globally:

```bash
npm install -g pnpm@9.1.3
```

## Troubleshooting

### Clear all cache and reinstall

```bash
pnpm clean
pnpm install
```

### Reset node_modules and lockfile

```bash
rm -rf node_modules
pnpm install
```

### Docker services not starting

Check ports are available and no conflicting services:

```bash
docker-compose down
docker-compose up -d
```

## Contributing

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Make your changes
3. Run tests and linting: `pnpm lint && pnpm test`
4. Commit with conventional commit messages
5. Create a pull request

## License

MIT
