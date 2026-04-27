from typing import Any, Optional
from pydantic import BaseModel, Field, HttpUrl, field_validator

from app.core.sanitization import sanitize_multiline_text


class PaystackInitializeRequest(BaseModel):
    order_id: int = Field(..., ge=1)
    callback_url: HttpUrl


class PaystackInitializeResponse(BaseModel):
    authorization_url: str
    access_code: str
    reference: str
    public_key: Optional[str] = None


class PaystackVerifyResponse(BaseModel):
    status: str
    reference: str
    amount_subunit: int
    currency: str
    paid_at: Optional[str] = None
    customer_email: Optional[str] = None
    metadata: Optional[Any] = None
    already_confirmed: bool = False
    order_id: Optional[int] = None


class PaystackWebhookAck(BaseModel):
    received: bool = True


class PaystackRefundRequestBody(BaseModel):
    amount: Optional[float] = Field(
        None,
        gt=0,
        description="Major currency units (e.g. GHS); omit for full refund",
    )
    customer_note: Optional[str] = None
    merchant_note: Optional[str] = None

    @field_validator("customer_note", "merchant_note", mode="before")
    @classmethod
    def _sanitize_notes(cls, v):
        return sanitize_multiline_text(v, max_length=2000)


class PaystackRefundResponse(BaseModel):
    order_id: int
    payment_status: str
    refund_id: Optional[int] = None
    amount_subunit: int
    currency: str
    paystack_status: str
    message: str = ""
