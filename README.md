# Ultra-Lead-Generator

> B2B Lead Prospecting Platform with AI-powered search, OpenSearch integration, and CRM push capabilities

Ultra-Lead-Generator is a comprehensive B2B lead prospecting and management platform designed to help sales teams discover, qualify, and engage with high-quality business leads. Built with modern technologies including Next.js, NestJS, OpenSearch, and AI embeddings powered by pgvector.

## Features

### 🔍 Smart Search & Discovery
- **AI-Powered Search**: Natural language processing for intuitive business queries
- **Advanced Filtering**: Industry, location, revenue, employees, tech stack, ownership type
- **OpenSearch Integration**: Fast, scalable full-text search with custom analyzers
- **Semantic Similarity**: pgvector-based embeddings to find similar businesses
- **Geographic Search**: Map-based clustering and geo-spatial queries with MapLibre GL

### 📊 Lead Management
- **Lead Lists**: Create, organize, and manage custom lead collections
- **Saved Searches**: Store and reuse complex search queries
- **AI Lead Scoring**: Hot/Warm/Cold badges based on intelligent analysis
- **Notes & Tracking**: Add notes, track outreach, and manage follow-ups
- **Bulk Operations**: Export, deduplicate, and manipulate lead data at scale

### 🗺️ Territories & Alerts
- **Territory Management**: Define geographic sales territories on interactive maps
- **Smart Alerts**: Automated notifications based on trigger conditions
- **Alert History**: Track alert runs and delivery status
- **Onboarding Workflows**: Guided setup for new users and teams

### 🔗 CRM Integration
- **Multi-CRM Support**: Push leads to Salesforce, HubSpot, and Pipedrive
- **Dynamic Field Mapping**: Configure custom field mappings per CRM
- **Async Processing**: BullMQ-based job queue with rate limiting
- **Sync Job Tracking**: Monitor CRM push status and history

### 🏢 Enterprise Features
- **Multi-Tenancy**: Organization-scoped data and user management
- **RBAC**: Role-based access control with fine-grained permissions
- **Audit Logs**: Complete activity tracking for compliance
- **Billing & Usage**: Stripe integration with usage-based pricing
- **Data Quality Tools**: Moderation, validation, and health monitoring

### 🤖 AI & Automation
- **AI Embeddings**: Vector similarity search for finding related businesses
- **Provider-Agnostic AI**: Unified interface for OpenAI and Anthropic
- **Content Summarization**: Auto-generate lead summaries
- **Outreach Generation**: AI-powered email templates
- **Classification & Extraction**: Intelligent data processing

## Quick Start

Get your development environment up and running with demo data in 5 minutes.

### Prerequisites

- Docker and Docker Compose
- Node.js ≥20
- pnpm ≥9 (install: `npm install -g pnpm`)

### Installation

```bash
# 1. Copy environment template
cp .env.example .env

# 2. Start infrastructure services
pnpm docker:up

# Wait ~30 seconds for services to be ready

# 3. Install dependencies
pnpm install

# 4. Apply database migrations
pnpm db:migrate:phase2

# 5. Seed demo data
pnpm seed
```

This creates:
- 5 demo organizations
- 15 users with various roles
- 500 businesses across 10 industries
- 1,000 contacts
- 30 lead lists with 750 items
- 45 saved searches
- 30 alerts
- 10 ICP configurations

### Start Applications

```bash
# Start web app (prospecting UI)
cd apps/web && pnpm dev

# Start API server (CRM integration)
cd apps/api && pnpm dev

# Start admin dashboard
cd apps/admin && pnpm dev
```

For detailed setup instructions, see [QUICKSTART.md](QUICKSTART.md).

## Project Structure

```
ultra-lead-generator/
├── apps/
│   ├── web/              # Next.js prospecting search UI
│   ├── admin/            # Next.js admin dashboard
│   ├── backend/          # NestJS admin backend
│   └── api/              # Express CRM integration API
├── packages/
│   ├── core/             # Shared models & validation
│   ├── search/           # OpenSearch client & indexing
│   ├── embeddings/       # AI embeddings pipeline (pgvector)
│   ├── ai/               # Provider-agnostic AI layer
│   ├── ui/               # Shared React components
│   └── db/               # Database utilities
├── services/
│   ├── api/              # NestJS API service
│   ├── web/              # Web service
│   ├── admin/            # Admin service
│   └── bullmq-dashboard/ # Job queue monitoring
├── backend/              # TypeScript Express backend
├── frontend/             # Vite React frontend
├── src/                  # NestJS core API modules
├── scripts/
│   ├── seed/             # Demo data seeding system
│   └── migrations/       # Database migrations
├── infrastructure/       # Terraform IaC (ECS, RDS, OpenSearch, S3)
└── tests/                # E2E and integration tests
```

## Technology Stack

### Frontend
- **Next.js 16** with React 19 and TypeScript
- **Tailwind CSS 4** for styling
- **Radix UI** for accessible components
- **MapLibre GL** for interactive maps
- **Vitest** and **Playwright** for testing

### Backend
- **NestJS** for modular backend architecture
- **Express.js** for API services
- **TypeORM** and **Prisma** for database access
- **BullMQ** with Redis for job queues
- **NextAuth** for authentication (SSO, MFA, sessions)

### Data & Search
- **PostgreSQL** with **pgvector** extension for embeddings
- **OpenSearch** for full-text business search
- **Redis** for caching and rate limiting
- **MinIO** for object storage (S3-compatible)

### AI & ML
- **OpenAI** and **Anthropic** APIs via unified abstraction
- **pgvector** for semantic similarity search
- **Custom embeddings pipeline** with BullMQ workers

### Infrastructure
- **Docker Compose** for local development
- **Terraform** for AWS deployment (ECS, RDS, OpenSearch, S3)
- **GitHub Actions** for CI/CD
- **Turbo** for monorepo build orchestration

## Key Documentation

- **[QUICKSTART.md](QUICKSTART.md)** - 5-minute setup guide
- **[PHASE10_PART2_SUMMARY.md](PHASE10_PART2_SUMMARY.md)** - Lead lists & data tools feature summary
- **[IMPLEMENTATION.md](IMPLEMENTATION.md)** - Implementation details
- **[EMBEDDINGS_IMPLEMENTATION.md](EMBEDDINGS_IMPLEMENTATION.md)** - AI embeddings pipeline
- **[DEPLOYMENT_README.md](DEPLOYMENT_README.md)** - Deployment guide
- **[docs/SEEDING.md](docs/SEEDING.md)** - Demo data seeding documentation
- **[docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)** - Common issues and solutions

## Development Workflow

### Running Tests

```bash
# Run all tests
pnpm test

# Run specific app tests
cd apps/web && pnpm test
cd apps/api && pnpm test

# E2E tests
pnpm test:e2e
```

### Database Operations

```bash
# Apply migrations
pnpm db:migrate:phase2

# Seed demo data
pnpm seed

# Reset and reseed
pnpm seed:reset

# Customize seed data
BUSINESSES_PER_INDUSTRY=200 pnpm seed
ORGS_COUNT=20 USERS_PER_ORG=5 pnpm seed
```

### Infrastructure

```bash
# Start all services (PostgreSQL, Redis, OpenSearch, MinIO, BullMQ)
pnpm docker:up

# Stop services
pnpm docker:down

# View logs
pnpm docker:logs

# Check service health
docker ps
```

## Demo Data

The seeding system creates realistic demo data across 10 industries:

🦷 Dental Services • 🏠 HVAC Services • 🚚 Trucking & Logistics • 🔧 Plumbing Services
🏗️ Roofing Services • 🌳 Landscaping Services • 🏢 Real Estate • ⚖️ Legal Services
🏥 Medical Services • 🚗 Automotive Services

**Geographic Coverage**: 35+ major US cities across all regions

**Includes**:
- Vector embeddings for similarity search
- Full-text search indexing
- Realistic contacts with decision-maker roles
- Social media profiles
- Lead lists and saved searches
- Alert configurations
- ICP (Ideal Customer Profile) definitions

## Deployment

Ultra-Lead-Generator supports multiple deployment options:

1. **Docker Compose**: Single-command local deployment
2. **AWS ECS**: Production deployment with Terraform IaC
3. **Kubernetes**: Container orchestration (manifests needed)

See [DEPLOYMENT_README.md](DEPLOYMENT_README.md) for detailed instructions.

## Architecture Highlights

### Search Architecture
- **OpenSearch**: Custom analyzers for industry names, business types, tech stack
- **Geo-spatial**: Point-in-polygon queries for territory matching
- **Autocomplete**: Edge n-gram tokenization for instant suggestions
- **Similarity Search**: pgvector cosine similarity with 1536-dimension embeddings

### Queue Architecture
- **BullMQ**: Redis-backed job queues for async processing
- **Workers**: Separate processes for CRM sync, embeddings compute, search indexing
- **Monitoring**: BullMQ dashboard for queue health and job tracking

### Multi-Tenancy
- **Organization Scoping**: All data isolated per organization
- **User Roles**: Admin, Manager, User with granular permissions
- **RBAC**: Enforced at API and UI layers

## Contributing

Contributions are welcome! Please ensure:
- Tests pass: `pnpm test`
- Linting passes: `pnpm lint`
- Type-checking passes: `pnpm type-check`
- Code follows project conventions

## License

MIT License - See LICENSE file

## Support

- **GitHub Issues**: Bug reports and feature requests
- **Documentation**: Comprehensive guides included
- **Community**: Join our discussions

---

**Built with ❤️ for sales teams looking to supercharge their prospecting workflow**
