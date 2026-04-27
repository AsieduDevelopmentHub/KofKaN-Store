from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.api.v1.auth.dependencies import get_current_active_user
from app.db import get_session
from app.models import CartItem, CartItemCreate, CartItemUpdate, CartLineRead, Product, User

router = APIRouter(prefix="/cart", tags=["Cart"])

def _cart_item_row(item: CartItem) -> dict:
    # Frontend expects a "CartItemRow" shape (Sikapa-compatible).
    return {
        "id": int(item.id or 0),
        "user_id": int(item.user_id),
        "product_id": int(item.product_id),
        "variant_id": None,
        "variant_name": None,
        "variant_price_delta": None,
        "variant_image_url": None,
        "quantity": int(item.quantity),
        "created_at": item.created_at.isoformat(),
        "updated_at": item.updated_at.isoformat(),
    }


def _list_cart_rows(user: User, session: Session) -> list[dict]:
    items = session.exec(select(CartItem).where(CartItem.user_id == user.id).order_by(CartItem.created_at.desc())).all()
    return [_cart_item_row(i) for i in items if i.id is not None]


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


# ---- Sikapa-compatible endpoints used by the Next.js frontend ----


@router.get("/", response_model=list[dict])
def cart_list_rows(current_user: User = Depends(get_current_active_user), session: Session = Depends(get_session)):
    return _list_cart_rows(current_user, session)


@router.get("/with-wishlist", response_model=dict)
def cart_with_wishlist(current_user: User = Depends(get_current_active_user), session: Session = Depends(get_session)):
    # Return minimal wishlist list for now; frontend uses it to decorate product tiles.
    from app.models import WishlistItem  # local import to avoid circular imports

    cart = _list_cart_rows(current_user, session)
    wishlist_rows = session.exec(select(WishlistItem).where(WishlistItem.user_id == current_user.id)).all()
    wishlist = [{"id": int(w.id or 0), "user_id": int(w.user_id), "product_id": int(w.product_id), "created_at": w.created_at.isoformat(), "product": None} for w in wishlist_rows if w.id is not None]
    return {"cart": cart, "wishlist": wishlist}


@router.post("/items", response_model=dict)
def cart_add_item_row(
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
        session.add(existing)
        session.commit()
        session.refresh(existing)
        return _cart_item_row(existing)

    row = CartItem(user_id=current_user.id or 0, product_id=payload.product_id, quantity=payload.quantity)
    session.add(row)
    session.commit()
    session.refresh(row)
    return _cart_item_row(row)


@router.put("/items/{item_id}", response_model=dict)
def cart_update_item_row(
    item_id: int,
    payload: CartItemUpdate,
    current_user: User = Depends(get_current_active_user),
    session: Session = Depends(get_session),
):
    item = session.get(CartItem, item_id)
    if not item or item.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Cart item not found")
    item.quantity = payload.quantity
    item.updated_at = datetime.utcnow()
    session.add(item)
    session.commit()
    session.refresh(item)
    return _cart_item_row(item)


@router.delete("/items/{item_id}", response_model=dict)
def cart_delete_item_row(
    item_id: int,
    current_user: User = Depends(get_current_active_user),
    session: Session = Depends(get_session),
):
    item = session.get(CartItem, item_id)
    if not item or item.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Cart item not found")
    out = _cart_item_row(item)
    session.delete(item)
    session.commit()
    return out


@router.delete("/", response_model=dict)
def cart_clear_rows(current_user: User = Depends(get_current_active_user), session: Session = Depends(get_session)):
    items = session.exec(select(CartItem).where(CartItem.user_id == current_user.id)).all()
    for it in items:
        session.delete(it)
    session.commit()
    return {"ok": True}
