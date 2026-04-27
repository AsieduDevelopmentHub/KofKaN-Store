from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.api.v1.auth.dependencies import get_current_active_user
from app.db import get_session
from app.api.v1.wishlist.schemas import WishlistAddRequest
from app.models import Product, User, WishlistItem

router = APIRouter(prefix="/wishlist", tags=["Wishlist"])


def _wishlist_item_read(row: WishlistItem, product: Product | None) -> dict:
    return {
        "id": int(row.id or 0),
        "user_id": int(row.user_id),
        "product_id": int(row.product_id),
        "created_at": row.created_at.isoformat(),
        "product": None
        if not product
        else {
            "id": int(product.id or 0),
            "name": product.name,
            "slug": product.slug,
            "price": float(product.price),
            "image_url": product.image_url,
        },
    }


@router.get("")
@router.get("/")
def list_wishlist(current_user: User = Depends(get_current_active_user), session: Session = Depends(get_session)):
    rows = session.exec(select(WishlistItem).where(WishlistItem.user_id == current_user.id).order_by(WishlistItem.created_at.desc())).all()
    items: list[dict] = []
    for r in rows:
        prod = session.get(Product, r.product_id)
        items.append(_wishlist_item_read(r, prod))
    return items


@router.post("")
@router.post("/items")
def add_to_wishlist(
    payload: WishlistAddRequest, current_user: User = Depends(get_current_active_user), session: Session = Depends(get_session)
):
    product = session.get(Product, payload.product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    existing = session.exec(
        select(WishlistItem).where(WishlistItem.user_id == current_user.id, WishlistItem.product_id == payload.product_id)
    ).first()
    if existing:
        return _wishlist_item_read(existing, product)

    row = WishlistItem(user_id=current_user.id or 0, product_id=payload.product_id)
    session.add(row)
    session.commit()
    session.refresh(row)
    return _wishlist_item_read(row, product)


@router.delete("/{product_id}")
@router.delete("/by-product/{product_id}")
def remove_from_wishlist_by_product(
    product_id: int, current_user: User = Depends(get_current_active_user), session: Session = Depends(get_session)
):
    existing = session.exec(
        select(WishlistItem).where(WishlistItem.user_id == current_user.id, WishlistItem.product_id == product_id)
    ).first()
    if existing:
        session.delete(existing)
        session.commit()
    return {"ok": True}


@router.delete("/items/{item_id}")
def remove_from_wishlist_item(
    item_id: int, current_user: User = Depends(get_current_active_user), session: Session = Depends(get_session)
):
    existing = session.get(WishlistItem, item_id)
    if not existing or existing.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Wishlist item not found")
    session.delete(existing)
    session.commit()
    return {"ok": True}
