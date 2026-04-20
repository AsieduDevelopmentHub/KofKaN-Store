from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.api.v1.auth.dependencies import get_current_active_user
from app.db import get_session
from app.models import CartItem, Order, OrderItem, OrderRead, Product, User

router = APIRouter(prefix="/orders", tags=["Orders"])


@router.get("", response_model=list[OrderRead])
def list_orders(current_user: User = Depends(get_current_active_user), session: Session = Depends(get_session)):
    orders = session.exec(select(Order).where(Order.user_id == current_user.id).order_by(Order.created_at.desc())).all()
    return [OrderRead(id=o.id or 0, status=o.status, total_amount=o.total_amount, created_at=o.created_at) for o in orders]


@router.post("/checkout", response_model=OrderRead)
def checkout(current_user: User = Depends(get_current_active_user), session: Session = Depends(get_session)):
    cart_items = session.exec(select(CartItem).where(CartItem.user_id == current_user.id)).all()
    if not cart_items:
        raise HTTPException(status_code=400, detail="Cart is empty")

    total = 0.0
    order = Order(user_id=current_user.id or 0, status="processing", total_amount=0)
    session.add(order)
    session.flush()

    for cart_item in cart_items:
        product = session.get(Product, cart_item.product_id)
        if not product:
            continue
        total += product.price * cart_item.quantity
        session.add(
            OrderItem(
                order_id=order.id or 0,
                product_id=product.id or 0,
                quantity=cart_item.quantity,
                unit_price=product.price,
            )
        )
        session.delete(cart_item)

    order.total_amount = total
    order.status = "confirmed"
    session.add(order)
    session.commit()
    session.refresh(order)
    return OrderRead(id=order.id or 0, status=order.status, total_amount=order.total_amount, created_at=order.created_at)
