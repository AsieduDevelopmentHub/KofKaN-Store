"""Wishlist business logic."""
from __future__ import annotations

from fastapi import HTTPException, status
from sqlmodel import Session, select

from app.models import Product, WishlistItem
from app.api.v1.wishlist.schemas import ProductSummary, WishlistItemRead, WishlistAddSchema


async def list_wishlist(session: Session, user_id: int) -> list[WishlistItemRead]:
    rows = session.exec(
        select(WishlistItem, Product)
        .join(Product, WishlistItem.product_id == Product.id)
        .where(WishlistItem.user_id == user_id)
        .order_by(WishlistItem.created_at.desc())
    ).all()
    out: list[WishlistItemRead] = []
    for wl, p in rows:
        out.append(
            WishlistItemRead(
                id=wl.id,
                user_id=wl.user_id,
                product_id=wl.product_id,
                created_at=wl.created_at,
                product=ProductSummary(
                    id=p.id,
                    name=p.name,
                    slug=p.slug,
                    price=p.price,
                    image_url=p.image_url,
                ),
            )
        )
    return out


async def add_wishlist_item(
    session: Session, user_id: int, body: WishlistAddSchema
) -> WishlistItemRead:
    product = session.exec(select(Product).where(Product.id == body.product_id)).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found",
        )
    if not product.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Product is not available",
        )
    existing = session.exec(
        select(WishlistItem).where(
            WishlistItem.user_id == user_id,
            WishlistItem.product_id == body.product_id,
        )
    ).first()
    if existing:
        return WishlistItemRead(
            id=existing.id,
            user_id=existing.user_id,
            product_id=existing.product_id,
            created_at=existing.created_at,
            product=ProductSummary(
                id=product.id,
                name=product.name,
                slug=product.slug,
                price=product.price,
                image_url=product.image_url,
            ),
        )
    row = WishlistItem(user_id=user_id, product_id=body.product_id)
    session.add(row)
    session.commit()
    session.refresh(row)
    return WishlistItemRead(
        id=row.id,
        user_id=row.user_id,
        product_id=row.product_id,
        created_at=row.created_at,
        product=ProductSummary(
            id=product.id,
            name=product.name,
            slug=product.slug,
            price=product.price,
            image_url=product.image_url,
        ),
    )


async def remove_wishlist_item(session: Session, item_id: int, user_id: int) -> None:
    item = session.exec(select(WishlistItem).where(WishlistItem.id == item_id)).first()
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Wishlist item not found",
        )
    if item.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not allowed to remove this wishlist item",
        )
    session.delete(item)
    session.commit()
