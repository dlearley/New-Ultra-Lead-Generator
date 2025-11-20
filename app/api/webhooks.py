from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.schemas.webhook import (
    WebhookEndpointCreate,
    WebhookEndpointUpdate,
    WebhookEndpointResponse,
    WebhookEndpointWithSecret,
    WebhookDeliveryResponse,
)
from app.models.webhook_delivery import DeliveryStatus
from app.services.webhook_service import webhook_service
from app.api.dependencies import get_organization_id

router = APIRouter(prefix="/api/v1/webhooks", tags=["Webhooks"])


@router.post("/", response_model=WebhookEndpointWithSecret, status_code=status.HTTP_201_CREATED)
def create_webhook_endpoint(
    endpoint_data: WebhookEndpointCreate,
    organization_id: str = Depends(get_organization_id),
    db: Session = Depends(get_db)
):
    """
    Create a new webhook endpoint.
    
    The webhook secret is returned only once. Store it securely for signature verification.
    """
    return webhook_service.create_webhook_endpoint(db, organization_id, endpoint_data)


@router.get("/", response_model=List[WebhookEndpointResponse])
def list_webhook_endpoints(
    skip: int = 0,
    limit: int = 100,
    organization_id: str = Depends(get_organization_id),
    db: Session = Depends(get_db)
):
    """
    List all webhook endpoints for the organization.
    """
    return webhook_service.list_webhook_endpoints(db, organization_id, skip, limit)


@router.get("/{webhook_id}", response_model=WebhookEndpointResponse)
def get_webhook_endpoint(
    webhook_id: str,
    organization_id: str = Depends(get_organization_id),
    db: Session = Depends(get_db)
):
    """
    Get details of a specific webhook endpoint.
    """
    endpoint = webhook_service.get_webhook_endpoint(db, webhook_id, organization_id)
    if not endpoint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Webhook endpoint not found"
        )
    return endpoint


@router.put("/{webhook_id}", response_model=WebhookEndpointResponse)
def update_webhook_endpoint(
    webhook_id: str,
    endpoint_data: WebhookEndpointUpdate,
    organization_id: str = Depends(get_organization_id),
    db: Session = Depends(get_db)
):
    """
    Update a webhook endpoint.
    """
    endpoint = webhook_service.update_webhook_endpoint(
        db, webhook_id, organization_id, endpoint_data
    )
    if not endpoint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Webhook endpoint not found"
        )
    return endpoint


@router.delete("/{webhook_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_webhook_endpoint(
    webhook_id: str,
    organization_id: str = Depends(get_organization_id),
    db: Session = Depends(get_db)
):
    """
    Delete a webhook endpoint.
    """
    success = webhook_service.delete_webhook_endpoint(db, webhook_id, organization_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Webhook endpoint not found"
        )


@router.get("/deliveries/", response_model=List[WebhookDeliveryResponse])
def list_webhook_deliveries(
    endpoint_id: Optional[str] = Query(None, description="Filter by endpoint ID"),
    status: Optional[DeliveryStatus] = Query(None, description="Filter by delivery status"),
    skip: int = 0,
    limit: int = 100,
    organization_id: str = Depends(get_organization_id),
    db: Session = Depends(get_db)
):
    """
    List webhook delivery history for the organization.
    
    Can be filtered by endpoint ID and delivery status.
    """
    return webhook_service.list_deliveries(
        db, organization_id, endpoint_id, status, skip, limit
    )
