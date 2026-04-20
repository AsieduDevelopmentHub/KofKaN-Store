from typing import Optional

from pydantic import BaseModel, Field


class ProductListQuery(BaseModel):
    search: Optional[str] = Field(default=None, min_length=1, max_length=120)
    category_id: Optional[int] = None
    featured_only: bool = False
    limit: int = Field(default=20, ge=1, le=100)
