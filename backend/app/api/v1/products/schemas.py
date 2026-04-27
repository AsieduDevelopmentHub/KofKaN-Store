from typing import List, Optional
from pydantic import BaseModel, Field, model_validator
from datetime import datetime


class CategoryRead(BaseModel):
    """Category response model"""
    id: int
    name: str
    slug: str
    description: Optional[str] = None
    image_url: Optional[str] = None
    
    class Config:
        from_attributes = True


class ProductBase(BaseModel):
    name: str
    slug: str
    description: Optional[str] = None
    price: float
    image_url: Optional[str] = None


class ProductCreate(ProductBase):
    category_id: Optional[int] = None
    in_stock: int = 0
    sku: Optional[str] = None
    weight: Optional[float] = None


class ProductRead(ProductBase):
    id: int
    category: Optional[str] = Field(
        default=None,
        description="Product row string: usually category id as text; admin may store slug.",
    )
    category_id: Optional[int] = None
    in_stock: int
    sku: Optional[str] = None
    weight: Optional[float] = None
    avg_rating: float = 0.0
    review_count: int = 0
    sales_count: int = 0
    is_active: bool = True
    created_at: datetime

    @model_validator(mode="after")
    def derive_category_id_from_string(self) -> "ProductRead":
        if self.category_id is not None:
            return self
        if self.category is None:
            return self
        s = str(self.category).strip()
        if s.isdigit():
            return self.model_copy(update={"category_id": int(s)})
        return self

    class Config:
        from_attributes = True


class ProductSearchResponse(BaseModel):
    """Paginated search response"""
    total: int
    skip: int
    limit: int
    items: List[ProductRead]
    
    class Config:
        from_attributes = True


class ProductCreateAdmin(ProductCreate):
    """Admin product creation with all fields"""
    pass