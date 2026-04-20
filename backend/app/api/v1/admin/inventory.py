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
