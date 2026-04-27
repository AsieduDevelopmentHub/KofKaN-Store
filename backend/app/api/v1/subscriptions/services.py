"""
Email subscriptions business logic
"""
import uuid
from fastapi import HTTPException, status
from sqlmodel import Session

from app.models import EmailSubscription
from app.core.email_service import EmailService
from app.core.pg_rls_auth import (
    emailsubscription_by_email,
    emailsubscription_by_verify_token,
    newsletter_active_subscribers,
    newsletter_run_reactivate,
    newsletter_run_unsubscribe_email,
    newsletter_run_unsubscribe_token,
    newsletter_run_verify,
)

email_service = EmailService()


async def subscribe_email(session: Session, email: str, *, marketing_opt_in: bool) -> EmailSubscription:
    """Subscribe an email to the newsletter (marketing opt-in required)."""
    if not marketing_opt_in:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Marketing email consent is required to subscribe",
        )

    existing = emailsubscription_by_email(session, email.strip().lower())

    if existing:
        if existing.is_subscribed:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email is already subscribed",
            )
        updated = newsletter_run_reactivate(session, email.strip().lower())
        if not updated:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Could not reactivate subscription",
            )
        return updated

    verification_token = str(uuid.uuid4())
    em = email.strip().lower()
    subscription = EmailSubscription(
        email=em,
        verification_token=verification_token,
        verified=False,
    )

    session.add(subscription)
    session.commit()
    session.refresh(subscription)

    try:
        email_service.send_subscription_confirmation(
            em,
            verification_token,
        )
    except Exception as e:
        print(f"Failed to send subscription email: {e}")

    return subscription


async def unsubscribe_email(session: Session, email: str) -> None:
    """Unsubscribe an email from the newsletter (idempotent)."""
    newsletter_run_unsubscribe_email(session, email)


async def unsubscribe_by_token(session: Session, token: str) -> None:
    """One-click unsubscribe from email footer links."""
    if not token:
        return
    newsletter_run_unsubscribe_token(session, token)


def newsletter_recipients(session: Session) -> list[EmailSubscription]:
    """Verified and active newsletter recipients."""
    return newsletter_active_subscribers(session)


async def verify_subscription(session: Session, token: str) -> dict:
    """Verify email subscription using verification token."""

    pending = emailsubscription_by_verify_token(session, token)
    if not pending:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid verification token",
        )
    if pending.verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email is already verified",
        )

    subscription = newsletter_run_verify(session, token)
    if not subscription:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid verification token",
        )

    return {
        "message": "Email verified successfully",
        "email": subscription.email,
    }
