from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class ReviewCreateRequest(BaseModel):
    product_id: int
    rating: int = Field(ge=1, le=5)
    title: str = Field(min_length=1, max_length=140)
    content: Optional[str] = Field(default=None, max_length=2000)


class ReviewReadResponse(BaseModel):
    id: int
    product_id: int
    user_id: int
    rating: int
    title: str
    content: Optional[str]
    created_at: datetime
