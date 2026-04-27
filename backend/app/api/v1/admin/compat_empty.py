from __future__ import annotations

from fastapi import APIRouter, Depends, Query

from app.api.v1.auth.dependencies import require_admin_permission
from app.models import User

router = APIRouter(tags=["Admin"])


@router.get("/coupons/")
def coupons_empty(current_user: User = Depends(require_admin_permission("view_dashboard"))):
    _ = current_user
    return []


@router.post("/coupons/")
def coupons_create_empty(current_user: User = Depends(require_admin_permission("view_dashboard"))):
    _ = current_user
    return {}


@router.put("/coupons/{coupon_id}")
def coupons_update_empty(
    coupon_id: int, current_user: User = Depends(require_admin_permission("view_dashboard"))
):
    _ = (coupon_id, current_user)
    return {}


@router.delete("/coupons/{coupon_id}")
def coupons_delete_empty(
    coupon_id: int, current_user: User = Depends(require_admin_permission("view_dashboard"))
):
    _ = (coupon_id, current_user)
    return {"message": "deleted"}


@router.get("/reviews/")
def reviews_empty(current_user: User = Depends(require_admin_permission("view_dashboard"))):
    _ = current_user
    return []


@router.delete("/reviews/{review_id}")
def review_delete_empty(
    review_id: int, current_user: User = Depends(require_admin_permission("view_dashboard"))
):
    _ = (review_id, current_user)
    return {"message": "deleted"}


@router.get("/returns/")
def returns_empty(current_user: User = Depends(require_admin_permission("view_dashboard"))):
    _ = current_user
    return []


@router.get("/returns/{return_id}")
def returns_detail_empty(
    return_id: int, current_user: User = Depends(require_admin_permission("view_dashboard"))
):
    _ = (return_id, current_user)
    return {
        "id": return_id,
        "order_id": 0,
        "user_id": 0,
        "reason": "",
        "preferred_outcome": "refund",
        "status": "pending",
        "created_at": "1970-01-01T00:00:00Z",
        "updated_at": "1970-01-01T00:00:00Z",
        "items": [],
    }


@router.patch("/returns/{return_id}/status")
def returns_status_empty(
    return_id: int, current_user: User = Depends(require_admin_permission("view_dashboard"))
):
    _ = (return_id, current_user)
    return {"message": "ok"}


@router.get("/search-analytics/summary")
def search_summary_empty(
    days: int = Query(30, ge=1, le=365),
    current_user: User = Depends(require_admin_permission("view_dashboard")),
):
    _ = current_user
    return {
        "total_searches": 0,
        "unique_queries": 0,
        "zero_result_searches": 0,
        "period_days": days,
    }


@router.get("/search-analytics/top")
def search_top_empty(
    current_user: User = Depends(require_admin_permission("view_dashboard")),
):
    _ = current_user
    return []


@router.get("/search-analytics/zero-results")
def search_zero_empty(
    current_user: User = Depends(require_admin_permission("view_dashboard")),
):
    _ = current_user
    return []


@router.get("/variants/")
def variants_empty(current_user: User = Depends(require_admin_permission("view_dashboard"))):
    _ = current_user
    return []


@router.post("/variants/")
def variants_create_empty(current_user: User = Depends(require_admin_permission("view_dashboard"))):
    _ = current_user
    return {}


@router.patch("/variants/{variant_id}")
def variants_update_empty(
    variant_id: int, current_user: User = Depends(require_admin_permission("view_dashboard"))
):
    _ = (variant_id, current_user)
    return {}


@router.post("/variants/{variant_id}/image")
def variants_image_empty(
    variant_id: int, current_user: User = Depends(require_admin_permission("view_dashboard"))
):
    _ = (variant_id, current_user)
    return {}


@router.delete("/variants/{variant_id}")
def variants_delete_empty(
    variant_id: int, current_user: User = Depends(require_admin_permission("view_dashboard"))
):
    _ = (variant_id, current_user)
    return {"message": "deleted"}


@router.get("/payments/transactions")
def payments_transactions_empty(
    current_user: User = Depends(require_admin_permission("view_dashboard")),
):
    _ = current_user
    return []


@router.get("/inventory/logs")
def inventory_logs_empty(
    current_user: User = Depends(require_admin_permission("view_dashboard")),
):
    _ = current_user
    return []


@router.post("/inventory/adjustments")
def inventory_adjustments_empty(
    current_user: User = Depends(require_admin_permission("view_dashboard")),
):
    _ = current_user
    return {}


@router.post("/products/bulk-import")
def products_bulk_import_empty(
    current_user: User = Depends(require_admin_permission("manage_products")),
):
    _ = current_user
    return {
        "mode": "dry_run",
        "total_rows": 0,
        "created": 0,
        "updated": 0,
        "skipped": 0,
        "errors": 0,
        "results": [],
    }


@router.get("/products/low-stock/list")
def products_low_stock_list_empty(
    current_user: User = Depends(require_admin_permission("manage_products")),
):
    _ = current_user
    return []

