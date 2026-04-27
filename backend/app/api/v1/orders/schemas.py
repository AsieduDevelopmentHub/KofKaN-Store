"""
Orders schemas
"""
from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field, field_validator, model_validator

from app.core.sanitization import sanitize_multiline_text, sanitize_plain_text


class OrderItemSchema(BaseModel):
    id: int
    order_id: int
    product_id: int
    quantity: int = Field(gt=0)
    price_at_purchase: float = Field(ge=0)
    created_at: datetime

    class Config:
        from_attributes = True


class OrderItemLineSchema(BaseModel):
    """Order line with display fields (variant-first when a variant was purchased)."""

    id: int
    order_id: int
    product_id: int
    variant_id: Optional[int] = None
    variant_name: Optional[str] = None
    variant_detail_snapshot: Optional[str] = None
    quantity: int = Field(gt=0)
    price_at_purchase: float = Field(ge=0)
    created_at: datetime
    product_name: Optional[str] = None
    product_image_url: Optional[str] = None

    class Config:
        from_attributes = True


class InvoiceSchema(BaseModel):
    id: int
    order_id: int
    invoice_number: str
    subtotal: float = Field(ge=0)
    tax: float = Field(ge=0)
    shipping: float = Field(ge=0)
    total: float = Field(ge=0)
    payment_method: Optional[str] = None
    status: str
    issued_at: datetime
    due_at: Optional[datetime] = None
    paid_at: Optional[datetime] = None
    pdf_url: Optional[str] = None

    class Config:
        from_attributes = True


class OrderSchema(BaseModel):
    id: int
    user_id: int
    total_price: float = Field(ge=0)
    subtotal_amount: Optional[float] = Field(default=None, ge=0)
    delivery_fee: float = Field(default=0.0, ge=0)
    shipping_method: Optional[str] = None
    shipping_region: Optional[str] = None
    shipping_city: Optional[str] = None
    status: str
    shipping_address: Optional[str] = None
    shipping_provider: Optional[str] = None
    shipping_contact_name: Optional[str] = None
    shipping_contact_phone: Optional[str] = None
    tracking_number: Optional[str] = None
    estimated_delivery: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    cancel_reason: Optional[str] = None
    payment_method: Optional[str] = None
    notes: Optional[str] = None
    paystack_reference: Optional[str] = None
    payment_status: str = "pending"
    confirmation_email_sent_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class OrderDetailSchema(OrderSchema):
    items: list[OrderItemLineSchema] = []
    invoice: Optional[InvoiceSchema] = None


class OrderListItem(OrderSchema):
    preview_product_name: Optional[str] = None
    preview_image_url: Optional[str] = None
    line_count: int = 0


class OrderCreateSchema(BaseModel):
    shipping_address: Optional[str] = None
    notes: Optional[str] = None
    shipping_method: Literal["pickup", "delivery"] = "pickup"
    shipping_region: Optional[str] = None
    shipping_city: Optional[str] = None
    shipping_provider: Optional[str] = None
    shipping_contact_name: Optional[str] = None
    shipping_contact_phone: Optional[str] = None

    @field_validator("shipping_address", mode="before")
    @classmethod
    def _sanitize_address(cls, v):
        return sanitize_multiline_text(v, max_length=2000)

    @field_validator("notes", mode="before")
    @classmethod
    def _sanitize_notes(cls, v):
        return sanitize_multiline_text(v, max_length=2000)

    @field_validator("shipping_provider", mode="before")
    @classmethod
    def _sanitize_provider(cls, v):
        if v is None:
            return None
        return sanitize_plain_text(str(v), max_length=120, single_line=True)

    @field_validator("shipping_city", "shipping_contact_name", mode="before")
    @classmethod
    def _sanitize_short_fields(cls, v):
        return sanitize_plain_text(v, max_length=120, single_line=True)

    @field_validator("shipping_contact_phone", mode="before")
    @classmethod
    def _sanitize_contact_phone(cls, v):
        if v is None:
            return None
        return sanitize_plain_text(v, max_length=32, single_line=True)

    @model_validator(mode="after")
    def _delivery_rules(self):
        if self.shipping_method == "delivery":
            if not (self.shipping_region or "").strip():
                raise ValueError("Choose a region for delivery.")
            if not (self.shipping_city or "").strip():
                raise ValueError("Enter a city/town for delivery.")
            if not (self.shipping_provider or "").strip():
                raise ValueError("Choose a courier or delivery service.")
            if not (self.shipping_address or "").strip():
                raise ValueError("Enter a delivery address.")
            if not (self.shipping_contact_name or "").strip():
                raise ValueError("Enter a contact name for delivery.")
            if not (self.shipping_contact_phone or "").strip():
                raise ValueError("Enter a contact phone for delivery.")
        return self


class ShippingCityOption(BaseModel):
    name: str
    fee: float = Field(ge=0)


class ShippingRegionOption(BaseModel):
    slug: str
    label: str
    base_fee: float = Field(ge=0)
    cities: list[ShippingCityOption] = []


class ShippingCourierOption(BaseModel):
    name: str
    fee_delta: float = 0


class ShippingOptionsSchema(BaseModel):
    regions: list[ShippingRegionOption] = []
    couriers: list[ShippingCourierOption] = []

