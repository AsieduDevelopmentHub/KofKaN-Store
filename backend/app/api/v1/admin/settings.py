from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.api.v1.auth.dependencies import require_admin_permission
from app.core.config import settings
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
