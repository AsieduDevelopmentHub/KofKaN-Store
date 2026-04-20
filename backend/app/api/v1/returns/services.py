from fastapi import HTTPException
from sqlmodel import Session, select

from app.models import Order, OrderReturn, User


def list_user_returns(session: Session, user: User) -> list[OrderReturn]:
    return session.exec(select(OrderReturn).where(OrderReturn.user_id == user.id).order_by(OrderReturn.created_at.desc())).all()


def create_order_return(session: Session, user: User, order_id: int, reason: str) -> OrderReturn:
    order = session.get(Order, order_id)
    if not order or order.user_id != user.id:
        raise HTTPException(status_code=404, detail="Order not found")

    item = OrderReturn(order_id=order_id, user_id=user.id or 0, reason=reason.strip(), status="pending")
    session.add(item)
    session.commit()
    session.refresh(item)
    return item
