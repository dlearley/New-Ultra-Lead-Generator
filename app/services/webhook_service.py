import secrets
import hmac
import hashlib
import json
from datetime import datetime
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session

from app.models.webhook_endpoint import WebhookEndpoint
from app.models.webhook_delivery import WebhookDelivery, DeliveryStatus
from app.schemas.webhook import (
    WebhookEndpointCreate,
    WebhookEndpointUpdate,
    WebhookEndpointWithSecret,
)


class WebhookService:
    @staticmethod
    def generate_secret() -> str:
        return secrets.token_urlsafe(32)
    
    @staticmethod
    def generate_signature(payload: str, secret: str) -> str:
        return hmac.new(
            secret.encode(),
            payload.encode(),
            hashlib.sha256
        ).hexdigest()
    
    @staticmethod
    def verify_signature(payload: str, signature: str, secret: str) -> bool:
        expected = WebhookService.generate_signature(payload, secret)
        return hmac.compare_digest(signature, expected)
    
    def create_webhook_endpoint(
        self,
        db: Session,
        organization_id: str,
        endpoint_data: WebhookEndpointCreate
    ) -> WebhookEndpointWithSecret:
        secret = self.generate_secret()
        
        db_endpoint = WebhookEndpoint(
            url=str(endpoint_data.url),
            secret=secret,
            description=endpoint_data.description,
            events=[e.value for e in endpoint_data.events],
            is_active=endpoint_data.is_active,
            max_retries=endpoint_data.max_retries,
            initial_retry_delay=endpoint_data.initial_retry_delay,
            retry_multiplier=endpoint_data.retry_multiplier,
            timeout=endpoint_data.timeout,
            organization_id=organization_id,
        )
        
        db.add(db_endpoint)
        db.commit()
        db.refresh(db_endpoint)
        
        return WebhookEndpointWithSecret(
            id=db_endpoint.id,
            url=db_endpoint.url,
            secret=db_endpoint.secret,
            description=db_endpoint.description,
            events=db_endpoint.events,
            is_active=db_endpoint.is_active,
            max_retries=db_endpoint.max_retries,
            initial_retry_delay=db_endpoint.initial_retry_delay,
            retry_multiplier=db_endpoint.retry_multiplier,
            timeout=db_endpoint.timeout,
            created_at=db_endpoint.created_at,
            updated_at=db_endpoint.updated_at,
            organization_id=db_endpoint.organization_id,
        )
    
    def list_webhook_endpoints(
        self,
        db: Session,
        organization_id: str,
        skip: int = 0,
        limit: int = 100
    ) -> List[WebhookEndpoint]:
        return db.query(WebhookEndpoint).filter(
            WebhookEndpoint.organization_id == organization_id
        ).offset(skip).limit(limit).all()
    
    def get_webhook_endpoint(
        self,
        db: Session,
        endpoint_id: str,
        organization_id: str
    ) -> Optional[WebhookEndpoint]:
        return db.query(WebhookEndpoint).filter(
            WebhookEndpoint.id == endpoint_id,
            WebhookEndpoint.organization_id == organization_id
        ).first()
    
    def update_webhook_endpoint(
        self,
        db: Session,
        endpoint_id: str,
        organization_id: str,
        endpoint_data: WebhookEndpointUpdate
    ) -> Optional[WebhookEndpoint]:
        db_endpoint = self.get_webhook_endpoint(db, endpoint_id, organization_id)
        if not db_endpoint:
            return None
        
        update_data = endpoint_data.model_dump(exclude_unset=True)
        if "url" in update_data:
            update_data["url"] = str(update_data["url"])
        if "events" in update_data:
            update_data["events"] = [e.value for e in update_data["events"]]
        
        for key, value in update_data.items():
            setattr(db_endpoint, key, value)
        
        db.commit()
        db.refresh(db_endpoint)
        return db_endpoint
    
    def delete_webhook_endpoint(
        self,
        db: Session,
        endpoint_id: str,
        organization_id: str
    ) -> bool:
        db_endpoint = self.get_webhook_endpoint(db, endpoint_id, organization_id)
        if db_endpoint:
            db.delete(db_endpoint)
            db.commit()
            return True
        return False
    
    def create_delivery(
        self,
        db: Session,
        endpoint_id: str,
        event_type: str,
        payload: Dict[str, Any],
        secret: str
    ) -> WebhookDelivery:
        payload_str = json.dumps(payload)
        signature = self.generate_signature(payload_str, secret)
        
        delivery = WebhookDelivery(
            endpoint_id=endpoint_id,
            event_type=event_type,
            payload=payload_str,
            signature=signature,
            status=DeliveryStatus.PENDING,
        )
        
        db.add(delivery)
        db.commit()
        db.refresh(delivery)
        return delivery
    
    def list_deliveries(
        self,
        db: Session,
        organization_id: str,
        endpoint_id: Optional[str] = None,
        status: Optional[DeliveryStatus] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[WebhookDelivery]:
        query = db.query(WebhookDelivery).join(WebhookEndpoint).filter(
            WebhookEndpoint.organization_id == organization_id
        )
        
        if endpoint_id:
            query = query.filter(WebhookDelivery.endpoint_id == endpoint_id)
        if status:
            query = query.filter(WebhookDelivery.status == status)
        
        return query.order_by(WebhookDelivery.created_at.desc()).offset(skip).limit(limit).all()


webhook_service = WebhookService()
