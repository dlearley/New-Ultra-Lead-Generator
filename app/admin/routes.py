from fastapi import APIRouter, Request, Depends
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session

from app.database import get_db
from app.api.dependencies import get_organization_id

router = APIRouter(prefix="/admin", tags=["Admin UI"])
templates = Jinja2Templates(directory="app/admin/templates")


@router.get("/", response_class=HTMLResponse)
async def admin_dashboard(request: Request):
    """
    Admin dashboard home page.
    """
    return templates.TemplateResponse("dashboard.html", {"request": request})


@router.get("/api-keys", response_class=HTMLResponse)
async def admin_api_keys(request: Request):
    """
    API keys management page.
    """
    return templates.TemplateResponse("api_keys.html", {"request": request})


@router.get("/webhooks", response_class=HTMLResponse)
async def admin_webhooks(request: Request):
    """
    Webhooks management page.
    """
    return templates.TemplateResponse("webhooks.html", {"request": request})


@router.get("/deliveries", response_class=HTMLResponse)
async def admin_deliveries(request: Request):
    """
    Webhook delivery history page.
    """
    return templates.TemplateResponse("deliveries.html", {"request": request})
