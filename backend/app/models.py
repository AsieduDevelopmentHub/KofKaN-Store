from datetime import datetime
from typing import Optional

from sqlmodel import Field, SQLModel


class CategoryBase(SQLModel):
    name: str = Field(index=True, unique=True, max_length=120)
    slug: str = Field(index=True, unique=True, max_length=140)
    description: Optional[str] = Field(default=None, max_length=600)
    image_url: Optional[str] = None
    is_active: bool = True
    sort_order: int = 0


class Category(CategoryBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class ProductBase(SQLModel):
    name: str = Field(index=True, max_length=200)
    slug: str = Field(index=True, unique=True, max_length=220)
    description: Optional[str] = Field(default=None, max_length=4000)
    category_id: Optional[int] = Field(default=None, foreign_key="category.id", index=True)
    sku: str = Field(index=True, unique=True, max_length=120)
    brand: Optional[str] = Field(default=None, max_length=120)
    voltage_spec: Optional[str] = Field(default=None, max_length=120)
    price: float = Field(ge=0)
    currency: str = Field(default="GHS", max_length=8)
    stock_quantity: int = Field(default=0, ge=0)
    image_url: Optional[str] = None
    is_featured: bool = False
    is_active: bool = True


class Product(ProductBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class ProductCreate(ProductBase):
    pass


class ProductUpdate(SQLModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category_id: Optional[int] = None
    brand: Optional[str] = None
    voltage_spec: Optional[str] = None
    price: Optional[float] = None
    stock_quantity: Optional[int] = None
    image_url: Optional[str] = None
    is_featured: Optional[bool] = None
    is_active: Optional[bool] = None


class ProductRead(ProductBase):
    id: int
    created_at: datetime
    updated_at: datetime
