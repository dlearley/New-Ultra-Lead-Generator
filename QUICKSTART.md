# Quick Start Guide

Get your development environment up and running with demo data in 5 minutes.

## Prerequisites

- Docker and Docker Compose
- Node.js ≥20
- pnpm ≥9 (install: `npm install -g pnpm`)

## Steps

### 1. Setup Environment

```bash
# Copy environment templates
cp .env.example .env

# (Optional) Adjust settings in .env if needed
```

### 2. Start Infrastructure

```bash
# Start all services (PostgreSQL, Redis, OpenSearch, MinIO)
pnpm docker:up

# Wait ~30 seconds for services to be ready
# Check status with: docker ps
```

### 3. Apply Database Migrations

```bash
# Install dependencies first
pnpm install

# Apply schema migrations
pnpm db:migrate:phase2
```

### 4. Seed Demo Data

```bash
# Seed with default dataset (500 businesses across 10 industries)
pnpm seed
```

**Expected output:**
```
🌱 Starting seed process...
✅ Database connection successful
📊 Seeding 5 organizations...
✅ Created 5 organizations
👥 Seeding users (3 per org)...
✅ Created 15 users
🏢 Seeding businesses (50 per industry)...
...
✅ Seed completed successfully!
```

This takes ~1-2 minutes and creates:
- 5 demo organizations
- 15 users with various roles
- 500 businesses across 10 industries
- 1,000 contacts
- ~600 social profiles
- 30 lead lists with 750 items
- 45 saved searches
- 30 alerts
- 10 ICP configurations

### 5. Verify Data

```bash
# Connect to PostgreSQL
docker exec -it $(docker ps -qf "name=postgres") psql -U postgres -d app_db

# Check data
\dt app_public.*
SELECT COUNT(*) FROM app_public.businesses;
SELECT COUNT(*) FROM app_public.organizations;
\q
```

### 6. Explore OpenSearch

```bash
# Open in browser
open http://localhost:9200/_dashboards

# Or use curl
curl -u admin:admin http://localhost:9200/businesses/_count
```

## What's Next?

### Start Your Application

```bash
# Start web app
cd apps/web && pnpm dev

# Start API server  
cd apps/api && pnpm dev

# Start admin dashboard
cd apps/admin && pnpm dev
```

### Customize Seed Data

```bash
# Larger dataset (2,000 businesses)
BUSINESSES_PER_INDUSTRY=200 pnpm seed

# More organizations
ORGS_COUNT=20 USERS_PER_ORG=5 pnpm seed

# Reset and reseed
pnpm seed:reset
```

See [docs/SEEDING.md](docs/SEEDING.md) for all configuration options.

### Explore the Data

The demo data includes:

**Industries:**
- 🦷 Dental Services
- 🏠 HVAC Services
- 🚚 Trucking & Logistics
- 🔧 Plumbing Services
- 🏗️ Roofing Services
- 🌳 Landscaping Services
- 🏢 Real Estate
- ⚖️ Legal Services
- 🏥 Medical Services
- 🚗 Automotive Services

**Geographic Coverage:**
- 35+ major US cities
- All regions: Northeast, Southeast, Midwest, Southwest, West
- Real coordinates for geo-spatial queries

**Features:**
- Vector embeddings for similarity search
- Full-text search in OpenSearch
- Realistic business data with contacts
- Social media profiles
- Lead lists and saved searches
- Alert configurations
- ICP (Ideal Customer Profile) definitions

### Query Examples

**Find similar businesses (using pgvector):**
```sql
SELECT 
    name, industry, city, state,
    1 - (embedding <=> (SELECT embedding FROM app_public.businesses WHERE id = 'some-id')) as similarity
FROM app_public.businesses
ORDER BY embedding <=> (SELECT embedding FROM app_public.businesses WHERE id = 'some-id')
LIMIT 10;
```

**Search in OpenSearch:**
```bash
curl -X POST "localhost:9200/businesses/_search" -u admin:admin -H 'Content-Type: application/json' -d'
{
  "query": {
    "bool": {
      "must": [
        { "match": { "industry": "Dental" }},
        { "term": { "location.state": "CA" }}
      ]
    }
  },
  "size": 10
}'
```

## Troubleshooting

### Services not starting?

```bash
# Check logs
pnpm docker:logs

# Restart
pnpm docker:down && pnpm docker:up
```

### Database connection failed?

```bash
# Ensure PostgreSQL is running
docker ps | grep postgres

# Check connection
psql postgresql://postgres:postgres@localhost:5432/app_db -c "SELECT NOW()"
```

### Seed script errors?

```bash
# Ensure migrations are applied
pnpm db:migrate:phase2

# Reset and try again
pnpm seed:reset
```

## Resources

- **Full Seeding Documentation**: [docs/SEEDING.md](docs/SEEDING.md)
- **Main README**: [README.md](README.md)
- **Seed Scripts**: [scripts/seed/](scripts/seed/)

## Support

Having issues? Check:
1. Docker services are running: `docker ps`
2. Environment variables are set: `cat .env`
3. Migrations are applied: `psql $DATABASE_URL -c "\dt app_public.*"`
4. Logs for errors: `pnpm docker:logs`

---

Happy coding! 🚀
