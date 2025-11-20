# API Documentation

## Base URL

```
http://localhost:3001/api
```

## Authentication

All endpoints require JWT token in the `Authorization` header:

```
Authorization: Bearer <token>
```

## Response Format

All responses follow this format:

```json
{
  "data": {},
  "error": null,
  "meta": {
    "timestamp": "2024-01-01T12:00:00Z",
    "requestId": "uuid"
  }
}
```

## Billing Endpoints

### Create Billing Record

```http
POST /admin/billing
Content-Type: application/json
Authorization: Bearer <token>

{
  "organizationId": "org-123",
  "status": "trial",
  "plan": "starter",
  "stripeCustomerId": "cus_...",
  "monthlySpend": 99.99,
  "apiCallsLimit": 100000
}
```

**Response:**
```json
{
  "id": "billing-123",
  "organizationId": "org-123",
  "status": "trial",
  "plan": "starter",
  "monthlySpend": 99.99,
  "apiCallsUsed": 0,
  "apiCallsLimit": 100000,
  "createdAt": "2024-01-01T12:00:00Z"
}
```

### Get Billing by Organization

```http
GET /admin/billing/{organizationId}
Authorization: Bearer <token>
```

### Update Billing

```http
PUT /admin/billing/{organizationId}
Content-Type: application/json
Authorization: Bearer <token>

{
  "status": "paid",
  "plan": "professional",
  "monthlySpend": 299.99
}
```

### Search Billings

```http
POST /admin/billing/search
Content-Type: application/json
Authorization: Bearer <token>

{
  "status": "paid",
  "plan": "professional",
  "minMonthlySpend": 0,
  "maxMonthlySpend": 1000,
  "page": 1,
  "limit": 10
}
```

**Response:**
```json
{
  "data": [
    {
      "id": "billing-123",
      "organizationId": "org-123",
      "status": "paid",
      "plan": "professional",
      "monthlySpend": 299.99
    }
  ],
  "total": 1
}
```

### Export Billing Data

```http
POST /admin/billing/export
Content-Type: application/json
Authorization: Bearer <token>

{
  "format": "csv",
  "startDate": "2024-01-01",
  "endDate": "2024-12-31",
  "status": "paid"
}
```

**Response:** CSV file download

### Get Organizations Near Limit

```http
GET /admin/billing/alerts/near-limit
Authorization: Bearer <token>
```

## Audit Log Endpoints

### Search Audit Logs

```http
POST /admin/audit-logs/search
Content-Type: application/json
Authorization: Bearer <token>

{
  "organizationId": "org-123",
  "userId": "user-456",
  "action": "update",
  "resourceType": "billing",
  "startDate": "2024-01-01T00:00:00Z",
  "endDate": "2024-12-31T23:59:59Z",
  "page": 1,
  "limit": 20,
  "sortBy": "createdAt",
  "sortOrder": "DESC"
}
```

**Response:**
```json
{
  "data": [
    {
      "id": "audit-123",
      "organizationId": "org-123",
      "userId": "user-456",
      "action": "update",
      "resourceType": "billing",
      "description": "Updated billing record",
      "status": "success",
      "createdAt": "2024-01-01T12:00:00Z"
    }
  ],
  "total": 1
}
```

### Get Organization Logs

```http
GET /admin/audit-logs/organization/{organizationId}?limit=50&offset=0
Authorization: Bearer <token>
```

### Get User Logs

```http
GET /admin/audit-logs/user/{organizationId}/{userId}?limit=50
Authorization: Bearer <token>
```

### Get Logs by Action

```http
GET /admin/audit-logs/action/{organizationId}/{action}?limit=50
Authorization: Bearer <token>
```

### Export Audit Logs

```http
POST /admin/audit-logs/export
Content-Type: application/json
Authorization: Bearer <token>

{
  "organizationId": "org-123",
  "startDate": "2024-01-01T00:00:00Z",
  "endDate": "2024-12-31T23:59:59Z",
  "action": "update",
  "format": "json"
}
```

### Get Audit Statistics

```http
GET /admin/audit-logs/stats/{organizationId}
Authorization: Bearer <token>
```

**Response:**
```json
{
  "totalLogs": 1234,
  "actionCounts": [
    { "action": "create", "count": 100 },
    { "action": "update", "count": 500 },
    { "action": "delete", "count": 50 }
  ],
  "recentActivity": [...]
}
```

## AI Model Endpoints

### Create AI Model

```http
POST /admin/ai-models
Content-Type: application/json
Authorization: Bearer <token>

{
  "organizationId": "org-123",
  "name": "GPT-4 Scoring Model",
  "provider": "openai",
  "version": "1.0.0",
  "status": "beta",
  "isActive": false,
  "config": {
    "temperature": 0.7,
    "maxTokens": 100
  }
}
```

### Get Model by ID

```http
GET /admin/ai-models/{id}
Authorization: Bearer <token>
```

### Get Organization Models

```http
GET /admin/ai-models/organization/{organizationId}/all
Authorization: Bearer <token>
```

### Get Active Model

```http
GET /admin/ai-models/organization/{organizationId}/active
Authorization: Bearer <token>
```

### Update Model

```http
PUT /admin/ai-models/{id}
Content-Type: application/json
Authorization: Bearer <token>

{
  "name": "GPT-4 Scoring Model v2",
  "status": "active",
  "isActive": true,
  "averageLatencyMs": 150.25,
  "errorRate": 0.5
}
```

### Switch Active Model

```http
POST /admin/ai-models/switch-active
Content-Type: application/json
Authorization: Bearer <token>

{
  "modelId": "model-456"
}
```

### Get Model Metrics

```http
GET /admin/ai-models/organization/{organizationId}/metrics
Authorization: Bearer <token>
```

**Response:**
```json
[
  {
    "id": "model-123",
    "name": "GPT-4 Scoring Model",
    "provider": "openai",
    "version": "1.0.0",
    "isActive": true,
    "averageLatencyMs": 145.5,
    "errorRate": 0.5,
    "totalRequests": 10000,
    "failedRequests": 50,
    "successRate": 0.995
  }
]
```

### Record Model Metrics

```http
POST /admin/ai-models/{id}/record-metrics
Content-Type: application/json
Authorization: Bearer <token>

{
  "latencyMs": 120,
  "success": true
}
```

### Delete Model

```http
DELETE /admin/ai-models/{id}
Authorization: Bearer <token>
```

## Error Responses

### 400 Bad Request

```json
{
  "statusCode": 400,
  "message": "Invalid request parameters",
  "error": "BadRequestException"
}
```

### 401 Unauthorized

```json
{
  "statusCode": 401,
  "message": "Unauthorized - Invalid or missing token",
  "error": "UnauthorizedException"
}
```

### 403 Forbidden

```json
{
  "statusCode": 403,
  "message": "User does not have required permission: billing:update",
  "error": "ForbiddenException"
}
```

### 404 Not Found

```json
{
  "statusCode": 404,
  "message": "Resource not found",
  "error": "NotFoundException"
}
```

### 500 Internal Server Error

```json
{
  "statusCode": 500,
  "message": "Internal server error",
  "error": "InternalServerErrorException"
}
```

## Rate Limiting

- Default: 100 requests per minute per user
- Can be configured per role

Headers returned:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1704110460
```

## Pagination

All list endpoints support pagination:

```
?page=1&limit=10
```

Response includes:
```json
{
  "data": [...],
  "total": 500,
  "page": 1,
  "limit": 10,
  "pages": 50
}
```

## Filtering & Sorting

### Filtering

```
POST /admin/billing/search
{
  "status": "paid",
  "plan": "professional"
}
```

### Sorting

```
POST /admin/audit-logs/search
{
  "sortBy": "createdAt",
  "sortOrder": "DESC"
}
```

## Webhooks (Optional)

Billing and AI model changes can trigger webhooks:

```json
{
  "event": "billing.status_changed",
  "organizationId": "org-123",
  "data": {
    "oldStatus": "trial",
    "newStatus": "paid"
  }
}
```

## Testing with cURL

### Get Billing

```bash
curl -X GET http://localhost:3001/api/admin/billing/org-123 \
  -H "Authorization: Bearer <token>"
```

### Search Audit Logs

```bash
curl -X POST http://localhost:3001/api/admin/audit-logs/search \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "organizationId": "org-123",
    "action": "update",
    "page": 1,
    "limit": 10
  }'
```

### Create AI Model

```bash
curl -X POST http://localhost:3001/api/admin/ai-models \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "organizationId": "org-123",
    "name": "GPT-4",
    "provider": "openai",
    "version": "1.0.0"
  }'
```

## Rate Limits by Role

| Role | Requests/minute |
|------|-----------------|
| admin | 500 |
| billing_manager | 200 |
| compliance_officer | 200 |
| ai_model_manager | 150 |
| viewer | 100 |

## Versioning

Current API Version: `v1`

Future versions will be accessible at `/api/v2`, `/api/v3`, etc.

## Support

For API issues, check:
1. Request logs in audit system
2. Error messages in response
3. Server logs for detailed errors
