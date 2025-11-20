# Webhook Integration Guide

## Overview

The Webhook system allows your application to receive real-time notifications when specific events occur in the lead management system.

## Event Types

### 1. new_lead

Triggered when a new lead is created in the system.

**Payload Schema:**
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

**Fields:**
- `event`: Event type identifier
- `timestamp`: ISO 8601 timestamp when the event occurred
- `data.id`: Unique identifier for the lead
- `data.name`: Lead's full name
- `data.email`: Lead's email address
- `data.phone`: Lead's phone number (optional)
- `data.source`: Source where the lead came from (optional)

### 2. lead_update

Triggered when an existing lead is updated.

**Payload Schema:**
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
      "status": "contacted",
      "notes": "Called and left voicemail"
    }
  }
}
```

**Fields:**
- `event`: Event type identifier
- `timestamp`: ISO 8601 timestamp when the event occurred
- `data.id`: Unique identifier for the lead
- `data.name`: Lead's current name
- `data.email`: Lead's current email
- `data.phone`: Lead's current phone (optional)
- `data.changes`: Object containing the fields that were changed

## Setting Up Webhooks

### 1. Create a Webhook Endpoint

**Via API:**
```bash
curl -X POST http://localhost:8000/api/v1/webhooks \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-app.com/webhook",
    "description": "Production webhook endpoint",
    "events": ["new_lead", "lead_update"],
    "max_retries": 5,
    "timeout": 30
  }'
```

**Response:**
```json
{
  "id": "webhook_123",
  "url": "https://your-app.com/webhook",
  "secret": "whsec_abc123...",
  "events": ["new_lead", "lead_update"],
  "is_active": true,
  "max_retries": 5,
  "timeout": 30
}
```

**⚠️ Important:** Save the `secret` value - you'll need it to verify webhook signatures.

### 2. Implement Your Endpoint

Your webhook endpoint should:
1. Accept POST requests
2. Verify the signature
3. Process the event
4. Return a 2xx status code

**Example (Python/Flask):**
```python
import hmac
import hashlib
from flask import Flask, request, jsonify

app = Flask(__name__)
WEBHOOK_SECRET = "whsec_your_secret_here"

@app.route('/webhook', methods=['POST'])
def webhook():
    # Get the signature from headers
    signature = request.headers.get('X-Webhook-Signature')
    if not signature:
        return jsonify({"error": "No signature"}), 401
    
    # Get the payload
    payload = request.get_data(as_text=True)
    
    # Verify the signature
    expected_signature = hmac.new(
        WEBHOOK_SECRET.encode(),
        payload.encode(),
        hashlib.sha256
    ).hexdigest()
    
    if not hmac.compare_digest(signature, expected_signature):
        return jsonify({"error": "Invalid signature"}), 401
    
    # Process the event
    event = request.json
    event_type = event['event']
    
    if event_type == 'new_lead':
        handle_new_lead(event['data'])
    elif event_type == 'lead_update':
        handle_lead_update(event['data'])
    
    return jsonify({"status": "received"}), 200
```

**Example (Node.js/Express):**
```javascript
const express = require('express');
const crypto = require('crypto');

const app = express();
const WEBHOOK_SECRET = 'whsec_your_secret_here';

app.post('/webhook', express.raw({type: 'application/json'}), (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  
  if (!signature) {
    return res.status(401).json({error: 'No signature'});
  }
  
  // Verify signature
  const expectedSignature = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(req.body)
    .digest('hex');
  
  if (!crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  )) {
    return res.status(401).json({error: 'Invalid signature'});
  }
  
  // Process event
  const event = JSON.parse(req.body);
  
  if (event.event === 'new_lead') {
    handleNewLead(event.data);
  } else if (event.event === 'lead_update') {
    handleLeadUpdate(event.data);
  }
  
  res.status(200).json({status: 'received'});
});
```

## Signature Verification

All webhook deliveries include an `X-Webhook-Signature` header containing an HMAC-SHA256 signature of the payload.

**Algorithm:**
```
signature = HMAC-SHA256(secret, payload)
```

**Always verify signatures to ensure:**
- The webhook came from our system
- The payload wasn't tampered with

## Delivery & Retry Behavior

### Successful Delivery

A delivery is considered successful when your endpoint:
- Returns a `2xx` status code (200-299)
- Responds within the configured timeout (default: 30 seconds)

### Failed Delivery

A delivery fails when:
- Your endpoint returns a non-2xx status code
- The request times out
- A network error occurs

### Retry Policy

When a delivery fails:
1. **Initial Retry**: Waits 1 second (configurable)
2. **Exponential Backoff**: Each retry waits 2x longer than the previous
3. **Max Retries**: Default 5 attempts (configurable)
4. **Dead Letter Queue**: After max retries, moved to DLQ

**Example Retry Schedule:**
- Attempt 1: Immediate
- Attempt 2: 1 second later
- Attempt 3: 2 seconds later
- Attempt 4: 4 seconds later
- Attempt 5: 8 seconds later
- Attempt 6: 16 seconds later

## Webhook Headers

Each webhook request includes these headers:

| Header | Description |
|--------|-------------|
| `Content-Type` | Always `application/json` |
| `X-Webhook-Signature` | HMAC-SHA256 signature for verification |
| `X-Webhook-Event` | Event type (e.g., `new_lead`) |
| `X-Webhook-Delivery-Id` | Unique identifier for this delivery attempt |

## Best Practices

### 1. Verify Signatures

Always verify webhook signatures to prevent unauthorized requests.

### 2. Return Quickly

- Process webhooks asynchronously
- Return a 2xx status immediately
- Queue heavy processing for later

**Example:**
```python
@app.route('/webhook', methods=['POST'])
def webhook():
    # Verify signature
    if not verify_signature(request):
        return jsonify({"error": "Invalid signature"}), 401
    
    # Queue for processing
    queue.enqueue(process_webhook, request.json)
    
    # Return immediately
    return jsonify({"status": "queued"}), 200
```

### 3. Handle Idempotency

The same webhook may be delivered multiple times. Use the delivery ID to prevent duplicate processing:

```python
def process_webhook(event, delivery_id):
    # Check if already processed
    if redis.exists(f"processed:{delivery_id}"):
        return
    
    # Process the event
    handle_event(event)
    
    # Mark as processed
    redis.setex(f"processed:{delivery_id}", 86400, "1")
```

### 4. Monitor Failures

- Check delivery logs regularly via `/api/v1/webhooks/deliveries/`
- Set up alerts for repeated failures
- Review dead letter queue items

### 5. Test Locally

Use tools like [ngrok](https://ngrok.com/) to test webhooks locally:

```bash
# Start ngrok
ngrok http 3000

# Use the ngrok URL as your webhook endpoint
https://abc123.ngrok.io/webhook
```

## Troubleshooting

### Webhooks Not Being Received

1. **Check endpoint is active**: Ensure `is_active` is `true`
2. **Verify URL is accessible**: Test with curl/Postman
3. **Check firewall rules**: Ensure our IPs can reach your server
4. **Review delivery logs**: Check `/api/v1/webhooks/deliveries/` for errors

### Signature Verification Failing

1. **Use raw payload**: Don't parse JSON before verification
2. **Check secret**: Ensure you're using the correct secret
3. **Handle encoding**: Use UTF-8 encoding consistently
4. **Test verification**: Use known good examples first

### Timeouts

1. **Process asynchronously**: Don't do heavy work in webhook handler
2. **Increase timeout**: Configure higher timeout if needed
3. **Optimize endpoint**: Ensure fast response times

## Example: Complete Integration

Here's a complete example of a webhook receiver:

```python
from flask import Flask, request, jsonify
import hmac
import hashlib
import logging

app = Flask(__name__)
logging.basicConfig(level=logging.INFO)

WEBHOOK_SECRET = "your_secret_here"

def verify_signature(payload, signature):
    """Verify webhook signature"""
    expected = hmac.new(
        WEBHOOK_SECRET.encode(),
        payload.encode(),
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(signature, expected)

@app.route('/webhook', methods=['POST'])
def webhook_handler():
    """Handle incoming webhooks"""
    # Get signature
    signature = request.headers.get('X-Webhook-Signature')
    if not signature:
        logging.error("Missing signature")
        return jsonify({"error": "Missing signature"}), 401
    
    # Get payload
    payload = request.get_data(as_text=True)
    
    # Verify signature
    if not verify_signature(payload, signature):
        logging.error("Invalid signature")
        return jsonify({"error": "Invalid signature"}), 401
    
    # Parse event
    event = request.json
    event_type = event.get('event')
    delivery_id = request.headers.get('X-Webhook-Delivery-Id')
    
    logging.info(f"Received {event_type} event (delivery: {delivery_id})")
    
    # Route to handler
    if event_type == 'new_lead':
        handle_new_lead(event['data'])
    elif event_type == 'lead_update':
        handle_lead_update(event['data'])
    else:
        logging.warning(f"Unknown event type: {event_type}")
    
    return jsonify({"status": "success"}), 200

def handle_new_lead(data):
    """Process new lead event"""
    logging.info(f"New lead: {data['name']} ({data['email']})")
    # Your business logic here
    
def handle_lead_update(data):
    """Process lead update event"""
    logging.info(f"Lead updated: {data['id']}")
    logging.info(f"Changes: {data['changes']}")
    # Your business logic here

if __name__ == '__main__':
    app.run(port=3000)
```

## Admin UI

Manage webhooks via the admin interface at:
- **Dashboard**: http://localhost:8000/admin
- **Webhooks**: http://localhost:8000/admin/webhooks
- **Delivery History**: http://localhost:8000/admin/deliveries

## API Reference

For complete API documentation, see:
- Interactive docs: http://localhost:8000/docs
- OpenAPI spec: `docs/openapi.yaml`
