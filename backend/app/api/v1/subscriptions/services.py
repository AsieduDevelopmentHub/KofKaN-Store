from datetime import datetime

from sqlmodel import Session, select

from app.models import EmailSubscription


def subscribe_email(session: Session, email: str) -> EmailSubscription:
    normalized = email.strip().lower()
    existing = session.exec(select(EmailSubscription).where(EmailSubscription.email == normalized)).first()
    if existing:
        existing.is_subscribed = True
        session.add(existing)
        session.commit()
        session.refresh(existing)
        return existing

    item = EmailSubscription(email=normalized, is_subscribed=True, created_at=datetime.utcnow())
    session.add(item)
    session.commit()
    session.refresh(item)
    return item


def unsubscribe_email(session: Session, email: str) -> EmailSubscription | None:
    normalized = email.strip().lower()
    existing = session.exec(select(EmailSubscription).where(EmailSubscription.email == normalized)).first()
    if not existing:
        return None
    existing.is_subscribed = False
    session.add(existing)
    session.commit()
    session.refresh(existing)
    return existing


def list_subscriptions(session: Session) -> list[EmailSubscription]:
    return session.exec(select(EmailSubscription).order_by(EmailSubscription.created_at.desc())).all()
