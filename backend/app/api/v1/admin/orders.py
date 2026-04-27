from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlmodel import Session, select

from app.api.v1.auth.dependencies import require_admin_permission
from app.db import get_session
from app.models import Order, User

router = APIRouter(prefix="/orders", tags=["Admin"])


class AdminOrderStatusUpdateRequest(BaseModel):
    status: str = Field(min_length=3, max_length=32)


@router.get("")
def list_orders(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=500),
    current_user: User = Depends(require_admin_permission("manage_orders")),
    session: Session = Depends(get_session),
):
    _ = current_user
    statement = select(Order).order_by(Order.created_at.desc()).offset(skip).limit(limit)
    orders = session.exec(statement).all()
    # Shape compatible with frontend `AdminOrderListItem` (fill missing fields).
    return [
        {
            "id": o.id,
            "user_id": o.user_id,
            "total_price": float(o.total_amount),
            "status": o.status,
            "payment_status": "unknown",
            "paystack_reference": None,
            "payment_method": None,
            "created_at": o.created_at.isoformat(),
            "updated_at": o.created_at.isoformat(),
        }
        for o in orders
        if o.id is not None
    ]


@router.patch("/{order_id}/status")
def update_order_status(
    order_id: int,
    payload: AdminOrderStatusUpdateRequest,
    current_user: User = Depends(require_admin_permission("manage_orders")),
    session: Session = Depends(get_session),
):
    _ = current_user
    order = session.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    order.status = payload.status.strip().lower()
    session.add(order)
    session.commit()
    session.refresh(order)
    return order
