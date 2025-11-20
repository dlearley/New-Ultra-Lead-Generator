import httpx
import logging
from datetime import datetime, timedelta
from typing import Dict, Any

from app.worker.celery_app import celery_app
from app.database import SessionLocal
from app.models.webhook_delivery import WebhookDelivery, DeliveryStatus
from app.models.webhook_endpoint import WebhookEndpoint

logger = logging.getLogger(__name__)


@celery_app.task(bind=True, max_retries=5)
def deliver_webhook(self, delivery_id: str):
    db = SessionLocal()
    try:
        delivery = db.query(WebhookDelivery).filter(
            WebhookDelivery.id == delivery_id
        ).first()
        
        if not delivery:
            logger.error(f"Delivery {delivery_id} not found")
            return
        
        endpoint = db.query(WebhookEndpoint).filter(
            WebhookEndpoint.id == delivery.endpoint_id
        ).first()
        
        if not endpoint or not endpoint.is_active:
            logger.error(f"Endpoint {delivery.endpoint_id} not found or inactive")
            delivery.status = DeliveryStatus.FAILED
            delivery.error_message = "Endpoint not found or inactive"
            db.commit()
            return
        
        delivery.attempt_count += 1
        db.commit()
        
        headers = {
            "Content-Type": "application/json",
            "X-Webhook-Signature": delivery.signature,
            "X-Webhook-Event": delivery.event_type,
            "X-Webhook-Delivery-Id": delivery.id,
        }
        
        try:
            with httpx.Client(timeout=endpoint.timeout) as client:
                response = client.post(
                    endpoint.url,
                    content=delivery.payload,
                    headers=headers,
                )
                
                delivery.response_status = response.status_code
                delivery.response_body = response.text[:1000]
                
                if 200 <= response.status_code < 300:
                    delivery.status = DeliveryStatus.DELIVERED
                    delivery.delivered_at = datetime.utcnow()
                    logger.info(f"Successfully delivered webhook {delivery_id}")
                else:
                    raise Exception(f"HTTP {response.status_code}: {response.text[:200]}")
        
        except Exception as e:
            error_msg = str(e)
            logger.error(f"Failed to deliver webhook {delivery_id}: {error_msg}")
            delivery.error_message = error_msg[:1000]
            
            if delivery.attempt_count >= endpoint.max_retries:
                delivery.status = DeliveryStatus.DEAD_LETTER
                logger.error(f"Webhook {delivery_id} moved to dead letter queue")
                send_failure_alert.delay(delivery_id)
            else:
                delivery.status = DeliveryStatus.FAILED
                retry_delay = endpoint.initial_retry_delay * (
                    endpoint.retry_multiplier ** (delivery.attempt_count - 1)
                )
                delivery.next_retry_at = datetime.utcnow() + timedelta(seconds=retry_delay)
                
                self.retry(countdown=retry_delay, exc=e)
        
        db.commit()
    
    finally:
        db.close()


@celery_app.task
def send_failure_alert(delivery_id: str):
    db = SessionLocal()
    try:
        delivery = db.query(WebhookDelivery).filter(
            WebhookDelivery.id == delivery_id
        ).first()
        
        if delivery:
            logger.error(
                f"ALERT: Webhook delivery {delivery_id} failed after "
                f"{delivery.attempt_count} attempts. "
                f"Endpoint: {delivery.endpoint_id}, "
                f"Event: {delivery.event_type}, "
                f"Error: {delivery.error_message}"
            )
    finally:
        db.close()


@celery_app.task
def trigger_webhook_event(event_type: str, event_data: Dict[str, Any]):
    db = SessionLocal()
    try:
        endpoints = db.query(WebhookEndpoint).filter(
            WebhookEndpoint.is_active == True
        ).all()
        
        for endpoint in endpoints:
            if event_type in endpoint.events:
                from app.services.webhook_service import webhook_service
                
                delivery = webhook_service.create_delivery(
                    db=db,
                    endpoint_id=endpoint.id,
                    event_type=event_type,
                    payload=event_data,
                    secret=endpoint.secret
                )
                
                deliver_webhook.delay(delivery.id)
                logger.info(f"Queued webhook delivery {delivery.id} for endpoint {endpoint.id}")
    
    finally:
        db.close()
