from datetime import datetime

from pydantic import BaseModel, EmailStr


class NewsletterSubscriptionRequest(BaseModel):
    email: EmailStr


class NewsletterSubscriptionResponse(BaseModel):
    message: str
    email: EmailStr
    is_subscribed: bool


class NewsletterSubscriptionRead(BaseModel):
    email: EmailStr
    is_subscribed: bool
    created_at: datetime
