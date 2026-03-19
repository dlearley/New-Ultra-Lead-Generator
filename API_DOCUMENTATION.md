# Ultra Lead Generator API Documentation

## Base URL
```
Production: https://api.yourdomain.com/v1
Development: http://localhost:3001
```

## Authentication
All API requests require a Bearer token in the Authorization header:
```
Authorization: Bearer YOUR_JWT_TOKEN
```

---

## Core Resources

### Authentication

#### POST /auth/login
Login with email and password.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "yourpassword"
}
```

**Response:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "user_123",
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

#### POST /auth/refresh
Refresh access token.

**Request:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

---

## Contacts

### GET /contacts
List all contacts with pagination.

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20)
- `search` (string): Search query
- `status` (string): Filter by status

**Response:**
```json
{
  "data": [
    {
      "id": "contact_123",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "phone": "+1234567890",
      "company": {
        "id": "comp_456",
        "name": "Acme Inc"
      },
      "leadScore": 85,
      "status": "active",
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

### POST /contacts
Create a new contact.

**Request:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "companyId": "comp_456",
  "title": "CEO",
  "source": "website"
}
```

### GET /contacts/:id
Get a single contact.

### PUT /contacts/:id
Update a contact.

### DELETE /contacts/:id
Delete a contact.

---

## Companies

### GET /companies
List all companies.

### POST /companies
Create a new company.

**Request:**
```json
{
  "name": "Acme Inc",
  "domain": "acme.com",
  "industry": "Technology",
  "size": "51-200",
  "revenue": "10M-50M"
}
```

---

## Deals

### GET /deals
List all deals.

### POST /deals
Create a new deal.

**Request:**
```json
{
  "name": "Enterprise License",
  "value": 50000,
  "stage": "proposal",
  "contactId": "contact_123",
  "expectedCloseDate": "2024-03-15"
}
```

### GET /deals/pipeline
Get pipeline view with stages.

---

## Sequences (Outreach)

### GET /sequences
List all sequences.

### POST /sequences
Create a new sequence.

**Request:**
```json
{
  "name": "Welcome Series",
  "description": "Onboarding sequence for new leads",
  "channel": "email",
  "steps": [
    {
      "order": 1,
      "delayDays": 0,
      "subject": "Welcome!",
      "body": "Hi {{firstName}}, welcome to..."
    },
    {
      "order": 2,
      "delayDays": 3,
      "subject": "Quick question",
      "body": "Hey {{firstName}}, I wanted to..."
    }
  ]
}
```

### POST /sequences/:id/enroll
Enroll a contact in a sequence.

**Request:**
```json
{
  "contactId": "contact_123"
}
```

---

## Analytics

### GET /analytics-dashboard/summary
Get dashboard overview with KPIs.

**Response:**
```json
{
  "kpis": {
    "totalLeads": 1250,
    "leadConversionRate": 12.5,
    "totalRevenue": 450000,
    "cac": 125,
    "ltvCacRatio": 3.2,
    "roi": 285
  },
  "funnel": {
    "totalEntries": 1000,
    "totalConversions": 125,
    "overallConversionRate": 12.5,
    "stages": [...]
  }
}
```

### GET /analytics-dashboard/funnel/lead
Get lead conversion funnel.

### GET /analytics-dashboard/roi
Get ROI and CAC metrics.

### GET /analytics-dashboard/campaigns
Get campaign performance data.

---

## AI Features

### POST /ai/research/:contactId
Research a contact/company.

**Response:**
```json
{
  "company": {
    "funding": {
      "totalRaised": "$50M",
      "latestRound": "Series B",
      "investors": ["VC Firm A", "VC Firm B"]
    },
    "techStack": ["React", "Node.js", "AWS"],
    "news": [...]
  }
}
```

### POST /ai/personalize
Generate personalized content.

**Request:**
```json
{
  "contactId": "contact_123",
  "channel": "email",
  "contentType": "intro"
}
```

---

## Predictive (Phase 4)

### GET /predictive/churn-risk/:contactId
Get churn risk score.

**Response:**
```json
{
  "contactId": "contact_123",
  "riskScore": 75,
  "riskLevel": "high",
  "factors": [
    {
      "name": "Inactivity",
      "weight": 0.3,
      "score": 80,
      "description": "45 days since last activity"
    }
  ],
  "recommendations": [
    "Reach out with a personalized check-in message",
    "Schedule a value-add demo"
  ]
}
```

### GET /predictive/best-time/:contactId
Get best time to contact.

### GET /predictive/conversion/:contactId
Get conversion probability.

---

## Security (Phase 4)

### GET /security/settings
Get security settings.

### PUT /security/settings
Update security settings.

**Request:**
```json
{
  "ipWhitelistEnabled": true,
  "sessionTimeoutMinutes": 240,
  "passwordPolicy": "enterprise",
  "mfaRequired": true
}
```

### GET /security/ip-whitelist
List IP whitelist entries.

### POST /security/ip-whitelist
Add IP to whitelist.

**Request:**
```json
{
  "ipPattern": "192.168.1.0/24",
  "description": "Office Network"
}
```

---

## Calendar (Phase 2)

### GET /calendar/connections
List calendar connections.

### POST /calendar/connect/:provider
Connect calendar (google/outlook/microsoft).

### GET /calendar/availability
Get availability slots.

**Query Parameters:**
- `start`: Start date (ISO 8601)
- `end`: End date (ISO 8601)
- `duration`: Meeting duration in minutes

### POST /calendar/bookings
Create a meeting booking.

---

## Webhooks (Phase 1)

### GET /webhooks
List webhooks.

### POST /webhooks
Create webhook.

**Request:**
```json
{
  "url": "https://your-app.com/webhook",
  "events": ["contact.created", "deal.won"],
  "description": "CRM sync"
}
```

### GET /webhooks/:id/stats
Get webhook delivery stats.

---

## Error Responses

### 400 Bad Request
```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "errors": ["email is required"]
}
```

### 401 Unauthorized
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

### 429 Too Many Requests
```json
{
  "statusCode": 429,
  "message": "Rate limit exceeded",
  "retryAfter": 60
}
```

---

## Rate Limits

| Tier | Per Minute | Per Hour | Per Day |
|------|------------|----------|---------|
| Free | 60 | 500 | 2,000 |
| Pro | 300 | 5,000 | 50,000 |
| Enterprise | 1,000 | 50,000 | 500,000 |

---

## Webhook Events

### Contact Events
- `contact.created` - New contact created
- `contact.updated` - Contact updated
- `contact.qualified` - Lead qualified

### Deal Events
- `deal.created` - New deal created
- `deal.updated` - Deal updated
- `deal.won` - Deal closed won
- `deal.lost` - Deal closed lost

### Email Events
- `email.sent` - Email sent
- `email.delivered` - Email delivered
- `email.opened` - Email opened
- `email.clicked` - Link clicked
- `email.bounced` - Email bounced

### Meeting Events
- `meeting.booked` - Meeting scheduled
- `meeting.cancelled` - Meeting cancelled

---

## SDKs

### JavaScript/TypeScript
```bash
npm install ultralead-sdk
```

```javascript
import { UltraLead } from 'ultralead-sdk';

const client = new UltraLead({
  apiKey: 'your_api_key',
  baseUrl: 'https://api.yourdomain.com/v1'
});

const contacts = await client.contacts.list({
  page: 1,
  limit: 20
});
```

### Python
```bash
pip install ultralead
```

```python
from ultralead import Client

client = Client(api_key='your_api_key')
contacts = client.contacts.list(page=1, limit=20)
```

---

## Support

For API support:
- Email: api-support@ultralead.com
- Documentation: https://docs.ultralead.com
- Status: https://status.ultralead.com
