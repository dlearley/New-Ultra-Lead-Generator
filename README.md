# Enterprise Monorepo

A scalable, production-ready monorepo built with **pnpm** and **Turborepo**, featuring multiple Next.js applications, a NestJS API server, and shared TypeScript packages.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Monorepo Root                             │
│  (pnpm workspaces + Turborepo + ESLint + Prettier)          │
└─────────────────────────────────────────────────────────────┘
                            │
                ┌───────────┼───────────┐
                │                       │
        ┌───────▼────────┐    ┌────────▼───────┐
        │  Apps Layer    │    │  Packages Layer│
        └───────┬────────┘    └────────┬───────┘
                │                       │
        ┌───────┼───────┐       ┌──────┼──────────┐
        │       │       │       │      │          │
    ┌───▼──┐ ┌──▼───┐ ┌──▼───┐ │   ┌──▼───┐ ┌───▼───┐
    │ web  │ │admin │ │ api  │ │   │ core │ │  ui   │
    │      │ │      │ │      │ │   │      │ │       │
    │Next.js
 │ │Next.js
 │ │NestJS │ │   │      │ │ Btns   │
    └──────┘ └──────┘ └──────┘ │   │ Utils │ │ Modal │
                             │   │      │ │ Cards  │
                             │   └──────┘ └───────┘
                             │
                             ├──┬────────────┬────────┬──────┐
                             │  │            │        │      │
                          ┌──▼──▼────┐  ┌───▼──┐ ┌──▼──┐ ┌──▼──┐
                          │    db    │  │search│ │ ai  │ │……   │
                          │ Schemas  │  │Indices  │Models  │Shared
                          │Migrations│  │Query  │ │Embed   │Libs
                          └─────────┘  └───────┘ └──────┘ └─────┘
```

## Workspace Structure

```
.
├── apps/                           # Application layer
│   ├── web/                       # Next.js 15 frontend (port 3000)
│   │   ├── src/app/              # App Router
│   │   ├── next.config.ts
│   │   └── package.json
│   │
│   ├── admin/                     # Next.js 15 admin dashboard (port 3001)
│   │   ├── src/app/
│   │   ├── next.config.ts
│   │   └── package.json
│   │
│   └── api/                       # NestJS API with Fastify (port 3002)
│       ├── src/
│       ├── main.ts
│       ├── app.module.ts
│       └── package.json
│
├── packages/                       # Shared packages layer
│   ├── ui/                        # React UI components
│   │   ├── src/index.ts
│   │   └── package.json
│   │
│   ├── core/                      # Core utilities & services
│   │   ├── src/index.ts
│   │   └── package.json
│   │
│   ├── db/                        # Database abstraction & schemas
│   │   ├── src/index.ts
│   │   └── package.json
│   │
│   ├── search/                    # Search engine integration
│   │   ├── src/index.ts
│   │   └── package.json
│   │
│   └── ai/                        # AI/ML utilities
│       ├── src/index.ts
│       └── package.json
│
├── pnpm-workspace.yaml            # pnpm workspace config
├── turbo.json                      # Turborepo pipeline
├── tsconfig.json                  # Root TypeScript config with path aliases
├── .eslintrc.json                 # ESLint configuration
├── .prettierrc                    # Prettier configuration
├── .commitlintrc                  # Commitlint configuration
├── package.json                   # Root dependencies
└── README.md                      # This file
```

## Key Features

### 🚀 Technology Stack

- **Monorepo Manager**: pnpm with workspaces
- **Build Orchestration**: Turborepo for efficient parallel builds
- **Frontend**: Next.js 15 with App Router
- **Backend**: NestJS with Fastify adapter
- **Language**: TypeScript 5.4 with strict mode
- **Testing**: Vitest
- **Linting**: ESLint with TypeScript support
- **Formatting**: Prettier
- **Git Hooks**: Husky + commitlint

### 📦 Workspace Scripts

All commands support Turborepo filtering with `--filter`:

```bash
# Install dependencies
pnpm install

# Development
pnpm dev                          # Run all apps in dev mode
pnpm dev --filter=@monorepo/web  # Run only web app
pnpm dev --filter=@monorepo/api  # Run only API server

# Building
pnpm build                         # Build all packages and apps
pnpm build --filter=@monorepo/ui # Build only UI package

# Linting
pnpm lint                          # Lint all packages
pnpm lint --filter=@monorepo/web # Lint only web app

# Testing
pnpm test                          # Run all tests
pnpm test --filter=@monorepo/core # Test only core package

# Type checking
pnpm type-check                    # Type check entire workspace

# Code formatting
pnpm format                        # Format all files
pnpm format:check                 # Check formatting without changes
```

### 📍 Port Assignments

- **Web App**: http://localhost:3000
- **Admin Dashboard**: http://localhost:3001
- **API Server**: http://localhost:3002

### 🔗 Path Aliases

The monorepo includes TypeScript path aliases for clean imports:

```typescript
// Instead of:
import { Button } from '../../../packages/ui/src'

// Use:
import { Button } from '@ui/*'
```

Available aliases:
- `@ui/*` → `packages/ui/src/*`
- `@core/*` → `packages/core/src/*`
- `@db/*` → `packages/db/src/*`
- `@search/*` → `packages/search/src/*`
- `@ai/*` → `packages/ai/src/*`

## Development Prerequisites

### System Requirements
- **Node.js**: ≥20.0.0
- **pnpm**: ≥9.0.0
- **Git**: Latest stable version

### Installation

```bash
# Install pnpm globally (if not already installed)
npm install -g pnpm

# Clone the repository
git clone <repository-url>
cd monorepo

# Install dependencies
pnpm install

# Setup Husky hooks
pnpm prepare
```

## Getting Started

### Start Development Servers

```bash
# Start all applications in parallel
pnpm dev

# Or start individual apps
pnpm dev --filter=@monorepo/web
pnpm dev --filter=@monorepo/admin
pnpm dev --filter=@monorepo/api
```

Once running, visit:
- Web: http://localhost:3000
- Admin: http://localhost:3001
- API: http://localhost:3002/api

### Run Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode (locally)
cd packages/ui && pnpm exec vitest

# Generate coverage report
pnpm test -- --coverage
```

### Lint & Format

```bash
# Check code quality
pnpm lint

# Fix formatting issues
pnpm format

# Type check
pnpm type-check
```

### Build for Production

```bash
# Build all packages and apps
pnpm build

# Start production API server
cd apps/api && pnpm start

# Start production web app
cd apps/web && pnpm start
```

## Turborepo Pipeline Configuration

The monorepo uses Turborepo for efficient task execution:

### Pipeline Definition (`turbo.json`)

```json
{
  "pipeline": {
    "lint": {
      "outputs": [],
      "cache": false
    },
    "test": {
      "outputs": [],
      "cache": false
    },
    "build": {
      "outputs": ["dist/**", ".next/**"],
      "cache": true,
      "dependsOn": ["^build"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

**Key Features:**
- `lint`: Caching disabled for real-time checks
- `test`: Caching disabled for fresh test runs
- `build`: Cached results with dependency resolution
- `dev`: Persistent mode for long-running processes

## Code Quality Standards

### ESLint Rules
- TypeScript strict mode
- Unused variable detection (with underscore exception)
- Turbo-recommended rules
- Prettier integration

### Prettier Configuration
- Line width: 100 characters
- Single quotes
- Trailing commas
- 2-space indentation
- Unix line endings (LF)

### Commit Conventions

Uses Conventional Commits with commitlint:

```bash
feat: add new feature
fix: bug fix
docs: documentation changes
style: code style changes
refactor: code refactoring
perf: performance improvements
test: test additions/modifications
chore: maintenance tasks
ci: CI/CD changes
revert: revert previous commit
```

Example:
```bash
git commit -m "feat: add user authentication module"
```

## Shared Package Descriptions

### `@monorepo/ui`
React UI component library with reusable components:
- Button, Input, Card, and more
- Type-safe component props
- Theme support ready

### `@monorepo/core`
Core utilities and services:
- Configuration management
- Application bootstrap utilities
- Shared types and interfaces

### `@monorepo/db`
Database abstraction layer:
- Connection management
- Query builders
- Migration support
- Schema definitions

### `@monorepo/search`
Search and indexing engine:
- Full-text search implementation
- Document indexing
- Query execution

### `@monorepo/ai`
AI and ML utilities:
- LLM integration
- Text embeddings
- Model inference
- Prompt management

## Environment Configuration

### Root `.env` Variables (Optional)
```bash
NODE_ENV=development
```

### Per-App Configuration
Each app can have its own `.env.local`:
- `apps/web/.env.local`
- `apps/admin/.env.local`
- `apps/api/.env.local`

## Git Workflow

### Pre-commit Hooks
1. Runs `pnpm lint` on staged files
2. Prevents commits with linting errors

### Commit Message Validation
1. Checks commit message format
2. Enforces Conventional Commits

### Recommended Workflow
```bash
# Make changes
git add .

# Husky will run lint checks automatically
git commit -m "feat: your feature description"

# Push to branch
git push origin feature-branch
```

## Troubleshooting

### Cache Issues
```bash
# Clear Turborepo cache
turbo prune --scope=@monorepo/web

# Clear all caches
pnpm run clean
```

### Dependency Issues
```bash
# Reinstall all dependencies
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### Port Already in Use
```bash
# Change port in dev script
pnpm dev --filter=@monorepo/web -- -p 3010
```

### TypeScript Errors
```bash
# Regenerate types
pnpm type-check
```

## Performance Tips

1. **Use Turbo filtering** when working on specific packages
2. **Enable caching** for deterministic builds
3. **Run tests in parallel** using Turborepo
4. **Keep dependencies minimal** in shared packages
5. **Use workspace aliases** instead of relative imports

## Contributing

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Make changes and ensure tests pass: `pnpm test`
3. Lint and format: `pnpm lint && pnpm format`
4. Commit with conventional message: `git commit -m "feat: description"`
5. Push and create a pull request

## Project Phases

### Phase 1: ✅ Monorepo Scaffold (Current)
- pnpm + Turborepo setup
- App and package scaffolding
- Build/test/lint pipelines
- Documentation

### Phase 2: Database Schema & Migrations
- Database design and implementation
- Migration scripts
- Seed data

### Phase 3: Connector Work
- API integrations
- Third-party service connections
- Data synchronization

## License

MIT

## Support

For issues and questions:
1. Check existing documentation
2. Review git history for context
3. Check package-specific READMEs
4. Open an issue with details

---

**Last Updated**: 2024
**Monorepo Version**: 0.0.1
