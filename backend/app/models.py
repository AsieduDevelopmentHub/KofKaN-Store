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


class UserBase(SQLModel):
    email: str = Field(index=True, unique=True, max_length=255)
    full_name: str = Field(max_length=120)
    is_admin: bool = False
    is_active: bool = True
    admin_role: str = Field(default="customer", max_length=32)
    admin_permissions: str = Field(default="", max_length=4000)
    google_sub: Optional[str] = Field(default=None, max_length=255, unique=True)


class User(UserBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    password_hash: str
    created_at: datetime = Field(default_factory=datetime.utcnow)


class UserCreate(SQLModel):
    email: str
    full_name: str
    password: str


class UserLogin(SQLModel):
    email: str
    password: str


class UserRead(SQLModel):
    id: int
    email: str
    full_name: str
    is_admin: bool
    admin_role: str


class TokenResponse(SQLModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserRead


class RefreshTokenRequest(SQLModel):
    refresh_token: str


class TwoFASetupResponse(SQLModel):
    secret: str
    otp_uri: str


class TwoFAVerifyRequest(SQLModel):
    code: str


class TokenBlacklist(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    token: str = Field(index=True, unique=True, max_length=2048)
    expires_at: datetime
    created_at: datetime = Field(default_factory=datetime.utcnow)


class CartItemBase(SQLModel):
    product_id: int = Field(foreign_key="product.id", index=True)
    quantity: int = Field(default=1, ge=1)


class CartItem(CartItemBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class CartItemCreate(SQLModel):
    product_id: int
    quantity: int = Field(default=1, ge=1)


class CartItemUpdate(SQLModel):
    quantity: int = Field(ge=1)


class CartLineRead(SQLModel):
    id: int
    product_id: int
    product_name: str
    price: float
    image_url: Optional[str] = None
    quantity: int
    line_total: float


class Order(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    status: str = Field(default="pending", max_length=32)
    total_amount: float = Field(default=0, ge=0)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class OrderItem(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    order_id: int = Field(foreign_key="order.id", index=True)
    product_id: int = Field(foreign_key="product.id")
    quantity: int = Field(ge=1)
    unit_price: float = Field(ge=0)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class OrderRead(SQLModel):
    id: int
    status: str
    total_amount: float
    created_at: datetime


class AdminDashboardSummary(SQLModel):
    users: int
    products: int
    open_orders: int
    revenue: float


class TwoFactorSecret(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True, unique=True)
    secret: str = Field(max_length=128)
    verified: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)
    verified_at: Optional[datetime] = None


class EmailSubscription(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(index=True, unique=True, max_length=255)
    is_subscribed: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)


class PaymentIntent(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    order_id: Optional[int] = Field(default=None, foreign_key="order.id", index=True)
    reference: str = Field(index=True, unique=True, max_length=128)
    provider: str = Field(default="paystack", max_length=32)
    amount: float = Field(default=0, ge=0)
    currency: str = Field(default="GHS", max_length=8)
    status: str = Field(default="pending", max_length=32)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class PaymentWebhookEvent(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    event_key: str = Field(index=True, unique=True, max_length=160)
    reference: str = Field(index=True, max_length=128)
    provider: str = Field(default="paystack", max_length=32)
    provider_event_id: Optional[str] = Field(default=None, max_length=128)
    status: str = Field(default="pending", max_length=32)
    processed: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)


class WishlistItem(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    product_id: int = Field(foreign_key="product.id", index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class OrderReturn(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    order_id: int = Field(foreign_key="order.id", index=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    reason: str = Field(max_length=240)
    status: str = Field(default="pending", max_length=32)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Review(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    product_id: int = Field(foreign_key="product.id", index=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    rating: int = Field(ge=1, le=5)
    title: str = Field(max_length=140)
    content: Optional[str] = Field(default=None, max_length=2000)
    created_at: datetime = Field(default_factory=datetime.utcnow)
