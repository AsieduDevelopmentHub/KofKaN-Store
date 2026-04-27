"""
Reviews schemas
"""
from __future__ import annotations

from datetime import datetime
from typing import List, Literal

from pydantic import BaseModel, Field, field_validator

from app.core.sanitization import sanitize_multiline_text, sanitize_plain_text


class ReviewCreateSchema(BaseModel):
    """Schema for creating a review"""
    product_id: int
    rating: int = Field(..., ge=1, le=5, description="Rating from 1 to 5")
    title: str = Field(..., min_length=1, max_length=200)
    content: str = Field(..., min_length=1, max_length=5000)

    @field_validator("title", mode="before")
    @classmethod
    def _sanitize_title(cls, v):
        return sanitize_plain_text(v, max_length=200, single_line=True)

    @field_validator("content", mode="before")
    @classmethod
    def _sanitize_content(cls, v):
        return sanitize_multiline_text(v, max_length=5000)


class ReviewWriteEligibility(BaseModel):
    can_review: bool


class ReviewMediaRead(BaseModel):
    id: int
    review_id: int
    url: str
    kind: Literal["image", "video"]
    sort_order: int = 0
    created_at: datetime

    class Config:
        from_attributes = True


class ReviewSchema(BaseModel):
    """Schema for review response (does not include media — use ReviewPublic for storefront)."""
    id: int
    product_id: int
    user_id: int
    rating: int
    title: str
    content: str | None = None
    created_at: datetime

    class Config:
        from_attributes = True


class ReviewPublic(BaseModel):
    id: int
    product_id: int
    rating: int
    title: str
    content: str | None = None
    created_at: datetime
    reviewer_name: str
    media: List[ReviewMediaRead] = []
