"""Wishlist API schemas."""
from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class ProductSummary(BaseModel):
    id: int
    name: str
    slug: str
    price: float
    image_url: Optional[str] = None


class WishlistItemRead(BaseModel):
    id: int
    user_id: int
    product_id: int
    created_at: datetime
    product: ProductSummary


class WishlistAddSchema(BaseModel):
    product_id: int = Field(..., ge=1)
