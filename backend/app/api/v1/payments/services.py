from __future__ import annotations

import hashlib
import hmac
from datetime import datetime
from uuid import uuid4

from fastapi import HTTPException, status
from sqlmodel import Session, select

from app.core.config import settings
from app.models import Order, PaymentIntent, PaymentWebhookEvent, User


ALLOWED_STATUS_TRANSITIONS = {
    "initialized": {"pending", "failed", "abandoned", "paid"},
    "pending": {"failed", "abandoned", "paid"},
    "failed": set(),
    "abandoned": set(),
    "paid": {"refunded"},
    "refunded": set(),
}


def initialize_payment_for_order(session: Session, user: User, order_id: int) -> PaymentIntent:
    order = session.get(Order, order_id)
    if not order or order.user_id != user.id:
        raise HTTPException(status_code=404, detail="Order not found")

    existing = session.exec(
        select(PaymentIntent).where(PaymentIntent.order_id == order.id, PaymentIntent.status.in_(["initialized", "pending"]))
    ).first()
    if existing:
        return existing

    reference = f"KOFKAN-{uuid4().hex[:14].upper()}"
    intent = PaymentIntent(
        user_id=user.id or 0,
        order_id=order.id,
        reference=reference,
        amount=order.total_amount,
        currency="GHS",
        status="initialized",
        provider="paystack",
        created_at=datetime.utcnow(),
    )
    session.add(intent)
    session.commit()
    session.refresh(intent)
    return intent


def get_payment_by_reference(session: Session, user: User, reference: str) -> PaymentIntent:
    intent = session.exec(select(PaymentIntent).where(PaymentIntent.reference == reference)).first()
    if not intent or intent.user_id != user.id:
        raise HTTPException(status_code=404, detail="Payment not found")
    return intent


def _translate_status(provider_status: str) -> str:
    mapping = {
        "success": "paid",
        "failed": "failed",
        "abandoned": "abandoned",
        "pending": "pending",
        "refunded": "refunded",
    }
    return mapping.get(provider_status.lower(), "pending")


def _can_transition(current: str, target: str) -> bool:
    if current == target:
        return True
    return target in ALLOWED_STATUS_TRANSITIONS.get(current, set())


def _apply_payment_status_update(session: Session, intent: PaymentIntent, next_status: str) -> PaymentIntent:
    current_status = intent.status.strip().lower()
    target_status = next_status.strip().lower()
    if not _can_transition(current_status, target_status):
        return intent

    intent.status = target_status
    session.add(intent)

    if intent.order_id:
        order = session.get(Order, intent.order_id)
        if order:
            if target_status == "paid":
                order.status = "paid"
            elif target_status in {"failed", "abandoned"}:
                order.status = "payment_failed"
            elif target_status == "refunded":
                order.status = "refunded"
            session.add(order)
    return intent


def update_payment_status_by_reference(session: Session, reference: str, next_status: str) -> PaymentIntent:
    intent = session.exec(select(PaymentIntent).where(PaymentIntent.reference == reference)).first()
    if not intent:
        raise HTTPException(status_code=404, detail="Payment reference not found")
    _apply_payment_status_update(session=session, intent=intent, next_status=next_status)
    session.commit()
    session.refresh(intent)
    return intent


def apply_webhook_status(
    session: Session,
    reference: str,
    provider_status: str,
    provider: str,
    event_key: str,
    provider_event_id: str | None = None,
) -> PaymentIntent:
    existing_event = session.exec(select(PaymentWebhookEvent).where(PaymentWebhookEvent.event_key == event_key)).first()
    if existing_event and existing_event.processed:
        intent = session.exec(select(PaymentIntent).where(PaymentIntent.reference == reference)).first()
        if not intent:
            raise HTTPException(status_code=404, detail="Payment reference not found")
        return intent

    event = existing_event or PaymentWebhookEvent(
        event_key=event_key,
        reference=reference,
        provider=provider,
        provider_event_id=provider_event_id,
        status=_translate_status(provider_status),
        processed=False,
    )
    if existing_event:
        event.status = _translate_status(provider_status)
        event.provider_event_id = provider_event_id
    session.add(event)

    intent = session.exec(select(PaymentIntent).where(PaymentIntent.reference == reference)).first()
    if not intent:
        raise HTTPException(status_code=404, detail="Payment reference not found")
    _apply_payment_status_update(session=session, intent=intent, next_status=_translate_status(provider_status))
    event.processed = True
    session.add(event)
    session.commit()
    session.refresh(intent)
    return intent


def verify_webhook_signature(raw_body: bytes, provided_signature: str | None) -> str:
    secret = settings.paystack_webhook_secret.strip()
    if not secret:
        raise HTTPException(status_code=500, detail="Webhook secret not configured")
    if not provided_signature:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing webhook signature")

    digest = hmac.new(secret.encode("utf-8"), raw_body, hashlib.sha512).hexdigest()
    if not hmac.compare_digest(digest, provided_signature.strip()):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid webhook signature")
    return digest
