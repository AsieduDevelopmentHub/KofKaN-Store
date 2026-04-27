"""
Shopping cart API routes
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, status
from sqlmodel import Session, select

from app.db import get_session
from app.api.v1.auth.dependencies import get_current_active_user
from app.models import CartItem, ProductVariant
from app.api.v1.cart.schemas import (
    CartItemSchema,
    CartItemCreateSchema,
    CartItemUpdateSchema,
    CartWithWishlistSchema,
)
from app.api.v1.cart.services import (
    get_user_cart,
    get_cart_with_wishlist,
    add_to_cart,
    update_cart_item,
    remove_from_cart,
    clear_cart,
)

router = APIRouter()


def _enrich_many(session: Session, items: list[CartItem]) -> list[CartItemSchema]:
    """Attach variant name/price-delta/image in a single batch (avoids N+1)."""
    variant_ids = {it.variant_id for it in items if it.variant_id}
    variants: dict[int, ProductVariant] = {}
    if variant_ids:
        rows = session.exec(select(ProductVariant).where(ProductVariant.id.in_(variant_ids))).all()
        variants = {v.id: v for v in rows if v.id is not None}

    out: list[CartItemSchema] = []
    for item in items:
        variant: Optional[ProductVariant] = variants.get(item.variant_id) if item.variant_id else None
        out.append(
            CartItemSchema(
                id=item.id,
                user_id=item.user_id,
                product_id=item.product_id,
                variant_id=item.variant_id,
                variant_name=variant.name if variant else None,
                variant_price_delta=float(variant.price_delta) if variant else None,
                variant_image_url=getattr(variant, "image_url", None) if variant else None,
                quantity=item.quantity,
                created_at=item.created_at,
                updated_at=item.updated_at,
            )
        )
    return out


@router.get("/", response_model=List[CartItemSchema])
async def list_cart(
    current_user=Depends(get_current_active_user),
    session: Session = Depends(get_session)
):
    """Get current user's cart items."""
    items = await get_user_cart(session, current_user.id)
    return _enrich_many(session, items)


@router.get("/with-wishlist", response_model=CartWithWishlistSchema)
async def list_cart_with_wishlist(
    current_user=Depends(get_current_active_user),
    session: Session = Depends(get_session),
):
    """Cart plus wishlist in one response (for cart/checkout UI)."""
    payload = await get_cart_with_wishlist(session, current_user.id)
    payload["cart"] = _enrich_many(session, payload["cart"])
    return payload


@router.post("/items", response_model=CartItemSchema, status_code=status.HTTP_201_CREATED)
async def add_cart_item(
    item: CartItemCreateSchema,
    current_user=Depends(get_current_active_user),
    session: Session = Depends(get_session)
):
    """Add item to cart. Stock + variant validity is enforced in the service."""
    created = await add_to_cart(session, current_user.id, item)
    return _enrich_many(session, [created])[0]


@router.put("/items/{item_id}", response_model=CartItemSchema)
async def update_item(
    item_id: int,
    update_data: CartItemUpdateSchema,
    current_user=Depends(get_current_active_user),
    session: Session = Depends(get_session)
):
    """Update cart item quantity."""
    updated = await update_cart_item(session, item_id, current_user.id, update_data)
    return _enrich_many(session, [updated])[0]


@router.delete("/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_item(
    item_id: int,
    current_user=Depends(get_current_active_user),
    session: Session = Depends(get_session)
):
    """Remove item from cart."""
    await remove_from_cart(session, item_id, current_user.id)
    return None


@router.delete("/", status_code=status.HTTP_204_NO_CONTENT)
async def empty_cart(
    current_user=Depends(get_current_active_user),
    session: Session = Depends(get_session)
):
    """Clear entire cart."""
    await clear_cart(session, current_user.id)
    return None
