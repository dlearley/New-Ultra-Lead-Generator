import secrets
import hashlib
from datetime import datetime
from typing import List, Optional
from sqlalchemy.orm import Session

from app.models.api_key import APIKey
from app.schemas.api_key import APIKeyCreate, APIKeyWithSecret


class APIKeyService:
    @staticmethod
    def generate_api_key() -> str:
        return f"sk_{secrets.token_urlsafe(32)}"
    
    @staticmethod
    def hash_key(key: str) -> str:
        return hashlib.sha256(key.encode()).hexdigest()
    
    @staticmethod
    def get_key_prefix(key: str) -> str:
        return key[:12]
    
    def create_api_key(
        self,
        db: Session,
        organization_id: str,
        key_data: APIKeyCreate
    ) -> APIKeyWithSecret:
        key = self.generate_api_key()
        key_hash = self.hash_key(key)
        key_prefix = self.get_key_prefix(key)
        
        db_key = APIKey(
            key_hash=key_hash,
            key_prefix=key_prefix,
            name=key_data.name,
            role=key_data.role,
            rate_limit=key_data.rate_limit,
            expires_at=key_data.expires_at,
            organization_id=organization_id,
        )
        
        db.add(db_key)
        db.commit()
        db.refresh(db_key)
        
        return APIKeyWithSecret(
            id=db_key.id,
            key=key,
            key_prefix=db_key.key_prefix,
            name=db_key.name,
            role=db_key.role,
            rate_limit=db_key.rate_limit,
            is_active=db_key.is_active,
            last_used_at=db_key.last_used_at,
            created_at=db_key.created_at,
            expires_at=db_key.expires_at,
            revoked_at=db_key.revoked_at,
            organization_id=db_key.organization_id,
        )
    
    def list_api_keys(
        self,
        db: Session,
        organization_id: str,
        skip: int = 0,
        limit: int = 100
    ) -> List[APIKey]:
        return db.query(APIKey).filter(
            APIKey.organization_id == organization_id
        ).offset(skip).limit(limit).all()
    
    def get_api_key(
        self,
        db: Session,
        key_id: str,
        organization_id: str
    ) -> Optional[APIKey]:
        return db.query(APIKey).filter(
            APIKey.id == key_id,
            APIKey.organization_id == organization_id
        ).first()
    
    def revoke_api_key(
        self,
        db: Session,
        key_id: str,
        organization_id: str
    ) -> Optional[APIKey]:
        db_key = self.get_api_key(db, key_id, organization_id)
        if db_key:
            db_key.is_active = False
            db_key.revoked_at = datetime.utcnow()
            db.commit()
            db.refresh(db_key)
        return db_key
    
    def verify_api_key(
        self,
        db: Session,
        key: str
    ) -> Optional[APIKey]:
        key_hash = self.hash_key(key)
        db_key = db.query(APIKey).filter(
            APIKey.key_hash == key_hash,
            APIKey.is_active == True
        ).first()
        
        if db_key:
            if db_key.expires_at and db_key.expires_at < datetime.utcnow():
                return None
            
            db_key.last_used_at = datetime.utcnow()
            db.commit()
        
        return db_key


api_key_service = APIKeyService()
