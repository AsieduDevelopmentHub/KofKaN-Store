from fastapi import HTTPException
from sqlmodel import Session, select

from app.models import Product, User, WishlistItem


def list_wishlist_products(session: Session, user: User) -> list[Product]:
    rows = session.exec(select(WishlistItem).where(WishlistItem.user_id == user.id)).all()
    products: list[Product] = []
    for row in rows:
        product = session.get(Product, row.product_id)
        if product:
            products.append(product)
    return products


def add_product_to_wishlist(session: Session, user: User, product_id: int) -> None:
    product = session.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    existing = session.exec(select(WishlistItem).where(WishlistItem.user_id == user.id, WishlistItem.product_id == product_id)).first()
    if existing:
        return

    session.add(WishlistItem(user_id=user.id or 0, product_id=product_id))
    session.commit()


def remove_product_from_wishlist(session: Session, user: User, product_id: int) -> None:
    existing = session.exec(select(WishlistItem).where(WishlistItem.user_id == user.id, WishlistItem.product_id == product_id)).first()
    if not existing:
        return
    session.delete(existing)
    session.commit()
