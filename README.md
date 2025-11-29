# Webhooks & API Key Management System

A comprehensive system for managing organization-scoped API keys and webhook delivery for lead management events.

## Features

- **API Key Management**: Create, list, and revoke API keys with role-based access and rate limiting
- **Webhook Delivery**: Reliable delivery service for "new leads" and "lead updates" events
- **Admin UI**: Configure webhook endpoints, secrets, retry policies, and view delivery history
- **Security**: HMAC signature verification for webhook payloads
- **Reliability**: Exponential retry with backoff, dead-letter queue, and failure alerting
- **Documentation**: Full OpenAPI/Swagger specification with payload schemas

## Quick Start

### Prerequisites

- Python 3.11+
- PostgreSQL 14+
- Redis 6+

### Installation

```bash
# Install dependencies
pip install -r requirements.txt

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Run database migrations
alembic upgrade head

# Start the API server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Start the webhook worker (in another terminal)
celery -A app.worker.celery_app worker --loglevel=info
```

### Access

- API: http://localhost:8000
- API Documentation: http://localhost:8000/docs
- Admin UI: http://localhost:8000/admin

## API Endpoints

### API Keys

- `POST /api/v1/keys` - Create a new API key
- `GET /api/v1/keys` - List organization's API keys
- `DELETE /api/v1/keys/{key_id}` - Revoke an API key

### Webhooks

- `POST /api/v1/webhooks` - Create webhook endpoint
- `GET /api/v1/webhooks` - List webhook endpoints
- `PUT /api/v1/webhooks/{webhook_id}` - Update webhook endpoint
- `DELETE /api/v1/webhooks/{webhook_id}` - Delete webhook endpoint
- `GET /api/v1/webhooks/deliveries` - View delivery history

## Webhook Events

### new_lead

Triggered when a new lead is created.

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

## Rate Limiting

Rate limits are enforced per API key:
- Default: 1000 requests per hour
- Configurable per key with different tiers

## Webhook Signature Verification

All webhook deliveries include an `X-Webhook-Signature` header with HMAC-SHA256 signature:

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

## Retry Policy

- Initial retry: 1 second
- Exponential backoff: 2x multiplier
- Max retries: 5
- Dead-letter queue after max retries

## Development

### Running Tests

```bash
pytest
```

### Generating OpenAPI Spec

```bash
python scripts/generate_openapi.py
```

## License

MIT
