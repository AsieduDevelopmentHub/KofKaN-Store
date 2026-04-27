"""Wishlist API routes."""
from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from app.db import get_session
from app.models import Product, WishlistItem
from app.api.v1.auth.dependencies import get_current_active_user
from app.api.v1.wishlist.schemas import WishlistAddSchema, WishlistItemRead
from app.api.v1.wishlist.services import (
    add_wishlist_item,
    list_wishlist,
    remove_wishlist_item,
)

router = APIRouter()


@router.get("/", response_model=List[WishlistItemRead])
async def get_wishlist(
    current_user=Depends(get_current_active_user),
    session: Session = Depends(get_session),
):
    """List current user's wishlist with basic product info."""
    return await list_wishlist(session, current_user.id)


@router.post("/items", response_model=WishlistItemRead, status_code=status.HTTP_201_CREATED)
async def add_item(
    body: WishlistAddSchema,
    current_user=Depends(get_current_active_user),
    session: Session = Depends(get_session),
):
    """Add a product to the wishlist (idempotent if already saved)."""
    return await add_wishlist_item(session, current_user.id, body)


@router.delete("/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_item(
    item_id: int,
    current_user=Depends(get_current_active_user),
    session: Session = Depends(get_session),
):
    """Remove a wishlist entry by its row id."""
    await remove_wishlist_item(session, item_id, current_user.id)
    return None


@router.delete("/by-product/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_by_product(
    product_id: int,
    current_user=Depends(get_current_active_user),
    session: Session = Depends(get_session),
):
    """Remove wishlist row for a product id (convenience for storefront UIs)."""
    product = session.exec(select(Product).where(Product.id == product_id)).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    item = session.exec(
        select(WishlistItem).where(
            WishlistItem.user_id == current_user.id,
            WishlistItem.product_id == product_id,
        )
    ).first()
    if item:
        session.delete(item)
        session.commit()
    return None
