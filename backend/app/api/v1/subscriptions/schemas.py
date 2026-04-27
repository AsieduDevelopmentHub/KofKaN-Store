"""
Email subscriptions schemas
"""
from pydantic import BaseModel, EmailStr
from datetime import datetime


class SubscriptionResponse(BaseModel):
    email: str
    is_subscribed: bool
    verified: bool
    subscribed_at: datetime
    
    class Config:
        from_attributes = True
