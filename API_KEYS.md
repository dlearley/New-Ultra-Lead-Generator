# API Key Management Guide

## Overview

API keys provide secure authentication for accessing the webhook and lead management API. Each key is scoped to an organization and can have different roles and rate limits.

## Key Concepts

### Roles

API keys support three role levels:

1. **read_only**: Can only read data (GET requests)
2. **read_write**: Can read and modify data (GET, POST, PUT)
3. **admin**: Full access including deletion and management

### Rate Limiting

Each API key has a configurable rate limit measured in requests per hour. Default is 1000 requests/hour.

Rate limit headers are included in all responses:
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Remaining requests in current window

## Creating API Keys

### Via API

```bash
curl -X POST http://localhost:8000/api/v1/keys \
  -H "Authorization: Bearer EXISTING_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Production API Key",
    "role": "read_write",
    "rate_limit": 5000
  }'
```

**Response:**
```json
{
  "id": "key_123abc",
  "key": "sk_abc123def456...",
  "key_prefix": "sk_abc123de",
  "name": "Production API Key",
  "role": "read_write",
  "rate_limit": 5000,
  "is_active": true,
  "created_at": "2025-01-01T12:00:00Z",
  "organization_id": "org_123"
}
```

**⚠️ Important:** The full `key` value is only returned once. Store it securely!

### Via Admin UI

1. Go to http://localhost:8000/admin/api-keys
2. Fill in the "Create New API Key" form
3. Click "Create API Key"
4. Copy and save the generated key immediately

## Using API Keys

### Authentication Header

Include your API key in the `Authorization` header:

```bash
Authorization: Bearer sk_your_api_key_here
```

### Example Request

```bash
curl -X GET http://localhost:8000/api/v1/webhooks \
  -H "Authorization: Bearer sk_abc123def456..."
```

### Python Example

```python
import httpx

API_KEY = "sk_your_api_key_here"
API_BASE = "http://localhost:8000/api/v1"

headers = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json"
}

with httpx.Client() as client:
    response = client.get(f"{API_BASE}/webhooks", headers=headers)
    webhooks = response.json()
    print(webhooks)
```

### JavaScript Example

```javascript
const API_KEY = 'sk_your_api_key_here';
const API_BASE = 'http://localhost:8000/api/v1';

const headers = {
  'Authorization': `Bearer ${API_KEY}`,
  'Content-Type': 'application/json'
};

fetch(`${API_BASE}/webhooks`, { headers })
  .then(response => response.json())
  .then(data => console.log(data));
```

## Managing API Keys

### List All Keys

```bash
curl -X GET http://localhost:8000/api/v1/keys \
  -H "Authorization: Bearer YOUR_API_KEY"
```

**Response:**
```json
[
  {
    "id": "key_123",
    "key_prefix": "sk_abc123",
    "name": "Production API Key",
    "role": "read_write",
    "rate_limit": 5000,
    "is_active": true,
    "last_used_at": "2025-01-01T12:00:00Z",
    "created_at": "2025-01-01T10:00:00Z",
    "organization_id": "org_123"
  }
]
```

### Get Specific Key

```bash
curl -X GET http://localhost:8000/api/v1/keys/key_123 \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### Revoke a Key

```bash
curl -X DELETE http://localhost:8000/api/v1/keys/key_123 \
  -H "Authorization: Bearer YOUR_API_KEY"
```

**Note:** Revoking a key is permanent and cannot be undone. The key will immediately stop working.

## Rate Limiting

### How It Works

Rate limits are enforced using a sliding window algorithm:
- Window size: 1 hour (3600 seconds)
- Limit: Configurable per key
- Tracked using Redis for performance

### Response When Limit Exceeded

**Status Code:** `429 Too Many Requests`

**Headers:**
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 0
```

**Body:**
```json
{
  "detail": "Rate limit exceeded"
}
```

### Best Practices

1. **Monitor Usage**: Check `X-RateLimit-Remaining` in responses
2. **Implement Backoff**: When approaching limit, slow down requests
3. **Use Appropriate Limits**: Request higher limits for production use
4. **Cache Responses**: Reduce unnecessary API calls

### Example: Rate Limit Aware Client

```python
import httpx
import time

class APIClient:
    def __init__(self, api_key):
        self.api_key = api_key
        self.base_url = "http://localhost:8000/api/v1"
        self.headers = {"Authorization": f"Bearer {api_key}"}
    
    def make_request(self, method, endpoint, **kwargs):
        response = httpx.request(
            method,
            f"{self.base_url}{endpoint}",
            headers=self.headers,
            **kwargs
        )
        
        # Check rate limit
        remaining = int(response.headers.get('X-RateLimit-Remaining', 0))
        if remaining < 10:
            print(f"Warning: Only {remaining} requests remaining")
        
        # Handle rate limit exceeded
        if response.status_code == 429:
            print("Rate limit exceeded, waiting 60 seconds...")
            time.sleep(60)
            return self.make_request(method, endpoint, **kwargs)
        
        response.raise_for_status()
        return response.json()
```

## Security Best Practices

### 1. Store Keys Securely

**DO:**
- Store in environment variables
- Use secret management services (AWS Secrets Manager, HashiCorp Vault)
- Encrypt keys at rest

**DON'T:**
- Commit keys to version control
- Store in plain text files
- Share keys via email/Slack

### 2. Rotate Keys Regularly

Create a rotation schedule:
1. Create a new API key
2. Update applications to use new key
3. Monitor old key usage
4. Revoke old key after grace period

### 3. Use Least Privilege

- Use `read_only` role when write access isn't needed
- Create separate keys for different services
- Revoke unused keys

### 4. Monitor Key Usage

- Check `last_used_at` timestamp regularly
- Review access logs
- Alert on unusual patterns

### 5. Limit Key Scope

- Use different keys for development/staging/production
- Don't share keys between applications
- Revoke keys when services are decommissioned

## Key Expiration

API keys can optionally expire after a set date:

```bash
curl -X POST http://localhost:8000/api/v1/keys \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Temporary Key",
    "role": "read_only",
    "rate_limit": 100,
    "expires_at": "2025-12-31T23:59:59Z"
  }'
```

Expired keys will return:
```json
{
  "detail": "Invalid or expired API key"
}
```

## Troubleshooting

### 401 Unauthorized

**Possible Causes:**
- Invalid API key
- Expired API key
- Revoked API key
- Missing Authorization header

**Solution:**
1. Verify key format: `sk_...`
2. Check key is active: `GET /api/v1/keys`
3. Ensure header format: `Authorization: Bearer sk_...`

### 429 Too Many Requests

**Possible Causes:**
- Rate limit exceeded
- Too many requests in short time

**Solution:**
1. Check `X-RateLimit-Limit` header
2. Implement request throttling
3. Request higher rate limit if needed

### 403 Forbidden

**Possible Causes:**
- Insufficient role permissions
- Organization access denied

**Solution:**
1. Check key role: `GET /api/v1/keys/{key_id}`
2. Use key with appropriate role
3. Verify organization access

## Admin UI

Manage API keys visually at:
- **Dashboard**: http://localhost:8000/admin
- **API Keys**: http://localhost:8000/admin/api-keys

Features:
- Create new keys
- View all organization keys
- See usage statistics
- Revoke keys
- Copy keys to clipboard

## API Reference

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/keys` | Create new API key |
| GET | `/api/v1/keys` | List all keys |
| GET | `/api/v1/keys/{key_id}` | Get specific key |
| DELETE | `/api/v1/keys/{key_id}` | Revoke key |

For complete API documentation:
- Interactive docs: http://localhost:8000/docs
- OpenAPI spec: `docs/openapi.yaml`
