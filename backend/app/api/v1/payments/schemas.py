from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field


class PaymentInitializeRequest(BaseModel):
    order_id: int


class PaymentInitializeResponse(BaseModel):
    reference: str
    authorization_url: str
    amount: float
    currency: str
    status: str


class PaymentStatusResponse(BaseModel):
    reference: str
    status: str
    amount: float
    currency: str
    provider: str
    updated_at: Optional[datetime] = None


class PaymentWebhookPayload(BaseModel):
    reference: str = Field(min_length=4, max_length=128)
    status: Literal["success", "failed", "abandoned", "pending", "refunded"] = "pending"
    provider: str = "paystack"
    event_id: Optional[str] = Field(default=None, max_length=128)
