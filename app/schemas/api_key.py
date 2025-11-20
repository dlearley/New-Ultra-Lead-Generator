from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional
from app.models.api_key import APIKeyRole


class APIKeyBase(BaseModel):
    name: str
    role: APIKeyRole = APIKeyRole.READ_WRITE
    rate_limit: int = Field(default=1000, gt=0, description="Requests per hour")


class APIKeyCreate(APIKeyBase):
    expires_at: Optional[datetime] = None


class APIKeyResponse(BaseModel):
    id: str
    key_prefix: str
    name: str
    role: APIKeyRole
    rate_limit: int
    is_active: bool
    last_used_at: Optional[datetime]
    created_at: datetime
    expires_at: Optional[datetime]
    revoked_at: Optional[datetime]
    organization_id: str
    
    class Config:
        from_attributes = True


class APIKeyWithSecret(APIKeyResponse):
    key: str
