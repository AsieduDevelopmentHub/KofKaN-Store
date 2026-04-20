from fastapi import APIRouter, Depends
from sqlmodel import Session

from app.api.v1.auth.dependencies import require_admin_permission
from app.db import get_session
from app.models import User
from app.api.v1.subscriptions.schemas import (
    NewsletterSubscriptionRead,
    NewsletterSubscriptionRequest,
    NewsletterSubscriptionResponse,
)
from app.api.v1.subscriptions.services import list_subscriptions, subscribe_email, unsubscribe_email

router = APIRouter(prefix="/subscriptions", tags=["Subscriptions"])


@router.post("/newsletter/subscribe")
def subscribe_newsletter(
    payload: NewsletterSubscriptionRequest, session: Session = Depends(get_session)
) -> NewsletterSubscriptionResponse:
    item = subscribe_email(session=session, email=payload.email)
    return NewsletterSubscriptionResponse(message="Subscribed successfully", email=item.email, is_subscribed=item.is_subscribed)


@router.post("/newsletter/unsubscribe")
def unsubscribe_newsletter(
    payload: NewsletterSubscriptionRequest, session: Session = Depends(get_session)
) -> NewsletterSubscriptionResponse:
    item = unsubscribe_email(session=session, email=payload.email)
    if not item:
        return NewsletterSubscriptionResponse(
            message="Unsubscribed successfully", email=payload.email, is_subscribed=False
        )
    return NewsletterSubscriptionResponse(message="Unsubscribed successfully", email=item.email, is_subscribed=item.is_subscribed)


@router.get("/newsletter")
def list_newsletter_subscriptions(
    current_user: User = Depends(require_admin_permission("manage_newsletter")),
    session: Session = Depends(get_session),
) -> list[NewsletterSubscriptionRead]:
    _ = current_user
    return [NewsletterSubscriptionRead(email=item.email, is_subscribed=item.is_subscribed, created_at=item.created_at) for item in list_subscriptions(session=session)]
