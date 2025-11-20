from sqlalchemy import Column, String, DateTime, Integer, Boolean, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
import enum

from app.database import Base


class APIKeyRole(str, enum.Enum):
    ADMIN = "admin"
    READ_WRITE = "read_write"
    READ_ONLY = "read_only"


class APIKey(Base):
    __tablename__ = "api_keys"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    key_hash = Column(String, unique=True, nullable=False, index=True)
    key_prefix = Column(String, nullable=False)
    name = Column(String, nullable=False)
    role = Column(SQLEnum(APIKeyRole), default=APIKeyRole.READ_WRITE)
    rate_limit = Column(Integer, nullable=False)
    is_active = Column(Boolean, default=True)
    last_used_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=True)
    revoked_at = Column(DateTime, nullable=True)
    
    organization_id = Column(String, ForeignKey("organizations.id"), nullable=False)
    organization = relationship("Organization", back_populates="api_keys")
