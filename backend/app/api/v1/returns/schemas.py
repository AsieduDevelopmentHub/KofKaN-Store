from datetime import datetime

from pydantic import BaseModel, Field


class ReturnCreateRequest(BaseModel):
    order_id: int
    reason: str = Field(min_length=3, max_length=240)


class ReturnReadResponse(BaseModel):
    id: int
    order_id: int
    user_id: int
    reason: str
    status: str
    created_at: datetime
