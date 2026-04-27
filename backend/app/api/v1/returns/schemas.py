"""
Order-return schemas.
"""
from __future__ import annotations

from datetime import datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, Field, field_validator

from app.core.sanitization import sanitize_multiline_text, sanitize_plain_text


ReturnStatus = Literal[
    "pending", "approved", "rejected", "received", "refunded", "cancelled"
]


class OrderReturnItemCreate(BaseModel):
    order_item_id: int = Field(..., gt=0)
    quantity: int = Field(..., gt=0, le=10_000)


class OrderReturnItemRead(BaseModel):
    id: int
    return_id: int
    order_item_id: int
    quantity: int
    created_at: datetime

    class Config:
        from_attributes = True


class OrderReturnCreate(BaseModel):
    reason: str = Field(..., min_length=1, max_length=120)
    details: Optional[str] = Field(default=None, max_length=4000)
    preferred_outcome: Literal["refund", "replacement"] = "refund"
    items: List[OrderReturnItemCreate] = Field(..., min_length=1, max_length=50)

    @field_validator("reason", mode="before")
    @classmethod
    def _clean_reason(cls, v):
        return sanitize_plain_text(v, max_length=120, single_line=True)

    @field_validator("details", mode="before")
    @classmethod
    def _clean_details(cls, v):
        return sanitize_multiline_text(v, max_length=4000)


class OrderReturnRead(BaseModel):
    id: int
    order_id: int
    user_id: int
    reason: str
    details: Optional[str] = None
    preferred_outcome: str
    status: str
    admin_notes: Optional[str] = None
    resolved_by: Optional[int] = None
    resolved_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    items: List[OrderReturnItemRead] = []

    class Config:
        from_attributes = True


class OrderReturnStatusUpdate(BaseModel):
    status: ReturnStatus
    admin_notes: Optional[str] = Field(default=None, max_length=4000)

    @field_validator("admin_notes", mode="before")
    @classmethod
    def _clean_notes(cls, v):
        return sanitize_multiline_text(v, max_length=4000)
