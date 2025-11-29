from fastapi import Header, HTTPException, Depends, status
from sqlalchemy.orm import Session
from typing import Optional

from app.database import get_db
from app.models.api_key import APIKey
from app.services.api_key_service import api_key_service
from app.services.rate_limiter import rate_limiter


async def get_current_api_key(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
) -> APIKey:
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing API key",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization header format",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    key = authorization.replace("Bearer ", "")
    
    api_key = api_key_service.verify_api_key(db, key)
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired API key",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    allowed, remaining, limit = rate_limiter.check_rate_limit(
        api_key.id,
        api_key.rate_limit
    )
    
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded",
            headers={
                "X-RateLimit-Limit": str(limit),
                "X-RateLimit-Remaining": str(remaining),
            },
        )
    
    return api_key


async def get_organization_id(
    api_key: APIKey = Depends(get_current_api_key)
) -> str:
    return api_key.organization_id
