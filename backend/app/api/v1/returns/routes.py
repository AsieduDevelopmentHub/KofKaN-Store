from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.api.v1.auth.dependencies import get_current_active_user
from app.db import get_session
from app.models import Order, OrderReturn, User

router = APIRouter(prefix="/returns", tags=["Returns"])


@router.get("")
def list_my_returns(current_user: User = Depends(get_current_active_user), session: Session = Depends(get_session)):
    return session.exec(select(OrderReturn).where(OrderReturn.user_id == current_user.id).order_by(OrderReturn.created_at.desc())).all()


@router.post("")
def create_return(payload: dict, current_user: User = Depends(get_current_active_user), session: Session = Depends(get_session)):
    order_id = int(payload.get("order_id", 0))
    order = session.get(Order, order_id)
    if not order or order.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Order not found")
    reason = str(payload.get("reason", "")).strip()
    if not reason:
        raise HTTPException(status_code=400, detail="reason is required")
    item = OrderReturn(order_id=order_id, user_id=current_user.id or 0, reason=reason, status="pending")
    session.add(item)
    session.commit()
    session.refresh(item)
    return item
