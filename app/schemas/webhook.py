from pydantic import BaseModel, HttpUrl, Field
from datetime import datetime
from typing import List, Optional, Dict, Any
from enum import Enum
from app.models.webhook_delivery import DeliveryStatus


class EventType(str, Enum):
    NEW_LEAD = "new_lead"
    LEAD_UPDATE = "lead_update"


class WebhookEndpointBase(BaseModel):
    url: HttpUrl
    description: Optional[str] = None
    events: List[EventType] = Field(default=[EventType.NEW_LEAD, EventType.LEAD_UPDATE])
    is_active: bool = True
    max_retries: int = Field(default=5, ge=0, le=10)
    initial_retry_delay: int = Field(default=1, ge=1, le=60)
    retry_multiplier: int = Field(default=2, ge=1, le=5)
    timeout: int = Field(default=30, ge=5, le=120)


class WebhookEndpointCreate(WebhookEndpointBase):
    pass


class WebhookEndpointUpdate(BaseModel):
    url: Optional[HttpUrl] = None
    description: Optional[str] = None
    events: Optional[List[EventType]] = None
    is_active: Optional[bool] = None
    max_retries: Optional[int] = Field(default=None, ge=0, le=10)
    initial_retry_delay: Optional[int] = Field(default=None, ge=1, le=60)
    retry_multiplier: Optional[int] = Field(default=None, ge=1, le=5)
    timeout: Optional[int] = Field(default=None, ge=5, le=120)


class WebhookEndpointResponse(BaseModel):
    id: str
    url: str
    description: Optional[str]
    events: List[str]
    is_active: bool
    max_retries: int
    initial_retry_delay: int
    retry_multiplier: int
    timeout: int
    created_at: datetime
    updated_at: datetime
    organization_id: str
    
    class Config:
        from_attributes = True


class WebhookEndpointWithSecret(WebhookEndpointResponse):
    secret: str


class WebhookDeliveryResponse(BaseModel):
    id: str
    event_type: str
    status: DeliveryStatus
    attempt_count: int
    max_attempts: int
    response_status: Optional[int]
    error_message: Optional[str]
    next_retry_at: Optional[datetime]
    delivered_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    endpoint_id: str
    
    class Config:
        from_attributes = True


class LeadData(BaseModel):
    id: str
    name: str
    email: str
    phone: Optional[str] = None
    source: Optional[str] = None


class LeadUpdateData(LeadData):
    changes: Dict[str, Any]


class WebhookEvent(BaseModel):
    event: EventType
    timestamp: datetime
    data: Dict[str, Any]


class NewLeadEvent(BaseModel):
    event: EventType = EventType.NEW_LEAD
    timestamp: datetime
    data: LeadData


class LeadUpdateEvent(BaseModel):
    event: EventType = EventType.LEAD_UPDATE
    timestamp: datetime
    data: LeadUpdateData
