from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlmodel import Session, select

from app.api.v1.auth.dependencies import require_admin_permission
from app.db import get_session
from app.models import Product, User

router = APIRouter(prefix="/inventory", tags=["Admin"])


class AdminStockUpdateRequest(BaseModel):
    stock_quantity: int = Field(ge=0)


@router.get("/stock-levels")
def stock_levels(
    limit_products: int = Query(default=250, ge=1, le=1000),
    current_user: User = Depends(require_admin_permission("manage_products")),
    session: Session = Depends(get_session),
):
    """
    Compatibility endpoint for the admin UI.
    Returns a simplified list of product stock levels (variants not implemented in this build).
    """
    _ = current_user
    products = session.exec(
        select(Product).order_by(Product.stock_quantity.asc(), Product.created_at.desc()).limit(limit_products)
    ).all()
    return [
        {
            "kind": "product",
            "product_id": p.id,
            "variant_id": None,
            "label": p.sku,
            "name": p.name,
            "parent_product_name": None,
            "sku": p.sku,
            "in_stock": p.stock_quantity,
        }
        for p in products
        if p.id is not None
    ]


@router.get("/low-stock/alerts")
def low_stock_alerts(
    threshold: int = Query(default=5, ge=0, le=1000),
    limit: int = Query(default=50, ge=1, le=500),
    current_user: User = Depends(require_admin_permission("manage_products")),
    session: Session = Depends(get_session),
):
    """Compatibility endpoint used by the admin dashboard low-stock widget."""
    _ = current_user
    products = session.exec(
        select(Product)
        .where(Product.stock_quantity <= threshold)
        .order_by(Product.stock_quantity.asc(), Product.created_at.desc())
        .limit(limit)
    ).all()
    return [
        {
            "kind": "product",
            "product_id": p.id,
            "variant_id": None,
            "name": p.name,
            "parent_product_name": None,
            "sku": p.sku,
            "in_stock": p.stock_quantity,
            "unit_price": float(p.price),
        }
        for p in products
        if p.id is not None
    ]


@router.get("/products")
def list_inventory(
    low_stock_below: int = Query(default=5, ge=0, le=1000),
    current_user: User = Depends(require_admin_permission("manage_products")),
    session: Session = Depends(get_session),
):
    _ = current_user
    products = session.exec(select(Product).order_by(Product.stock_quantity.asc(), Product.created_at.desc())).all()
    return {
        "items": products,
        "low_stock": [item for item in products if item.stock_quantity < low_stock_below],
        "threshold": low_stock_below,
    }


@router.patch("/products/{product_id}/stock")
def update_product_stock(
    product_id: int,
    payload: AdminStockUpdateRequest,
    current_user: User = Depends(require_admin_permission("manage_products")),
    session: Session = Depends(get_session),
):
    _ = current_user
    product = session.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    product.stock_quantity = payload.stock_quantity
    product.updated_at = datetime.utcnow()
    session.add(product)
    session.commit()
    session.refresh(product)
    return product
