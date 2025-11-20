from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.utils import get_openapi

from app.config import settings
from app.api import api_keys, webhooks, events
from app.admin import routes as admin_routes

app = FastAPI(
    title="Webhooks & API Key Management",
    description="A comprehensive system for managing organization-scoped API keys and webhook delivery",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_keys.router)
app.include_router(webhooks.router)
app.include_router(events.router)
app.include_router(admin_routes.router)


@app.get("/")
def read_root():
    return {
        "message": "Webhooks & API Key Management API",
        "version": "1.0.0",
        "docs": "/docs",
        "admin": "/admin"
    }


@app.get("/health")
def health_check():
    return {"status": "healthy"}


def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema
    
    openapi_schema = get_openapi(
        title="Webhooks & API Key Management API",
        version="1.0.0",
        description="""
# Webhooks & API Key Management System

A comprehensive system for managing organization-scoped API keys and webhook delivery for lead management events.

## Features

- **API Key Management**: Create, list, and revoke API keys with role-based access
- **Rate Limiting**: Configurable rate limits per API key
- **Webhook Delivery**: Reliable delivery with exponential backoff retry
- **Security**: HMAC-SHA256 signature verification
- **Monitoring**: Delivery history and dead-letter queue

## Authentication

All API endpoints require authentication using an API key in the `Authorization` header:

```
Authorization: Bearer sk_your_api_key_here
```

## Webhook Events

### new_lead

Triggered when a new lead is created.

**Payload Example:**
```json
{
  "event": "new_lead",
  "timestamp": "2025-01-01T12:00:00Z",
  "data": {
    "id": "lead_123",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "source": "website"
  }
}
```

### lead_update

Triggered when a lead is updated.

**Payload Example:**
```json
{
  "event": "lead_update",
  "timestamp": "2025-01-01T12:00:00Z",
  "data": {
    "id": "lead_123",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "changes": {
      "status": "contacted"
    }
  }
}
```

## Signature Verification

All webhook deliveries include an `X-Webhook-Signature` header with HMAC-SHA256 signature:

**Python Example:**
```python
import hmac
import hashlib

def verify_signature(payload, signature, secret):
    expected = hmac.new(
        secret.encode(),
        payload.encode(),
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(signature, expected)
```

**Node.js Example:**
```javascript
const crypto = require('crypto');

function verifySignature(payload, signature, secret) {
    const expected = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');
    return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expected)
    );
}
```

## Rate Limiting

Rate limits are enforced per API key. The response includes headers:

- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Remaining requests in current window

When exceeded, returns `429 Too Many Requests`.

## Retry Policy

Failed webhook deliveries are automatically retried with exponential backoff:

- Initial delay: 1 second (configurable)
- Backoff multiplier: 2x (configurable)
- Max retries: 5 (configurable)
- Dead-letter queue after max retries
        """,
        routes=app.routes,
    )
    
    openapi_schema["info"]["x-logo"] = {
        "url": "https://fastapi.tiangolo.com/img/logo-margin/logo-teal.png"
    }
    
    app.openapi_schema = openapi_schema
    return app.openapi_schema


app.openapi = custom_openapi
