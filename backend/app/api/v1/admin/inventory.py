"""
Admin inventory monitoring and stock audit routes.
"""
from typing import List, Optional

from fastapi import APIRouter, Depends, Query, status
from pydantic import BaseModel, Field
from sqlmodel import Session, select

from app.api.v1.admin.schemas import InventoryAdjustmentRead, InventoryStockLevelRow
from app.api.v1.admin.services import create_inventory_adjustment, list_inventory_adjustments
from app.api.v1.auth.dependencies import require_admin_permission
from app.db import get_session
from app.models import User, Product, ProductVariant

router = APIRouter()


class InventoryAdjustmentCreate(BaseModel):
    product_id: int
    variant_id: Optional[int] = None
    delta: int = Field(..., ne=0)
    reason: Optional[str] = None


@router.get("/stock-levels", response_model=List[InventoryStockLevelRow])
async def inventory_stock_levels_admin(
    limit_products: int = Query(200, ge=1, le=500),
    session: Session = Depends(get_session),
    current_user: User = Depends(require_admin_permission("manage_inventory")),
):
    """Catalog stock: each parent product plus every variant as its own row."""
    products = list(
        session.exec(
            select(Product).order_by(Product.name.asc()).limit(limit_products)
        ).all()
    )
    rows: list[InventoryStockLevelRow] = []
    pmap: dict[int, Product] = {p.id: p for p in products if p.id is not None}
    for p in products:
        if p.id is None:
            continue
        rows.append(
            InventoryStockLevelRow(
                kind="product",
                product_id=p.id,
                variant_id=None,
                label=p.name,
                name=p.name,
                parent_product_name=None,
                sku=p.sku,
                in_stock=int(p.in_stock),
            )
        )
    if pmap:
        variants = session.exec(
            select(ProductVariant)
            .where(ProductVariant.product_id.in_(tuple(pmap.keys())))
            .order_by(
                ProductVariant.product_id.asc(),
                ProductVariant.sort_order.asc(),
                ProductVariant.name.asc(),
            )
        ).all()
        for v in variants:
            p = pmap.get(v.product_id)
            if not p or p.id is None or v.id is None:
                continue
            label = f"{p.name} — {v.name}"
            rows.append(
                InventoryStockLevelRow(
                    kind="variant",
                    product_id=p.id,
                    variant_id=v.id,
                    label=label,
                    name=v.name,
                    parent_product_name=p.name,
                    sku=v.sku or p.sku,
                    in_stock=int(v.in_stock),
                )
            )
    rows.sort(key=lambda r: (r.in_stock, r.label.lower()))
    return rows


@router.get("/logs", response_model=List[InventoryAdjustmentRead])
async def inventory_logs_admin(
    product_id: Optional[int] = None,
    variant_id: Optional[int] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    session: Session = Depends(get_session),
    current_user: User = Depends(require_admin_permission("manage_inventory")),
):
    return await list_inventory_adjustments(
        session,
        product_id=product_id,
        variant_id=variant_id,
        skip=skip,
        limit=limit,
    )


@router.post("/adjustments", response_model=InventoryAdjustmentRead, status_code=status.HTTP_201_CREATED)
async def inventory_adjust_admin(
    payload: InventoryAdjustmentCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_admin_permission("manage_inventory")),
):
    return await create_inventory_adjustment(
        session,
        product_id=payload.product_id,
        variant_id=payload.variant_id,
        delta=payload.delta,
        reason=payload.reason,
        admin_id=current_user.id,
    )
