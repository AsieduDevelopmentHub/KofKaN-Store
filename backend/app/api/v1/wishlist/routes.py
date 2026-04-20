from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.api.v1.auth.dependencies import get_current_active_user
from app.db import get_session
from app.models import Product, User, WishlistItem

router = APIRouter(prefix="/wishlist", tags=["Wishlist"])


@router.get("")
def list_wishlist(current_user: User = Depends(get_current_active_user), session: Session = Depends(get_session)):
    rows = session.exec(select(WishlistItem).where(WishlistItem.user_id == current_user.id)).all()
    products = []
    for row in rows:
        product = session.get(Product, row.product_id)
        if product:
            products.append(product)
    return products


@router.post("")
def add_to_wishlist(payload: dict, current_user: User = Depends(get_current_active_user), session: Session = Depends(get_session)):
    product_id = int(payload.get("product_id", 0))
    product = session.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    existing = session.exec(
        select(WishlistItem).where(WishlistItem.user_id == current_user.id, WishlistItem.product_id == product_id)
    ).first()
    if not existing:
        session.add(WishlistItem(user_id=current_user.id or 0, product_id=product_id))
        session.commit()
    return {"message": "Added to wishlist"}


@router.delete("/{product_id}")
def remove_from_wishlist(product_id: int, current_user: User = Depends(get_current_active_user), session: Session = Depends(get_session)):
    existing = session.exec(
        select(WishlistItem).where(WishlistItem.user_id == current_user.id, WishlistItem.product_id == product_id)
    ).first()
    if existing:
        session.delete(existing)
        session.commit()
    return {"message": "Removed from wishlist"}
