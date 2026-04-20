from fastapi import APIRouter, Depends, HTTPException
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
    current_user: User = Depends(require_admin_permission("manage_orders")),
    session: Session = Depends(get_session),
):
    _ = current_user
    return session.exec(select(Order).order_by(Order.created_at.desc())).all()


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
