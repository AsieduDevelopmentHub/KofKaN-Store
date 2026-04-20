from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.api.v1.auth.dependencies import get_current_active_user
from app.db import get_session
from app.models import CartItem, CartItemCreate, CartItemUpdate, CartLineRead, Product, User

router = APIRouter(prefix="/cart", tags=["Cart"])


@router.get("", response_model=list[CartLineRead])
def get_cart(current_user: User = Depends(get_current_active_user), session: Session = Depends(get_session)):
    items = session.exec(select(CartItem).where(CartItem.user_id == current_user.id)).all()
    result: list[CartLineRead] = []
    for item in items:
        product = session.get(Product, item.product_id)
        if not product:
            continue
        result.append(
            CartLineRead(
                id=item.id or 0,
                product_id=product.id or 0,
                product_name=product.name,
                price=product.price,
                image_url=product.image_url,
                quantity=item.quantity,
                line_total=product.price * item.quantity,
            )
        )
    return result


@router.post("", response_model=list[CartLineRead])
def add_to_cart(
    payload: CartItemCreate,
    current_user: User = Depends(get_current_active_user),
    session: Session = Depends(get_session),
):
    product = session.get(Product, payload.product_id)
    if not product or not product.is_active:
        raise HTTPException(status_code=404, detail="Product not found")
    existing = session.exec(
        select(CartItem).where(CartItem.user_id == current_user.id, CartItem.product_id == payload.product_id)
    ).first()
    if existing:
        existing.quantity += payload.quantity
        existing.updated_at = datetime.utcnow()
    else:
        session.add(CartItem(user_id=current_user.id or 0, product_id=payload.product_id, quantity=payload.quantity))
    session.commit()
    return get_cart(current_user=current_user, session=session)


@router.put("/{cart_item_id}", response_model=list[CartLineRead])
def update_cart_item(
    cart_item_id: int,
    payload: CartItemUpdate,
    current_user: User = Depends(get_current_active_user),
    session: Session = Depends(get_session),
):
    item = session.get(CartItem, cart_item_id)
    if not item or item.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Cart item not found")
    item.quantity = payload.quantity
    item.updated_at = datetime.utcnow()
    session.add(item)
    session.commit()
    return get_cart(current_user=current_user, session=session)


@router.delete("/{cart_item_id}", response_model=list[CartLineRead])
def remove_cart_item(cart_item_id: int, current_user: User = Depends(get_current_active_user), session: Session = Depends(get_session)):
    item = session.get(CartItem, cart_item_id)
    if not item or item.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Cart item not found")
    session.delete(item)
    session.commit()
    return get_cart(current_user=current_user, session=session)
