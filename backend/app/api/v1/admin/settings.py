from datetime import datetime

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlmodel import Session, select

from app.api.v1.auth.dependencies import require_admin_permission
from app.core.config import settings
from app.db import get_session
from app.models import User

router = APIRouter(prefix="/settings", tags=["Admin"])


class AdminSettingsSummary(BaseModel):
    app_name: str
    app_version: str
    https_enabled: bool
    debug: bool
    disable_openapi: bool
    cors_allow_credentials: bool
    has_google_client_id: bool
    has_paystack_webhook_secret: bool


@router.get("/security", response_model=AdminSettingsSummary)
def get_security_settings(current_user: User = Depends(require_admin_permission("view_dashboard"))):
    _ = current_user
    return AdminSettingsSummary(
        app_name=settings.app_name,
        app_version=settings.app_version,
        https_enabled=settings.https_enabled,
        debug=settings.debug,
        disable_openapi=settings.disable_openapi,
        cors_allow_credentials=settings.cors_allow_credentials,
        has_google_client_id=bool(settings.google_client_id.strip()),
        has_paystack_webhook_secret=bool(settings.paystack_webhook_secret.strip()),
    )


class SettingUpsert(BaseModel):
    key: str = Field(min_length=2, max_length=120)
    value: str = Field(min_length=0, max_length=4000)


@router.get("/")
def list_settings(
    current_user: User = Depends(require_admin_permission("view_dashboard")),
    session: Session = Depends(get_session),
):
    _ = current_user
    # This build does not yet persist settings in DB. Return an empty list for UI compatibility.
    return []


@router.put("/")
def upsert_setting(
    payload: SettingUpsert,
    current_user: User = Depends(require_admin_permission("view_dashboard")),
    session: Session = Depends(get_session),
):
    # This build does not yet persist settings in DB. Echo back the row so the UI works.
    return {
        "key": payload.key,
        "value": payload.value,
        "updated_by": current_user.id,
        "updated_at": datetime.utcnow().isoformat(),
    }
