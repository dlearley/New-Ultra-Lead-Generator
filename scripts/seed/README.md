# Seed Scripts

Comprehensive demo data seeding for the lead generation platform.

## Quick Start

```bash
# Install dependencies
pnpm install

# Seed database
pnpm seed

# Reset and seed
pnpm seed:reset
```

## Structure

```
scripts/seed/
├── index.ts              # Main seed script
├── reset.ts              # Reset/truncate script
├── lib/
│   ├── database.ts       # Database utilities
│   ├── opensearch.ts     # OpenSearch indexing
│   ├── embeddings.ts     # Vector embedding generation
│   ├── industries.ts     # Industry definitions
│   └── locations.ts      # Geographic data
└── factories/
    ├── organization.factory.ts
    ├── user.factory.ts
    ├── business.factory.ts
    ├── contact.factory.ts
    ├── social-profile.factory.ts
    ├── lead-list.factory.ts
    ├── saved-search.factory.ts
    ├── alert.factory.ts
    └── org-icp-config.factory.ts
```

## Documentation

See [/docs/SEEDING.md](../../docs/SEEDING.md) for complete documentation.

## Environment Variables

```bash
# Database (required)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/app_db

# OpenSearch (optional)
OPENSEARCH_URL=http://localhost:9200
OPENSEARCH_USERNAME=admin
OPENSEARCH_PASSWORD=admin

# Seed configuration
RESET_DATA=false
ORGS_COUNT=5
USERS_PER_ORG=3
BUSINESSES_PER_INDUSTRY=50
```

## Features

- ✅ 10 diverse industries (Dental, HVAC, Trucking, Plumbing, Roofing, Landscaping, Real Estate, Legal, Medical, Automotive)
- ✅ 35+ US cities across all regions
- ✅ pgvector embeddings (1536 dimensions)
- ✅ OpenSearch indexing with geo-point
- ✅ Idempotent seeding
- ✅ Configurable data volume
- ✅ Realistic faker-generated data
- ✅ Complete entity relationships

## Development

### Adding a New Factory

1. Create `factories/my-entity.factory.ts`
2. Define the interface
3. Implement `createMyEntity()` function
4. Export factory
5. Use in `index.ts` seed script

### Adding a New Industry

Edit `lib/industries.ts` and add to the `INDUSTRIES` object with:
- name
- subIndustries
- specialties
- certifications
- businessTypes

### Adding New Locations

Edit `lib/locations.ts` and add to `MAJOR_US_CITIES` array with:
- city, state, stateCode
- latitude, longitude
- population
- region
