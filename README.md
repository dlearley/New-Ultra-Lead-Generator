# CRM Integration Platform

A comprehensive CRM integration platform that enables seamless lead synchronization between your business applications and popular CRM systems including Salesforce, HubSpot, and Pipedrive.

## Features

### Core Functionality
- **Multi-CRM Support**: Integrate with Salesforce, HubSpot, and Pipedrive
- **Field Mapping UI**: Intuitive interface to map business lead fields to CRM fields
- **Queue-Based Processing**: BullMQ for reliable, rate-limited sync processing
- **Real-time Status Dashboard**: Monitor sync jobs and view detailed logs
- **Error Handling**: Comprehensive error handling with retry mechanisms
- **Analytics Dashboard**: Visualize sync performance and statistics

### Technical Features
- **RESTful API**: Modern Express.js API with TypeScript
- **Rate Limiting**: Configurable rate limiting for all endpoints
- **Validation**: Zod-based request validation
- **Database**: PostgreSQL with Prisma ORM
- **Queue System**: Redis-backed BullMQ for async processing
- **Testing**: Comprehensive test suite with mocked CRM APIs
- **Modern UI**: Next.js dashboard with Tailwind CSS

## Architecture

### Backend (`apps/api`)
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Queue**: BullMQ with Redis
- **Authentication**: JWT-based (headers)
- **Rate Limiting**: Express-rate-limit
- **Logging**: Winston

### Frontend (`apps/web`)
- **Framework**: Next.js 14 with App Router
- **Styling**: Tailwind CSS
- **State Management**: React Query
- **Forms**: React Hook Form
- **UI Components**: Headless UI + Heroicons

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL
- Redis
- npm or yarn

### Installation

1. **Clone and install dependencies**
```bash
git clone <repository-url>
cd crm-integration-platform
npm install
```

2. **Environment Setup**
```bash
# Copy environment templates
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.local.example apps/web/.env.local

# Configure your database and Redis connections
# Edit apps/api/.env with your settings
```

3. **Database Setup**
```bash
cd apps/api
npx prisma generate
npx prisma db push
```

4. **Start Development Servers**
```bash
# Start API server (port 3001)
npm run dev

# In another terminal, start web app (port 3000)
cd apps/web
npm run dev
```

5. **Access the Application**
- Web Dashboard: http://localhost:3000
- API Documentation: http://localhost:3001/api/integrations/health

## API Endpoints

### CRM Push Operations
- `POST /api/integrations/crm/push-leads` - Push leads to CRM
- `GET /api/integrations/crm/sync-jobs` - List sync jobs
- `GET /api/integrations/crm/sync-jobs/:id` - Get specific sync job
- `POST /api/integrations/crm/test-connection` - Test CRM connection

### Field Mapping
- `POST /api/integrations/field-mappings` - Create field mappings
- `GET /api/integrations/field-mappings` - List field mappings
- `DELETE /api/integrations/field-mappings/:id` - Delete field mapping
- `GET /api/integrations/field-mappings/crm-fields/:crmType` - Get available CRM fields
- `POST /api/integrations/field-mappings/validate` - Validate field mappings
- `GET /api/integrations/field-mappings/standard-fields` - Get standard business lead fields

## Configuration

### CRM Setup

#### Salesforce
1. Create a Connected App in Salesforce Setup
2. Enable OAuth 2.0 with specified callback URL
3. Configure Consumer Key, Consumer Secret, and Security Token
4. Set up user credentials

#### HubSpot
1. Create a Private App in HubSpot
2. Configure required scopes (crm.objects.contacts.write)
3. Generate access token
4. Configure integration

#### Pipedrive
1. Generate API token from Company Settings > API
2. Note company domain
3. Configure integration

## Testing

### Backend Tests
```bash
cd apps/api
npm test
```

### Frontend Tests
```bash
cd apps/web
npm test
```

### Integration Tests
The test suite includes comprehensive mocked CRM API tests for all adapters:
- Salesforce adapter tests
- HubSpot adapter tests  
- Pipedrive adapter tests
- Field mapping validation tests
- Queue processing tests

## Deployment

### Environment Variables
Key environment variables for production:

**API Server:**
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_HOST`, `REDIS_PORT` - Redis connection
- `JWT_SECRET` - Authentication secret
- `ENCRYPTION_KEY` - For credential encryption

**Web App:**
- `NEXT_PUBLIC_API_URL` - API server URL
- `NEXT_PUBLIC_ORGANIZATION_ID` - Organization identifier

### Production Build
```bash
# Build API
cd apps/api
npm run build

# Build Web App
cd apps/web
npm run build
```

## Rate Limiting

The application implements multi-tier rate limiting:
- **General API**: 100 requests per 15 minutes per IP
- **CRM Push**: 10 requests per minute per organization
- **Field Mapping**: 50 requests per 5 minutes per organization

## Queue Processing

BullMQ processes CRM sync jobs with the following features:
- **Retry Logic**: Up to 3 attempts with exponential backoff
- **Concurrency**: Configurable worker concurrency (default: 5)
- **Job Retention**: 100 completed jobs, 50 failed jobs
- **Error Handling**: Comprehensive error logging and retry mechanisms

## Monitoring

### Health Checks
- API health endpoint: `/api/integrations/health`
- Database connectivity checks
- Redis connectivity checks
- CRM connection status monitoring

### Logging
- Structured JSON logging with Winston
- Request/response logging
- Error tracking with stack traces
- Performance metrics

## Security

- Input validation with Zod schemas
- SQL injection prevention via Prisma ORM
- Rate limiting to prevent abuse
- Credential encryption for storage
- CORS configuration
- Security headers with Helmet

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run the test suite
6. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions, please open an issue in the repository or contact the development team.