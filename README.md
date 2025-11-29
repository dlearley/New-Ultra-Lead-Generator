# Admin Billing & Audit Module (Phase 7 Part 3)

A comprehensive admin panel for managing billing, usage metrics, audit logs, and AI model configurations with RBAC support.

## Features

### 1. Billing & Usage Module
- Surface billing searches and filters per organization
- Export billing data in JSON/CSV formats
- Track usage alerts for organizations near API call limits
- Mark organizations as trial/paid/delinquent
- Visualize usage trends and spending patterns
- Stub Stripe integration for payment processing

### 2. Audit & Compliance Module
- Searchable audit logs by organization, user, action, and date range
- Export audit logs in JSON/CSV formats
- Track all administrative actions with timestamps
- Monitor system activity and compliance
- Detailed statistics on audit events

### 3. AI Model Management
- Set active scoring model versions per organization
- Toggle AI model providers on/off
- Monitor model latency and error rates
- Track model performance metrics
- Record model usage metrics over time

### 4. RBAC & Security
- Role-based access control with permission gating
- Structured logging middleware for all admin operations
- JWT authentication support
- Predefined roles: admin, billing_manager, compliance_officer, ai_model_manager, viewer
- User context tracking in all operations

## Project Structure

```
packages/
├── api/                        # NestJS Backend API
│   ├── src/
│   │   ├── controllers/        # API endpoints
│   │   ├── services/           # Business logic
│   │   ├── entities/           # Database schemas
│   │   ├── dtos/               # Data transfer objects
│   │   ├── guards/             # Auth & RBAC guards
│   │   ├── decorators/         # Custom decorators
│   │   ├── middleware/         # Express middleware
│   │   ├── app.module.ts       # Main module
│   │   └── main.ts             # Entry point
│   └── package.json
│
└── web/                        # Next.js Frontend
    ├── src/
    │   ├── pages/
    │   │   ├── admin/          # Admin pages
    │   │   │   ├── billing.tsx
    │   │   │   ├── audit.tsx
    │   │   │   └── ai-models.tsx
    │   │   ├── _app.tsx
    │   │   └── _document.tsx
    │   ├── layouts/            # Layout components
    │   ├── components/         # Reusable components
    │   └── styles/             # Global styles
    └── package.json
```

## API Endpoints

### Billing Endpoints
- `POST /admin/billing` - Create billing record
- `GET /admin/billing/:organizationId` - Get billing by org
- `PUT /admin/billing/:organizationId` - Update billing
- `POST /admin/billing/search` - Search billings
- `POST /admin/billing/export` - Export billing data
- `GET /admin/billing/alerts/near-limit` - Get orgs near limit

### Audit Log Endpoints
- `POST /admin/audit-logs/search` - Search audit logs
- `GET /admin/audit-logs/organization/:organizationId` - Get org logs
- `GET /admin/audit-logs/user/:organizationId/:userId` - Get user logs
- `GET /admin/audit-logs/action/:organizationId/:action` - Get logs by action
- `POST /admin/audit-logs/export` - Export audit logs
- `GET /admin/audit-logs/stats/:organizationId` - Get audit stats

### AI Model Endpoints
- `POST /admin/ai-models` - Create AI model
- `GET /admin/ai-models/:id` - Get model by ID
- `GET /admin/ai-models/organization/:organizationId/all` - Get org models
- `GET /admin/ai-models/organization/:organizationId/active` - Get active model
- `PUT /admin/ai-models/:id` - Update model
- `POST /admin/ai-models/switch-active` - Switch active model
- `POST /admin/ai-models/toggle-provider` - Toggle provider
- `GET /admin/ai-models/organization/:organizationId/metrics` - Get metrics
- `POST /admin/ai-models/:id/record-metrics` - Record metrics
- `DELETE /admin/ai-models/:id` - Delete model

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL 12+
- pnpm (recommended)

### Installation

```bash
# Install dependencies
pnpm install

# Create .env files
cp packages/api/.env.example packages/api/.env
cp packages/web/.env.example packages/web/.env

# Run database migrations
pnpm --filter api run migrate

# Start development servers
pnpm dev
```

### Environment Variables

**API (.env)**
```
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres
DATABASE_NAME=admin_billing
PORT=3001
NODE_ENV=development
STRIPE_API_KEY=sk_test_...
CORS_ORIGIN=http://localhost:3000
```

**Web (.env.local)**
```
NEXT_PUBLIC_API_URL=http://localhost:3001/api
API_URL=http://localhost:3001/api
```

## Database Schema

### Billing Entity
- id (UUID, PK)
- organizationId (UUID, FK)
- status (enum: trial, paid, delinquent)
- plan (enum: starter, professional, enterprise)
- stripeCustomerId (string)
- stripeSubscriptionId (string)
- monthlySpend (decimal)
- apiCallsUsed (integer)
- apiCallsLimit (integer)
- usersCount (integer)
- projectsCount (integer)

### Usage Metrics Entity
- id (UUID, PK)
- organizationId (UUID, FK)
- metricType (enum: api_calls, search_queries, data_export, storage_gb, seats)
- value (integer)
- limit (integer)
- cost (decimal)
- dateRecorded (date)

### Audit Log Entity
- id (UUID, PK)
- organizationId (UUID, FK)
- userId (UUID)
- action (enum: create, read, update, delete, export, login, logout, etc.)
- resourceType (enum: user, organization, billing, usage, ai_model, etc.)
- resourceId (UUID)
- description (text)
- status (string)
- ipAddress (string)
- userAgent (string)

### AI Model Entity
- id (UUID, PK)
- organizationId (UUID, FK)
- name (string)
- provider (enum: openai, anthropic, cohere, local)
- version (string)
- status (enum: active, inactive, deprecated, beta)
- isActive (boolean)
- averageLatencyMs (decimal)
- errorRate (decimal)
- totalRequests (integer)
- failedRequests (integer)
- config (JSON)

## RBAC Permissions

### Admin
- All permissions

### Billing Manager
- billing:read, billing:update, billing:search, billing:export
- audit:read

### Compliance Officer
- audit:read, audit:search, audit:export
- billing:read

### AI Model Manager
- ai-model:create, ai-model:read, ai-model:update, ai-model:delete
- audit:read

### Viewer
- billing:read, audit:read, ai-model:read

## Structured Logging

All admin operations are logged with the following structure:
```json
{
  "timestamp": "2024-01-01T12:00:00Z",
  "method": "POST",
  "path": "/admin/billing",
  "statusCode": 201,
  "duration": "45ms",
  "userId": "user-id",
  "organizationId": "org-id",
  "userAgent": "...",
  "ipAddress": "..."
}
```

## Development

### Running Tests
```bash
pnpm test
```

### Linting
```bash
pnpm lint
```

### Building
```bash
pnpm build
```

## Acceptance Criteria Met

✅ Usage data visualized in charts and graphs
✅ Billing status updates saved to database
✅ Audit log filters work (org, user, action, date range)
✅ Export functionality works (JSON, CSV)
✅ AI model switches propagate to backend config
✅ RBAC gating enforced on all endpoints
✅ Structured logging implemented
✅ Stripe integration stubbed

## License

Proprietary - All rights reserved
