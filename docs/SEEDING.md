# Demo Data Seeding Guide

This guide explains how to seed your development environment with comprehensive demo data for testing and demonstrations.

## Overview

The seeding system generates realistic, diverse demo data across all major entities:

- **Organizations** (tenants)
- **Users** with various roles
- **Businesses/Leads** across 10 industries (Dental, HVAC, Trucking, Plumbing, Roofing, Landscaping, Real Estate, Legal, Medical, Automotive)
- **Contacts** with decision-maker identification
- **Social Profiles** (Facebook, Instagram, Twitter, LinkedIn, YouTube, TikTok)
- **Lead Lists** with items
- **Saved Searches** with query parameters
- **Alerts** with trigger conditions
- **Organization ICP Configs** (Ideal Customer Profile)

All data includes:
- **Geographic diversity**: 35+ major US cities across all regions
- **Industry diversity**: 10 industries with sub-industries and specialties
- **Vector embeddings**: pgvector embeddings for similarity search
- **OpenSearch indexing**: Full-text and geospatial search capabilities

## Quick Start

### Prerequisites

1. **Database running**: PostgreSQL with pgvector extension
2. **Migrations applied**: Core schema migrations must be run first
3. **Environment variables** (optional): Database connection string

```bash
# Start infrastructure
pnpm docker:up

# Apply migrations
pnpm db:migrate:phase2
```

### Basic Usage

```bash
# Seed with default configuration
pnpm seed

# Reset and reseed (clean slate)
pnpm seed:reset
```

## Commands

### `pnpm seed`

Seeds the database with demo data. **Idempotent** - can be run multiple times and will add new data alongside existing data.

```bash
# Default seeding
pnpm seed

# With custom configuration
ORGS_COUNT=10 BUSINESSES_PER_INDUSTRY=100 pnpm seed
```

### `pnpm seed:reset`

Truncates all demo data tables and then runs the seed. Use this for a clean slate.

```bash
pnpm seed:reset
```

### Manual Reset Only

```bash
tsx scripts/seed/reset.ts
```

## Configuration

Control seed data volume via environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `RESET_DATA` | `false` | Truncate tables before seeding |
| `ORGS_COUNT` | `5` | Number of demo organizations |
| `USERS_PER_ORG` | `3` | Users per organization |
| `BUSINESSES_PER_INDUSTRY` | `50` | Businesses per industry (10 industries) |
| `CONTACTS_PER_BUSINESS` | `2` | Contacts per business |
| `SOCIAL_PROFILES_PROB` | `0.6` | Probability of business having social profiles (0-1) |
| `LEAD_LISTS_PER_USER` | `2` | Lead lists per user |
| `ITEMS_PER_LEAD_LIST` | `25` | Businesses per lead list |
| `SAVED_SEARCHES_PER_USER` | `3` | Saved searches per user |
| `ALERTS_PER_USER` | `2` | Alerts per user |
| `ICP_CONFIGS_PER_ORG` | `2` | ICP configurations per organization |

### Example: Large Dataset

```bash
ORGS_COUNT=20 \
USERS_PER_ORG=5 \
BUSINESSES_PER_INDUSTRY=200 \
CONTACTS_PER_BUSINESS=3 \
pnpm seed
```

This generates:
- 20 organizations
- 100 users
- 2,000 businesses (200 × 10 industries)
- 6,000 contacts
- ~200 lead lists
- ~300 saved searches
- ~200 alerts
- 40 ICP configs

## Data Details

### Organizations

Diverse companies across various sizes and industries, each with:
- Unique slugs for routing
- Employee counts (5-10,000)
- Subscription plans (starter/professional/enterprise)
- Status tracking

### Users

Realistic users with:
- Roles: admin, user, viewer
- Recent login activity (70% active)
- Email preferences
- Timezone settings

### Businesses/Leads

Comprehensive business profiles across **10 industries**:

#### Industries Covered

1. **Dental Services**
   - Sub-industries: General Dentistry, Orthodontics, Pediatric, Cosmetic, Oral Surgery, Endodontics, Periodontics, Prosthodontics
   - Specialties: Teeth Whitening, Implants, Invisalign, Veneers, Root Canal, etc.

2. **HVAC Services**
   - Sub-industries: Residential, Commercial, Industrial, Installation, Repair, Maintenance
   - Specialties: Heat Pumps, Central AC, Ductless, Furnace, Boiler, Smart Thermostats

3. **Trucking & Logistics**
   - Sub-industries: Long Haul, Regional, Local Delivery, Freight Brokerage, Intermodal
   - Specialties: Hazmat, Oversized Loads, Expedited, LTL, FTL

4. **Plumbing Services**
   - Sub-industries: Residential, Commercial, Emergency, Drain Cleaning, Water Heater
   - Specialties: Trenchless Repair, Hydro Jetting, Leak Detection, Gas Line

5. **Roofing Services**
   - Sub-industries: Residential, Commercial, Repair, Replacement, Inspection
   - Specialties: Asphalt Shingles, Metal, Tile, Flat, Storm Damage

6. **Landscaping Services**
   - Sub-industries: Lawn Care, Design, Hardscaping, Tree Service, Irrigation
   - Specialties: Organic Care, Xeriscaping, Retaining Walls, Water Features

7. **Real Estate**
   - Sub-industries: Residential Sales, Commercial, Property Management, Investment
   - Specialties: Luxury Homes, First-Time Buyers, Investment Properties

8. **Legal Services**
   - Sub-industries: Personal Injury, Family Law, Criminal Defense, Estate Planning
   - Specialties: Car Accidents, Divorce, DUI, Wills and Trusts

9. **Medical Services**
   - Sub-industries: Primary Care, Urgent Care, Specialty Care, Surgery
   - Specialties: Cardiology, Orthopedics, Dermatology, Pediatrics

10. **Automotive Services**
    - Sub-industries: Auto Repair, Body Shop, Oil Change, Tire Service
    - Specialties: European Cars, Luxury Vehicles, Diesel, Hybrid/Electric

Each business includes:
- Realistic names and descriptions
- Revenue and employee count
- Full address with lat/lon coordinates
- Multiple contacts with titles
- Social media presence (60% probability)
- Quality scores (0.5-1.0)
- Industry certifications
- Business hours and payment methods
- **1536-dimension vector embeddings** for similarity search
- **OpenSearch indexing** for full-text and geo search

### Geographic Distribution

Businesses span **35+ major US cities** across all regions:

- **Northeast**: New York, Boston, Philadelphia, Pittsburgh, Newark
- **Southeast**: Miami, Atlanta, Charlotte, Tampa, Nashville, Raleigh
- **Midwest**: Chicago, Detroit, Columbus, Indianapolis, Milwaukee, Kansas City, Minneapolis
- **Southwest**: Houston, Dallas, Austin, San Antonio, Phoenix, Albuquerque
- **West**: Los Angeles, San Francisco, San Diego, San Jose, Seattle, Portland, Denver, Las Vegas, Salt Lake City

### Contacts

Each business has multiple contacts with:
- Decision-maker identification (Owner, CEO, President, VP, GM)
- Direct phone numbers
- LinkedIn profiles (60% have them)
- Roles: Executive, Management, Sales, Operations, Technical, Administrative

### Lead Lists

Organized collections with realistic names:
- "Q1 2025 Prospects"
- "Dental Targets - Northeast"
- "High Value HVAC Leads"
- Status tracking (new, contacted, qualified, converted, disqualified)
- Priority levels
- Notes and metadata

### Saved Searches

Reusable search queries with parameters:
- Industry filters
- Location filters
- Employee count ranges
- Revenue ranges
- Quality score thresholds
- Execution time tracking
- Favorites marking

### Alerts

Automated notifications for:
- **New Leads**: When matching leads appear
- **Lead Status Changes**: Pipeline updates
- **Quality Thresholds**: High-quality lead detection
- **Geographic Expansion**: New market opportunities
- **Competitor Activity**: Market intelligence
- **Market Trends**: Industry insights

Configurable:
- Notification channels: email, SMS, Slack, webhook
- Frequencies: real-time, hourly, daily, weekly, monthly
- Custom trigger conditions

### ICP Configurations

Ideal Customer Profile definitions with:
- Target and excluded industries
- Size criteria (employees, revenue)
- Geographic targeting
- Technology requirements
- Certification requirements
- Scoring weights for matching

## Database Schema

The seed data populates these tables:

```
app_public.organizations
app_public.users
app_public.businesses (with pgvector embeddings)
app_public.contacts
app_public.social_profiles
app_public.lead_lists
app_public.lead_list_items
app_public.saved_searches
app_public.alerts
app_public.org_icp_configs
```

## Vector Embeddings

All businesses include **1536-dimension embeddings** (compatible with OpenAI text-embedding-ada-002) generated from:
- Business name
- Description
- Industry and sub-industry
- Specialties
- Location

These enable:
- Semantic similarity search
- "Find similar businesses" functionality
- ML-powered recommendations

### Similarity Search Example

```sql
-- Find businesses similar to a given business
SELECT 
    b.name,
    b.industry,
    b.city,
    b.state,
    1 - (b.embedding <=> target.embedding) as similarity
FROM app_public.businesses b
CROSS JOIN (
    SELECT embedding 
    FROM app_public.businesses 
    WHERE id = 'target-business-id'
) target
ORDER BY b.embedding <=> target.embedding
LIMIT 10;
```

## OpenSearch Integration

Businesses are automatically indexed in OpenSearch with:

- **Full-text search** on name, description
- **Keyword filters** on industry, sub-industry, city, state
- **Numeric ranges** on employee_count, annual_revenue, quality_score
- **Geo-point search** on coordinates (lat/lon)

The OpenSearch client connects to `http://localhost:9200` by default (configurable via `OPENSEARCH_URL`).

### Search Example

```bash
# Search for dental businesses in NYC
curl -X POST "localhost:9200/businesses/_search" -H 'Content-Type: application/json' -d'
{
  "query": {
    "bool": {
      "must": [
        { "match": { "industry": "Dental Services" }},
        { "term": { "location.city": "New York" }}
      ]
    }
  }
}
'
```

## Idempotency

The seeding system is **idempotent** with options:

1. **Additive mode** (default): Adds new data alongside existing data
2. **Reset mode**: Truncates tables first for clean slate

```bash
# Additive - safe to run multiple times
pnpm seed

# Reset - clean slate
RESET_DATA=true pnpm seed
# or
pnpm seed:reset
```

## Troubleshooting

### Database Connection Issues

```bash
# Check PostgreSQL is running
docker ps | grep postgres

# Test connection
psql $DATABASE_URL -c "SELECT NOW()"

# Check environment variables
echo $DATABASE_URL
```

### Migration Not Applied

```bash
# Apply migrations first
pnpm db:migrate:phase2

# Verify tables exist
psql $DATABASE_URL -c "\dt app_public.*"
```

### OpenSearch Issues

OpenSearch indexing is **optional**. If unavailable, seeding continues without it:

```bash
# Check OpenSearch is running
curl http://localhost:9200

# Skip OpenSearch (no action needed - auto-skips if unavailable)
```

### Out of Memory

For large datasets, increase Node.js memory:

```bash
NODE_OPTIONS="--max-old-space-size=4096" pnpm seed
```

### Slow Seeding

The seed process can take 30s-5min depending on dataset size:

- 500 businesses: ~30 seconds
- 2,000 businesses: ~2 minutes
- 10,000 businesses: ~10 minutes

Progress is logged to console.

## Development

### Adding New Industries

Edit `scripts/seed/lib/industries.ts`:

```typescript
export const INDUSTRIES = {
  // ... existing industries
  NEW_INDUSTRY: {
    name: 'Industry Name',
    subIndustries: ['Sub 1', 'Sub 2'],
    specialties: ['Spec 1', 'Spec 2'],
    certifications: ['Cert 1', 'Cert 2'],
    businessTypes: ['Type 1', 'Type 2'],
  },
};
```

### Adding New Locations

Edit `scripts/seed/lib/locations.ts`:

```typescript
export const MAJOR_US_CITIES: LocationData[] = [
  // ... existing cities
  {
    city: 'City Name',
    state: 'State Name',
    stateCode: 'ST',
    latitude: 12.3456,
    longitude: -78.9012,
    population: 123456,
    region: 'West',
  },
];
```

### Custom Factories

Create new factories in `scripts/seed/factories/`:

```typescript
import { faker } from '@faker-js/faker';

export interface MyEntity {
  id: string;
  // ... fields
}

export function createMyEntity(overrides?: Partial<MyEntity>): MyEntity {
  return {
    id: faker.string.uuid(),
    // ... generate fields
    ...overrides,
  };
}
```

## CI/CD Integration

### GitHub Actions Example

```yaml
- name: Seed test database
  run: |
    pnpm seed:reset
  env:
    DATABASE_URL: ${{ secrets.TEST_DATABASE_URL }}
    ORGS_COUNT: 3
    BUSINESSES_PER_INDUSTRY: 20
```

### Docker Compose

```yaml
services:
  seed:
    build: .
    command: pnpm seed
    environment:
      DATABASE_URL: postgresql://postgres:postgres@db:5432/app_db
      ORGS_COUNT: 10
    depends_on:
      db:
        condition: service_healthy
```

## Performance Tips

1. **Use transactions**: The seed script uses a single transaction for speed
2. **Batch OpenSearch indexing**: Batches of 100 for efficiency
3. **Adjust data volume**: Use env vars to control size
4. **Database tuning**: Ensure indexes are created (automatic via migrations)

## Dataset Coverage Summary

| Entity | Count (Default) | Industries | Locations | Features |
|--------|-----------------|-----------|-----------|----------|
| Organizations | 5 | Various | N/A | Plans, status |
| Users | 15 | N/A | N/A | Roles, activity |
| Businesses | 500 | 10 | 35+ cities | Embeddings, OpenSearch |
| Contacts | 1,000 | N/A | N/A | Decision makers |
| Social Profiles | ~600 | N/A | N/A | 6 platforms |
| Lead Lists | 30 | N/A | N/A | 750 items total |
| Saved Searches | 45 | N/A | N/A | Query params |
| Alerts | 30 | N/A | N/A | 6 types, triggers |
| ICP Configs | 10 | N/A | N/A | Scoring weights |

**Total default dataset**: ~2,800 entities across all types

## Production Considerations

⚠️ **This is for development/demo only**. For production:

1. **Do not use demo data** in production environments
2. **Protect seed endpoints** if exposing via API
3. **Use real embeddings** from OpenAI or similar (not mocks)
4. **Validate data quality** from real sources
5. **Implement proper RBAC** for tenant isolation

## Support

For issues or questions:

1. Check logs for specific error messages
2. Verify all prerequisites are met
3. Try `pnpm seed:reset` for a clean slate
4. Review database migrations are applied
5. Check environment variable configuration

---

**Last Updated**: November 2025  
**Script Version**: 1.0.0
