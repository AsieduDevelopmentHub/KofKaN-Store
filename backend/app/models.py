from datetime import datetime, timezone
from typing import Optional
from sqlmodel import Field, SQLModel
from sqlalchemy import Column, String, UniqueConstraint, func


class ProductBase(SQLModel):
    name: str
    slug: str
    description: Optional[str] = None
    price: float
    image_url: Optional[str] = None
    # Supabase/Postgres schema uses `category_id` (FK to `category.id`).
    # Keep `category` as a derived/compat field at the API layer, not as a DB column.
    category_id: Optional[int] = Field(default=None, foreign_key="category.id", index=True)
    sku: Optional[str] = Field(default=None, max_length=120, index=True) 
    weight: Optional[float] = None
    in_stock: int = 0
    is_active: bool = True
    sales_count: int = Field(default=0, ge=0)
    avg_rating: float = Field(default=0.0, ge=0, le=5)
    
    # Electronics-specific fields from KofKaN
    brand: Optional[str] = Field(default=None, max_length=120)
    voltage_spec: Optional[str] = Field(default=None, max_length=120)
    warranty_months: int = Field(default=12, ge=0)
    tech_specs: Optional[str] = Field(default=None, max_length=4000)
    
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    deleted_at: Optional[datetime] = Field(default=None, index=True)  # Soft delete support


class Product(ProductBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)


class ProductCreate(ProductBase):
    pass


class ProductRead(ProductBase):
    id: int


class UserBase(SQLModel):
    username: str = Field(index=True, unique=True, max_length=50)
    name: str = Field(max_length=120)
    email: Optional[str] = Field(
        default=None,
        sa_column=Column("email", String, unique=True, nullable=True),
    )
    is_active: bool = True
    is_admin: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class User(UserBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    hashed_password: str
    # Google OAuth "sub" claim; unique when set (one Google account ↔ one KofKaN user).
    google_sub: Optional[str] = Field(default=None, max_length=255, index=True, unique=True)
    email_verified: bool = False
    email_is_placeholder: bool = Field(default=False)
    phone: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    two_fa_enabled: bool = False
    two_fa_method: Optional[str] = None  # "totp" or "email"
    shipping_region: Optional[str] = Field(default=None, max_length=80)
    shipping_city: Optional[str] = Field(default=None, max_length=120)
    shipping_address_line1: Optional[str] = Field(default=None, max_length=255)
    shipping_address_line2: Optional[str] = Field(default=None, max_length=255)
    shipping_landmark: Optional[str] = Field(default=None, max_length=255)
    shipping_contact_name: Optional[str] = Field(default=None, max_length=120)
    shipping_contact_phone: Optional[str] = Field(default=None, max_length=32)
    admin_role: str = Field(default="customer", max_length=32)
    # Comma-separated permission keys for staff/admin (super_admin bypasses checks).
    admin_permissions: Optional[str] = Field(default="", max_length=4000)
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    deleted_at: Optional[datetime] = Field(default=None, index=True)  # Soft delete support


class UserCreate(UserBase):
    password: str


class UserRead(UserBase):
    id: int
    email_verified: bool
    email_is_placeholder: bool = False
    phone: Optional[str] = None
    # Backward-compat fields; deprecated in favor of `name`.
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    two_fa_enabled: bool


class UserUpdate(SQLModel):
    username: Optional[str] = None
    name: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    shipping_region: Optional[str] = None
    shipping_city: Optional[str] = None
    shipping_address_line1: Optional[str] = None
    shipping_address_line2: Optional[str] = None
    shipping_landmark: Optional[str] = None
    shipping_contact_name: Optional[str] = None
    shipping_contact_phone: Optional[str] = None


# Authentication tokens and sessions
class TokenBlacklist(SQLModel, table=True):
    """Blacklisted tokens for logout"""
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    token: str = Field(index=True, unique=True)
    expires_at: datetime
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class OTPCode(SQLModel, table=True):
    """OTP codes for email verification and password reset"""
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    code: str = Field(index=True)
    purpose: str  # "email_verification", "password_reset", "2fa_setup"
    expires_at: datetime
    used: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class TwoFactorSecret(SQLModel, table=True):
    """2FA TOTP secrets and backup codes"""
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True, unique=True)
    secret: str  # Encrypted TOTP secret
    backup_codes: str  # JSON-encoded list of backup codes
    verified: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    verified_at: Optional[datetime] = None


class PasswordReset(SQLModel, table=True):
    """Password reset tokens"""
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    token: str = Field(index=True, unique=True)
    expires_at: datetime
    used: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ============ E-COMMERCE MODELS ============

class Category(SQLModel, table=True):
    """Product categories"""
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True, unique=True)
    slug: str = Field(index=True, unique=True)
    description: Optional[str] = None
    image_url: Optional[str] = None
    is_active: bool = True
    sort_order: int = Field(default=0)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class CartItem(SQLModel, table=True):
    """Shopping cart items.

    A row is keyed by (user_id, product_id, variant_id) — two rows for the
    same product but different variants are deliberately allowed so shoppers
    can add e.g. "Red / Small" and "Blue / Medium" of the same shirt.
    """
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    product_id: int = Field(foreign_key="product.id", index=True)
    variant_id: Optional[int] = Field(
        default=None, foreign_key="productvariant.id", index=True
    )
    quantity: int = Field(gt=0)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class WishlistItem(SQLModel, table=True):
    """Saved products per user (no quantity)."""

    __table_args__ = (
        UniqueConstraint("user_id", "product_id", name="uq_wishlistitem_user_product"),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    product_id: int = Field(foreign_key="product.id", index=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class Order(SQLModel, table=True):
    """Customer orders"""
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    total_price: float = Field(ge=0)
    subtotal_amount: Optional[float] = Field(default=None, ge=0)
    delivery_fee: float = Field(default=0.0, ge=0)
    shipping_method: Optional[str] = None
    shipping_region: Optional[str] = None
    shipping_city: Optional[str] = None
    shipping_contact_name: Optional[str] = None
    shipping_contact_phone: Optional[str] = None
    status: str = Field(default="pending")  # "pending", "processing", "shipped", "delivered", "cancelled"
    shipping_address: Optional[str] = None
    shipping_provider: Optional[str] = None
    tracking_number: Optional[str] = None
    estimated_delivery: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    cancel_reason: Optional[str] = None
    payment_method: Optional[str] = None
    notes: Optional[str] = None
    # Paystack (and other gateways): reference + lifecycle separate from order.status
    paystack_reference: Optional[str] = Field(default=None, index=True)
    payment_status: str = Field(
        default="pending"
    )  # pending | paid | failed | abandoned | refunded | partially_refunded
    confirmation_email_sent_at: Optional[datetime] = None
    idempotency_key: Optional[str] = Field(default=None, max_length=128, index=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class OrderItem(SQLModel, table=True):
    """Items in an order"""
    id: Optional[int] = Field(default=None, primary_key=True)
    order_id: int = Field(foreign_key="order.id", index=True)
    product_id: int = Field(foreign_key="product.id")
    variant_id: Optional[int] = Field(
        default=None, foreign_key="productvariant.id", index=True
    )
    # Snapshot of the variant label at purchase time so historical orders stay
    # readable even if an admin later renames or deletes the variant.
    variant_name: Optional[str] = Field(default=None, max_length=160)
    variant_image_url: Optional[str] = Field(default=None, max_length=1024)
    variant_detail_snapshot: Optional[str] = Field(default=None, max_length=4000)
    quantity: int = Field(gt=0)
    price_at_purchase: float = Field(ge=0)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class Review(SQLModel, table=True):
    """Product reviews"""
    id: Optional[int] = Field(default=None, primary_key=True)
    product_id: int = Field(foreign_key="product.id", index=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    rating: int = Field(ge=1, le=5)
    title: str
    content: Optional[str] = None
    verified_purchase: bool = False
    helpful_count: int = Field(default=0, ge=0)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ============ SCHEMA CLASSES ============

class CartItemCreate(SQLModel):
    product_id: int
    quantity: int = Field(gt=0)


class CartItemUpdate(SQLModel):
    quantity: int = Field(gt=0)


class OrderCreate(SQLModel):
    shipping_address: Optional[str] = None
    notes: Optional[str] = None


class ReviewCreate(SQLModel):
    rating: int = Field(ge=1, le=5)
    title: str
    content: Optional[str] = None


# ============ EMAIL SUBSCRIPTIONS ============

class EmailSubscription(SQLModel, table=True):
    """Email newsletter subscriptions"""
    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(index=True, unique=True)
    user_id: Optional[int] = Field(default=None, foreign_key="user.id", index=True)
    is_subscribed: bool = True
    subscribed_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    unsubscribed_at: Optional[datetime] = None
    verification_token: Optional[str] = Field(default=None, index=True)
    verified: bool = False


# ============ INVOICES ============

class PaystackInitIdempotency(SQLModel, table=True):
    """Replay-safe Paystack /initialize when client sends Idempotency-Key."""

    __tablename__ = "paystack_init_idempotency"

    id: Optional[int] = Field(default=None, primary_key=True)
    idempotency_key: str = Field(max_length=128, unique=True, index=True)
    order_id: int = Field(index=True)
    user_id: int = Field(index=True)
    reference: str = Field(max_length=128)
    authorization_url: str
    access_code: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class PaystackTransaction(SQLModel, table=True):
    """
    One row per Paystack payment reference for auditing and payment-state tracking
    (pending / success / failed / refunded / partially_refunded / abandoned).
    """

    __tablename__ = "paystack_transaction"

    id: Optional[int] = Field(default=None, primary_key=True)
    order_id: int = Field(foreign_key="order.id", index=True)
    user_id: int = Field(index=True)
    reference: str = Field(max_length=128, unique=True, index=True)
    status: str = Field(default="pending")
    amount_subunit: int = Field(default=0, ge=0)
    currency: str = Field(default="GHS", max_length=8)
    paystack_transaction_id: Optional[str] = Field(default=None, max_length=64)
    channel: Optional[str] = Field(default=None, max_length=64)
    customer_email: Optional[str] = Field(default=None, max_length=255)
    gateway_message: Optional[str] = Field(default=None)
    raw_last_event: Optional[str] = Field(default=None)
    paid_at: Optional[datetime] = None
    failed_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class Invoice(SQLModel, table=True):
    """Order invoices"""
    id: Optional[int] = Field(default=None, primary_key=True)
    order_id: int = Field(foreign_key="order.id", index=True, unique=True)
    invoice_number: str = Field(index=True, unique=True)
    subtotal: float = Field(ge=0)
    tax: float = Field(default=0, ge=0)
    shipping: float = Field(default=0, ge=0)
    total: float = Field(ge=0)
    payment_method: Optional[str] = None
    status: str = Field(default="pending")  # pending, paid, overdue, cancelled, refunded
    issued_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    due_at: Optional[datetime] = None
    paid_at: Optional[datetime] = None
    pdf_url: Optional[str] = None


# ============ PRODUCT IMAGES ============

class ProductImage(SQLModel, table=True):
    """Product images (multiple per product)"""
    id: Optional[int] = Field(default=None, primary_key=True)
    product_id: int = Field(foreign_key="product.id", index=True)
    image_url: str
    alt_text: Optional[str] = None
    is_primary: bool = False
    sort_order: int = Field(default=0)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ============ AUDIT LOGS ============

class AuditLog(SQLModel, table=True):
    """
    Comprehensive audit trail for all important actions.
    Tracks user actions, admin changes, auth events, and system operations.
    """
    id: Optional[int] = Field(default=None, primary_key=True)
    
    # Who performed the action
    user_id: Optional[int] = Field(default=None, foreign_key="user.id", index=True)
    
    # What action was performed
    action: str = Field(index=True, max_length=64)  # "create", "update", "delete", "login", etc.
    resource_type: str = Field(index=True, max_length=64)  # "product", "user", "order", "auth", etc.
    resource_id: Optional[int] = Field(default=None, index=True)
    
    # Details of what changed
    changes: Optional[str] = Field(default=None)  # JSON with {field: {old: value, new: value}}
    
    # Status and error tracking
    status: str = Field(default="success", max_length=16)  # "success" or "failed"
    error_message: Optional[str] = Field(default=None, max_length=500)
    
    # Metadata
    ip_address: Optional[str] = Field(default=None, max_length=45)  # IPv4 or IPv6
    user_agent: Optional[str] = Field(default=None, max_length=500)
    
    # Timestamps
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), index=True)
    
    # Retention: consider archiving old records after 90 days


# Keep backward compatibility
class AdminAuditLog(AuditLog):
    """Deprecated: Use AuditLog instead"""
    pass


class InventoryAdjustment(SQLModel, table=True):
    """Inventory movement audit trail (restock/reduction/manual correction)."""
    id: Optional[int] = Field(default=None, primary_key=True)
    product_id: int = Field(foreign_key="product.id", index=True)
    variant_id: Optional[int] = Field(
        default=None, foreign_key="productvariant.id", index=True
    )
    admin_id: Optional[int] = Field(default=None, foreign_key="user.id", index=True)
    delta: int  # + for restock, - for reduction
    previous_stock: int = Field(ge=0)
    new_stock: int = Field(ge=0)
    reason: Optional[str] = Field(default=None, max_length=255)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class Coupon(SQLModel, table=True):
    """Discount configuration."""
    id: Optional[int] = Field(default=None, primary_key=True)
    code: str = Field(index=True, unique=True, max_length=64)
    discount_type: str = Field(default="percent", max_length=16)  # percent | fixed
    discount_value: float = Field(ge=0)
    usage_limit: Optional[int] = Field(default=None, ge=1)
    used_count: int = Field(default=0, ge=0)
    min_order_amount: float = Field(default=0, ge=0)
    starts_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    is_active: bool = True
    created_by: Optional[int] = Field(default=None, foreign_key="user.id", index=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class CouponUsage(SQLModel, table=True):
    """Coupon redemption tracking."""
    id: Optional[int] = Field(default=None, primary_key=True)
    coupon_id: int = Field(foreign_key="coupon.id", index=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    order_id: Optional[int] = Field(default=None, foreign_key="order.id", index=True)
    discount_amount: float = Field(default=0, ge=0)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class BusinessSetting(SQLModel, table=True):
    """Mutable business preferences for admin settings screen."""
    id: Optional[int] = Field(default=None, primary_key=True)
    key: str = Field(index=True, unique=True, max_length=120)
    value: str = Field(default="", max_length=8000)
    updated_by: Optional[int] = Field(default=None, foreign_key="user.id", index=True)
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ============ RETURNS ============

class OrderReturn(SQLModel, table=True):
    """Customer-initiated return/refund request against an order."""

    __tablename__ = "orderreturn"

    id: Optional[int] = Field(default=None, primary_key=True)
    order_id: int = Field(foreign_key="order.id", index=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    reason: str = Field(max_length=120)
    details: Optional[str] = Field(default=None, max_length=4000)
    preferred_outcome: str = Field(default="refund", max_length=24)  # refund | replacement
    status: str = Field(default="pending", max_length=24, index=True)
    # pending | approved | rejected | received | refunded | cancelled
    admin_notes: Optional[str] = Field(default=None, max_length=4000)
    resolved_by: Optional[int] = Field(default=None, foreign_key="user.id", index=True)
    resolved_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class OrderReturnItem(SQLModel, table=True):
    """One line per order-item selected for return."""

    __tablename__ = "orderreturnitem"

    id: Optional[int] = Field(default=None, primary_key=True)
    return_id: int = Field(foreign_key="orderreturn.id", index=True)
    order_item_id: int = Field(foreign_key="orderitem.id", index=True)
    quantity: int = Field(gt=0)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ============ SEARCH ANALYTICS ============

class SearchQueryLog(SQLModel, table=True):
    """One row per /products/search call (for admin search analytics)."""

    __tablename__ = "searchquerylog"

    id: Optional[int] = Field(default=None, primary_key=True)
    query: str = Field(max_length=200, index=True)
    normalized_query: str = Field(max_length=200, index=True)
    result_count: int = Field(default=0, ge=0)
    user_id: Optional[int] = Field(default=None, foreign_key="user.id", index=True)
    ip_hash: Optional[str] = Field(default=None, max_length=64)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), index=True)


# ============ PRODUCT VARIANTS ============

class ProductVariant(SQLModel, table=True):
    """
    Variant SKU of a product (e.g. size/colour combination) with its own stock,
    optional image, and copy. Checkout ties cart lines to a variant when selected.
    """

    __tablename__ = "productvariant"

    id: Optional[int] = Field(default=None, primary_key=True)
    product_id: int = Field(foreign_key="product.id", index=True)
    name: str = Field(max_length=160)  # e.g. "Red / Small"
    sku: Optional[str] = Field(default=None, max_length=120, index=True) 
    attributes: Optional[str] = Field(default=None, max_length=2000)
    # JSON-encoded dict of attributes e.g. {"color":"red","size":"S"}
    price_delta: float = Field(default=0.0)  # signed offset from base product price
    in_stock: int = Field(default=0, ge=0)
    is_active: bool = True
    sort_order: int = Field(default=0)
    # Optional per-variant media/copy: when a shopper picks this variant, the PDP
    # swaps in these overrides so the same product can showcase distinct colours,
    # package shots, and short descriptions without duplicating the whole record.
    image_url: Optional[str] = Field(default=None, max_length=1024)
    description: Optional[str] = Field(default=None, max_length=4000)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ============ REVIEW MEDIA ============

class ReviewMedia(SQLModel, table=True):
    """Images or short videos attached to a product review."""

    __tablename__ = "reviewmedia"

    id: Optional[int] = Field(default=None, primary_key=True)
    review_id: int = Field(foreign_key="review.id", index=True)
    url: str = Field(max_length=1024)
    kind: str = Field(default="image", max_length=16)  # image | video
    sort_order: int = Field(default=0)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
