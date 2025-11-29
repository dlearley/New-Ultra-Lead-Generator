# Admin Data Sources Management System

Phase 7 Part 2 implementation for comprehensive data source management, feature flags, plans editor, data quality dashboard, and health monitoring.

## Features

### Data Source Management
- Configure API keys with encrypted storage
- Set rate limits per connector (minute/hour/day)
- Enable/disable individual connectors
- Real-time health monitoring
- Support for API, Database, File, and Stream connectors

### Feature Flags & Plans Editor
- Define plan tiers (Basic, Pro, Enterprise, Custom)
- Toggle features per tenant with overrides
- Bulk operations for plan management
- Clone existing plans
- Real-time feature flag propagation

### Data Quality Dashboard
- Metrics by region and industry
- Comprehensive quality scores (completeness, accuracy, consistency, timeliness, validity)
- Trend analysis and historical data
- Interactive charts with pagination and filtering

### Moderation Queue
- Review and approve profile/data/config changes
- Bulk approval workflows
- Audit trail with moderator notes
- Real-time queue updates

### Health Monitoring
- Real-time connector health status
- Error logging with severity levels
- Health trends and analytics
- Automatic issue detection and alerting
- WebSocket-based real-time updates

## Architecture

### Backend (Node.js + TypeScript)
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with connection pooling
- **Authentication**: JWT with bcrypt password hashing
- **Encryption**: AES-256-GCM for sensitive data
- **Real-time**: WebSocket server for live updates
- **Logging**: Winston with structured logging
- **Search**: OpenSearch integration for log analysis

### Frontend (React + TypeScript)
- **Framework**: React 18 with TypeScript
- **UI Library**: Tailwind CSS with Headless UI
- **State Management**: React Query for server state
- **Routing**: React Router v6
- **Forms**: React Hook Form
- **Charts**: Recharts for data visualization
- **Real-time**: WebSocket client integration

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL 12+
- npm or yarn

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Copy environment variables:
```bash
cp .env.example .env
```

4. Update `.env` with your configuration:
```bash
DB_HOST=localhost
DB_PORT=5432
DB_NAME=admin_data_sources
DB_USER=postgres
DB_PASSWORD=your_password
JWT_SECRET=your_jwt_secret
ENCRYPTION_KEY=your_32_byte_encryption_key
```

5. Build and start the server:
```bash
npm run build
npm start
```

For development:
```bash
npm run dev
```

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start development server:
```bash
npm run dev
```

4. Build for production:
```bash
npm run build
```

## Database Schema

The application uses PostgreSQL with the following main tables:

- `admin_users` - User authentication and authorization
- `data_sources` - Connector configurations with encrypted credentials
- `feature_flags` - Feature flag definitions with tenant overrides
- `plans` - Subscription plans and feature mappings
- `data_quality_metrics` - Quality metrics by region/industry
- `moderation_queue` - Pending changes awaiting approval
- `health_logs` - System health and error logs

## Security Features

- **Encrypted Storage**: All API keys and sensitive credentials are encrypted using AES-256-GCM
- **JWT Authentication**: Secure token-based authentication with configurable expiration
- **Role-Based Access Control**: Granular permissions per resource and action
- **Input Validation**: Comprehensive validation using Joi schemas
- **CORS Protection**: Configurable cross-origin resource sharing
- **Rate Limiting**: Built-in rate limiting per connector
- **SQL Injection Prevention**: Parameterized queries throughout

## API Documentation

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/user/me` - Get current user
- `PUT /api/user/profile` - Update profile
- `PUT /api/user/password` - Change password

### Data Sources
- `GET /api/data-sources` - List data sources (with pagination)
- `GET /api/data-sources/:id` - Get specific data source
- `POST /api/data-sources` - Create new data source
- `PUT /api/data-sources/:id` - Update data source
- `DELETE /api/data-sources/:id` - Delete data source
- `PATCH /api/data-sources/:id/toggle` - Enable/disable data source

### Feature Flags
- `GET /api/feature-flags` - List feature flags
- `POST /api/feature-flags` - Create feature flag
- `PUT /api/feature-flags/:id` - Update feature flag
- `POST /api/feature-flags/:id/tenant-overrides` - Add tenant override
- `DELETE /api/feature-flags/:id/tenant-overrides/:tenantId` - Remove override

### Plans
- `GET /api/plans` - List plans
- `POST /api/plans` - Create plan
- `PUT /api/plans/:id` - Update plan
- `POST /api/plans/:id/clone` - Clone plan
- `PATCH /api/plans/:id/toggle` - Activate/deactivate plan

### Data Quality
- `GET /api/data-quality` - Get quality metrics
- `GET /api/data-quality/summary` - Get summary statistics
- `GET /api/data-quality/trends` - Get trend data
- `POST /api/data-quality` - Create/update metrics

### Moderation
- `GET /api/moderation` - Get moderation queue
- `PATCH /api/moderation/:id/approve` - Approve changes
- `PATCH /api/moderation/:id/reject` - Reject changes
- `PATCH /api/moderation/bulk-approve` - Bulk approve

### Health Monitoring
- `GET /api/health/logs` - Get health logs
- `GET /api/health/summary` - Get health summary
- `GET /api/health/trends` - Get health trends
- `POST /api/health/logs` - Create health log
- `PATCH /api/health/logs/:id/resolve` - Resolve health log

## Real-time Features

The system uses WebSockets for real-time updates:

- **Health Updates**: Live connector health status changes
- **Data Quality Updates**: Real-time quality metric changes
- **System Alerts**: Immediate notifications for critical issues
- **Moderation Updates**: Live queue status changes

WebSocket endpoint: `ws://localhost:3001` (adjust for your environment)

## Deployment

### Production Considerations

1. **Environment Variables**: Ensure all secrets are properly configured
2. **Database**: Use a managed PostgreSQL service with backups
3. **SSL/TLS**: Enable HTTPS for all API endpoints
4. **Monitoring**: Set up application monitoring and alerting
5. **Scaling**: Consider horizontal scaling with load balancers
6. **Backups**: Regular database and configuration backups

### Docker Deployment

```dockerfile
# Backend Dockerfile example
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
EXPOSE 3001
CMD ["node", "dist/index.js"]
```

## Testing

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

This project is part of the Admin Data Sources Management System implementation.