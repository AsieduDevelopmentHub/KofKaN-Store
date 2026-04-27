"""
Cart schemas
"""
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field

from app.api.v1.wishlist.schemas import WishlistItemRead


class CartItemSchema(BaseModel):
    id: int
    user_id: int
    product_id: int
    variant_id: Optional[int] = None
    # Embedded so the client can render "Blue / M · +GHS 20" without having
    # to issue a second request per cart line.
    variant_name: Optional[str] = None
    variant_price_delta: Optional[float] = None
    variant_image_url: Optional[str] = None
    quantity: int = Field(gt=0)
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CartItemCreateSchema(BaseModel):
    product_id: int
    variant_id: Optional[int] = None
    quantity: int = Field(gt=0, default=1)


class CartItemUpdateSchema(BaseModel):
    quantity: int = Field(gt=0)


class CartWithWishlistSchema(BaseModel):
    """Single response for cart page: line items plus saved wishlist."""

    cart: List[CartItemSchema]
    wishlist: List[WishlistItemRead]
