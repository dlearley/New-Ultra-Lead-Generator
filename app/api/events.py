from fastapi import APIRouter, Depends, status
from datetime import datetime

from app.schemas.webhook import NewLeadEvent, LeadUpdateEvent, LeadData, LeadUpdateData
from app.api.dependencies import get_organization_id
from app.worker.tasks import trigger_webhook_event

router = APIRouter(prefix="/api/v1/events", tags=["Events"])


@router.post("/leads", status_code=status.HTTP_202_ACCEPTED)
def trigger_new_lead_event(
    lead: LeadData,
    organization_id: str = Depends(get_organization_id)
):
    """
    Trigger a new lead event.
    
    This will send webhooks to all configured endpoints subscribed to the 'new_lead' event.
    """
    event_data = {
        "event": "new_lead",
        "timestamp": datetime.utcnow().isoformat(),
        "data": lead.model_dump()
    }
    
    trigger_webhook_event.delay("new_lead", event_data)
    
    return {"message": "Event queued for delivery", "event": "new_lead"}


@router.post("/leads/updates", status_code=status.HTTP_202_ACCEPTED)
def trigger_lead_update_event(
    lead: LeadUpdateData,
    organization_id: str = Depends(get_organization_id)
):
    """
    Trigger a lead update event.
    
    This will send webhooks to all configured endpoints subscribed to the 'lead_update' event.
    """
    event_data = {
        "event": "lead_update",
        "timestamp": datetime.utcnow().isoformat(),
        "data": lead.model_dump()
    }
    
    trigger_webhook_event.delay("lead_update", event_data)
    
    return {"message": "Event queued for delivery", "event": "lead_update"}
