from sqlalchemy import Column, String, DateTime, Integer, Boolean, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

from app.database import Base


class WebhookEndpoint(Base):
    __tablename__ = "webhook_endpoints"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    url = Column(String, nullable=False)
    secret = Column(String, nullable=False)
    description = Column(String, nullable=True)
    events = Column(JSON, nullable=False)
    is_active = Column(Boolean, default=True)
    
    max_retries = Column(Integer, default=5)
    initial_retry_delay = Column(Integer, default=1)
    retry_multiplier = Column(Integer, default=2)
    timeout = Column(Integer, default=30)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    organization_id = Column(String, ForeignKey("organizations.id"), nullable=False)
    organization = relationship("Organization", back_populates="webhook_endpoints")
    deliveries = relationship("WebhookDelivery", back_populates="endpoint", cascade="all, delete-orphan")
