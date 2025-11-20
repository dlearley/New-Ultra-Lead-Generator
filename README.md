# Map Territories, Alerts & Onboarding System

A comprehensive full-stack application for managing territories, alerts, and organization onboarding with AI-powered scoring.

## Features

### 🗺️ Territory Management (`/map`)
- **Map-centric UI** with Leaflet for visualization
- **Draw Tools**:
  - Polygon drawing for custom territories
  - Radius-based territories
  - State and county pickers
- **Heatmap Overlay** for lead distribution
- **Territory Ownership**: Assign single or multiple users to territories
- **Persistence**: All territories synced to PostgreSQL backend

### 🔔 Alert Manager (`/alerts`)
- **Alert Creation**: Tie alerts to saved searches
- **Delivery Channels**: Email and in-app notifications
- **Alert Cadence**: Real-time, daily, weekly, or monthly
- **Queue Jobs**: BullMQ integration for processing
- **Run History**: Track alert executions and new lead counts
- **Status Display**: Real-time monitoring of alert runs

### 🚀 Onboarding Wizard (`/onboarding`)
- **Multi-step Setup**: Guided wizard for organization ICP capture
- **Org ICP Fields**:
  - Industries (Technology, Finance, Healthcare, etc.)
  - Geographies (North America, Europe, Asia Pacific, etc.)
  - Deal Sizes ($1M ranges)
  - Personas (CEO, VP Sales, CFO, etc.)
- **AI Scoring**: Automatic scoring based on ICP criteria
- **Persistence**: Stored in database for future reference

## Tech Stack

### Backend
- **Framework**: NestJS 10
- **Database**: PostgreSQL with TypeORM
- **Job Queue**: BullMQ with Redis
- **Validation**: class-validator & class-transformer
- **Testing**: Jest & Supertest

### Frontend
- **Framework**: Next.js 15 with React 19
- **State Management**: Zustand
- **Maps**: Leaflet & react-leaflet
- **Forms**: React Hook Form
- **HTTP Client**: Axios
- **E2E Testing**: Playwright

## Project Structure

```
.
├── apps/
│   ├── backend/
│   │   ├── src/
│   │   │   ├── database/
│   │   │   │   └── entities/          # TypeORM entities
│   │   │   ├── modules/
│   │   │   │   ├── territories/
│   │   │   │   ├── alerts/
│   │   │   │   └── onboarding/
│   │   │   ├── common/
│   │   │   │   └── dtos/              # Data Transfer Objects
│   │   │   ├── app.module.ts
│   │   │   └── main.ts
│   │   └── test/
│   │       ├── territories.e2e-spec.ts
│   │       ├── alerts.e2e-spec.ts
│   │       └── onboarding.e2e-spec.ts
│   └── web/
│       ├── src/
│       │   ├── pages/
│       │   │   ├── map/
│       │   │   ├── alerts/
│       │   │   └── onboarding/
│       │   ├── components/
│       │   │   ├── territories/
│       │   │   ├── alerts/
│       │   │   └── onboarding/
│       │   ├── stores/                # Zustand stores
│       │   ├── lib/
│       │   │   └── api.ts
│       │   └── styles/
│       └── tests/e2e/
│           ├── territories.spec.ts
│           ├── alerts.spec.ts
│           └── onboarding.spec.ts
├── package.json
├── turbo.json
└── README.md
```

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Redis 7+

### Installation

1. **Install dependencies**:
```bash
pnpm install
```

2. **Setup environment variables**:
```bash
# Backend
cp apps/backend/.env.example apps/backend/.env

# Frontend
cp apps/web/.env.example apps/web/.env
```

3. **Configure database** (in `apps/backend/.env`):
```env
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres
DATABASE_NAME=map_alerts
```

### Running the Application

**Development mode** (both backend and frontend):
```bash
pnpm dev
```

This will start:
- Backend API: http://localhost:3001
- Frontend: http://localhost:3000

**Production build**:
```bash
pnpm build
```

### API Endpoints

#### Territories
- `POST /api/territories` - Create territory
- `GET /api/territories` - List territories
- `GET /api/territories/:id` - Get territory
- `PUT /api/territories/:id` - Update territory
- `DELETE /api/territories/:id` - Delete territory
- `PUT /api/territories/:id/assign-owner` - Assign owner
- `PUT /api/territories/:id/assign-owners` - Assign multiple owners

#### Alerts
- `POST /api/alerts` - Create alert
- `GET /api/alerts` - List alerts
- `GET /api/alerts/:id` - Get alert
- `PUT /api/alerts/:id` - Update alert
- `DELETE /api/alerts/:id` - Delete alert
- `POST /api/alerts/:id/trigger` - Trigger alert run
- `GET /api/alerts/:id/runs` - Get alert runs
- `GET /api/alerts/:alertId/runs/:runId` - Get run status

#### Onboarding
- `GET /api/onboarding` - Get or create onboarding data
- `PUT /api/onboarding/icp` - Update OrgICP
- `POST /api/onboarding/complete` - Complete onboarding

## Testing

### Backend Tests
```bash
cd apps/backend

# Unit & integration tests
pnpm test

# E2E tests
pnpm test:e2e
```

### Frontend E2E Tests
```bash
cd apps/web

# Run E2E tests
pnpm test:e2e

# Run E2E tests with UI
pnpm test:e2e --ui
```

## Database Schema

### Territories
- `id` (UUID)
- `organizationId` (UUID)
- `name` (String)
- `type` (Enum: polygon, radius, state, county)
- `polygonCoordinates` (JSONB)
- `radiusGeometry` (JSONB)
- `stateCode` (String)
- `countyCode` (String)
- `ownerId` (UUID)
- `ownerIds` (Array<UUID>)
- `isActive` (Boolean)
- Timestamps

### Alerts
- `id` (UUID)
- `organizationId` (UUID)
- `name` (String)
- `description` (String)
- `territoryId` (UUID)
- `savedSearch` (JSONB)
- `cadence` (Enum)
- `deliveryChannels` (Array)
- `recipients` (Array<String>)
- `isActive` (Boolean)
- `lastRunAt` (DateTime)
- Timestamps

### Alert Runs
- `id` (UUID)
- `alertId` (UUID)
- `status` (Enum: pending, running, success, failed)
- `newLeadsCount` (Integer)
- `queueJobId` (String)
- `errorMessage` (String)
- `completedAt` (DateTime)
- Timestamps

### Onboarding Data
- `id` (UUID)
- `organizationId` (UUID)
- `orgICP` (JSONB): industries, geographies, dealSizes, personas, aiScoring
- `isCompleted` (Boolean)
- `completedAt` (DateTime)
- Timestamps

## Features Breakdown

### Territory Map View
- Interactive Leaflet map with OSM tiles
- Territory markers with info popups
- Sidebar with territory list and form
- Heatmap layer for lead distribution visualization
- Draw tools for creating polygons/radius territories
- State/county selector for administrative boundaries

### Alert Management
- Create alerts tied to saved searches
- Configure delivery channels (email, in-app)
- Set alert cadence (real-time, daily, weekly, monthly)
- Trigger alerts manually or via scheduler
- BullMQ jobs process alerts asynchronously
- Track new lead counts per alert run
- Display run history with status and error messages

### Onboarding Wizard
- 4-step guided setup process
- Multi-select for industries, geographies, deal sizes, personas
- Progress tracking and navigation
- AI scoring calculates based on ICP factors
- Completion status and timestamp tracking

## API Response Examples

### Create Territory
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "organizationId": "org-123",
  "name": "California Territory",
  "type": "state",
  "stateCode": "CA",
  "ownerId": "user-456",
  "isActive": true,
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

### Create Alert
```json
{
  "id": "alert-123",
  "organizationId": "org-123",
  "name": "CA Tech Companies",
  "territoryId": "territory-123",
  "cadence": "daily",
  "deliveryChannels": ["email", "in_app"],
  "lastRunAt": null,
  "isActive": true
}
```

### Trigger Alert (creates run)
```json
{
  "id": "run-123",
  "alertId": "alert-123",
  "status": "pending",
  "newLeadsCount": 0,
  "queueJobId": "job-456",
  "createdAt": "2024-01-15T11:00:00Z"
}
```

### Complete Onboarding
```json
{
  "id": "onboarding-123",
  "organizationId": "org-123",
  "orgICP": {
    "industries": ["Technology", "Finance"],
    "geographies": ["North America", "Europe"],
    "dealSizes": ["$1M-$5M", "$5M-$10M"],
    "personas": ["CEO", "VP Sales", "CFO"],
    "aiScoring": {
      "score": 78,
      "updatedAt": "2024-01-15T12:00:00Z",
      "factors": {
        "industryScore": 60,
        "geoScore": 75,
        "dealSizeScore": 80,
        "personaScore": 100
      }
    }
  },
  "isCompleted": true,
  "completedAt": "2024-01-15T12:00:00Z"
}
```

## Development Workflow

1. **Start development servers**:
```bash
pnpm dev
```

2. **Make changes** to backend or frontend

3. **Run tests** to verify:
```bash
# Backend
cd apps/backend && pnpm test:e2e

# Frontend
cd apps/web && pnpm test:e2e
```

4. **Lint and format**:
```bash
pnpm lint
pnpm format
```

5. **Build for production**:
```bash
pnpm build
```

## Deployment

### Docker Compose Setup
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: map_alerts
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7
    ports:
      - "6379:6379"

  backend:
    build: ./apps/backend
    ports:
      - "3001:3001"
    depends_on:
      - postgres
      - redis
    environment:
      DATABASE_HOST: postgres
      REDIS_HOST: redis

  frontend:
    build: ./apps/web
    ports:
      - "3000:3000"

volumes:
  postgres_data:
```

## Acceptance Criteria

✅ **Territories persist to backend**: All territories are stored in PostgreSQL and synced  
✅ **Alerts trigger queue jobs**: BullMQ processes alert runs  
✅ **Alert status display**: Run history shows status, leads count, timestamps  
✅ **Onboarding updates OrgICP**: Schema stores industries, geos, deal size, personas  
✅ **E2E tests cover each flow**: Territory, alert, and onboarding E2E tests included  

## License

Proprietary - All rights reserved

## Support

For issues or questions, please refer to the documentation or contact the development team.
