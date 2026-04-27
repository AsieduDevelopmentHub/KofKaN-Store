from __future__ import annotations

from fastapi import APIRouter, Depends

from app.api.v1.auth.dependencies import require_admin_permission
from app.models import User

router = APIRouter(prefix="/users", tags=["Admin"])


def permission_catalog_list() -> list[dict[str, str]]:
    # Keep aligned with the frontend expectations.
    return [
        {"key": "view_dashboard", "label": "View dashboard"},
        {"key": "manage_products", "label": "Manage products"},
        {"key": "manage_orders", "label": "Manage orders"},
        {"key": "manage_inventory", "label": "Manage inventory"},
        {"key": "manage_users", "label": "Manage users"},
        {"key": "manage_payments", "label": "Manage payments"},
        {"key": "manage_settings", "label": "Manage settings"},
    ]


@router.get("/permission-catalog")
def permission_catalog(
    current_user: User = Depends(require_admin_permission("view_dashboard")),
):
    _ = current_user
    return {"permissions": permission_catalog_list()}

