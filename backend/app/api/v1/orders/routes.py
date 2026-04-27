from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.api.v1.auth.dependencies import get_current_active_user
from app.db import get_session
from app.models import CartItem, Order, OrderItem, OrderRead, Product, User

router = APIRouter(prefix="/orders", tags=["Orders"])

_DEFAULT_SHIPPING_OPTIONS: dict[str, Any] = {
    "regions": [
        {
            "slug": "greater-accra",
            "label": "Greater Accra",
            "base_fee": 25.0,
            "cities": [
                {"name": "Accra", "fee": 25.0},
                {"name": "Tema", "fee": 28.0},
                {"name": "Madina", "fee": 26.0},
            ],
        },
        {
            "slug": "ashanti",
            "label": "Ashanti",
            "base_fee": 45.0,
            "cities": [{"name": "Kumasi", "fee": 45.0}],
        },
        {
            "slug": "central",
            "label": "Central",
            "base_fee": 42.0,
            "cities": [{"name": "Cape Coast", "fee": 42.0}],
        },
        {
            "slug": "eastern",
            "label": "Eastern",
            "base_fee": 40.0,
            "cities": [{"name": "Koforidua", "fee": 40.0}],
        },
        {
            "slug": "western",
            "label": "Western",
            "base_fee": 50.0,
            "cities": [{"name": "Takoradi", "fee": 50.0}],
        },
        {
            "slug": "volta",
            "label": "Volta",
            "base_fee": 55.0,
            "cities": [{"name": "Ho", "fee": 55.0}],
        },
        {
            "slug": "northern",
            "label": "Northern",
            "base_fee": 65.0,
            "cities": [{"name": "Tamale", "fee": 65.0}],
        },
    ],
    "couriers": [
        {"name": "Standard delivery", "fee_delta": 0.0},
        {"name": "Express (same/next day)", "fee_delta": 15.0},
        {"name": "Doorstep (fragile handling)", "fee_delta": 10.0},
    ],
}


@router.get("/shipping-options", response_model=dict[str, Any])
def get_shipping_options(session: Session = Depends(get_session)):
    """
    Public endpoint used by checkout to populate shipping method/region/courier UI.
    """
    # Later: make this configurable from DB/business settings.
    return _DEFAULT_SHIPPING_OPTIONS


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
