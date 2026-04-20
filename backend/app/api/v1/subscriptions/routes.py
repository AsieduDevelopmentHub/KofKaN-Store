from datetime import datetime

from fastapi import APIRouter, Depends
from sqlmodel import Session, select

from app.api.v1.auth.dependencies import require_admin_permission
from app.db import get_session
from app.models import EmailSubscription, User

router = APIRouter(prefix="/subscriptions", tags=["Subscriptions"])


@router.post("/newsletter/subscribe")
def subscribe_newsletter(payload: dict, session: Session = Depends(get_session)):
    email = str(payload.get("email", "")).strip().lower()
    if not email:
        return {"message": "Email is required"}
    existing = session.exec(select(EmailSubscription).where(EmailSubscription.email == email)).first()
    if existing:
        existing.is_subscribed = True
        session.add(existing)
    else:
        session.add(EmailSubscription(email=email, is_subscribed=True, created_at=datetime.utcnow()))
    session.commit()
    return {"message": "Subscribed successfully", "email": email}


@router.post("/newsletter/unsubscribe")
def unsubscribe_newsletter(payload: dict, session: Session = Depends(get_session)):
    email = str(payload.get("email", "")).strip().lower()
    existing = session.exec(select(EmailSubscription).where(EmailSubscription.email == email)).first()
    if existing:
        existing.is_subscribed = False
        session.add(existing)
        session.commit()
    return {"message": "Unsubscribed successfully", "email": email}


@router.get("/newsletter")
def list_newsletter_subscriptions(
    current_user: User = Depends(require_admin_permission("manage_newsletter")),
    session: Session = Depends(get_session),
):
    items = session.exec(select(EmailSubscription).order_by(EmailSubscription.created_at.desc())).all()
    return items
