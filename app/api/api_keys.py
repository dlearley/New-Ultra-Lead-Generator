from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.schemas.api_key import APIKeyCreate, APIKeyResponse, APIKeyWithSecret
from app.services.api_key_service import api_key_service
from app.api.dependencies import get_organization_id

router = APIRouter(prefix="/api/v1/keys", tags=["API Keys"])


@router.post("/", response_model=APIKeyWithSecret, status_code=status.HTTP_201_CREATED)
def create_api_key(
    key_data: APIKeyCreate,
    organization_id: str = Depends(get_organization_id),
    db: Session = Depends(get_db)
):
    """
    Create a new API key for the organization.
    
    The API key is returned only once. Store it securely.
    """
    return api_key_service.create_api_key(db, organization_id, key_data)


@router.get("/", response_model=List[APIKeyResponse])
def list_api_keys(
    skip: int = 0,
    limit: int = 100,
    organization_id: str = Depends(get_organization_id),
    db: Session = Depends(get_db)
):
    """
    List all API keys for the organization.
    """
    return api_key_service.list_api_keys(db, organization_id, skip, limit)


@router.get("/{key_id}", response_model=APIKeyResponse)
def get_api_key(
    key_id: str,
    organization_id: str = Depends(get_organization_id),
    db: Session = Depends(get_db)
):
    """
    Get details of a specific API key.
    """
    api_key = api_key_service.get_api_key(db, key_id, organization_id)
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="API key not found"
        )
    return api_key


@router.delete("/{key_id}", response_model=APIKeyResponse)
def revoke_api_key(
    key_id: str,
    organization_id: str = Depends(get_organization_id),
    db: Session = Depends(get_db)
):
    """
    Revoke an API key. This action cannot be undone.
    """
    api_key = api_key_service.revoke_api_key(db, key_id, organization_id)
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="API key not found"
        )
    return api_key
