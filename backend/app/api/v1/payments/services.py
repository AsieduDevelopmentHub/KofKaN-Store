from __future__ import annotations

import hashlib
import hmac
from datetime import datetime
from uuid import uuid4

from fastapi import HTTPException, status
from sqlmodel import Session, select

from app.core.config import settings
from app.models import Order, PaymentIntent, User


TERMINAL_STATUSES = {"paid", "refunded"}


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


def apply_webhook_status(session: Session, reference: str, provider_status: str) -> PaymentIntent:
    intent = session.exec(select(PaymentIntent).where(PaymentIntent.reference == reference)).first()
    if not intent:
        raise HTTPException(status_code=404, detail="Payment reference not found")

    if intent.status in TERMINAL_STATUSES:
        return intent

    normalized = _translate_status(provider_status)
    intent.status = normalized
    session.add(intent)

    if intent.order_id:
        order = session.get(Order, intent.order_id)
        if order:
            if normalized == "paid":
                order.status = "paid"
            elif normalized in {"failed", "abandoned"}:
                order.status = "payment_failed"
            session.add(order)

    session.commit()
    session.refresh(intent)
    return intent


def verify_webhook_signature(raw_body: bytes, provided_signature: str | None) -> None:
    secret = settings.paystack_webhook_secret.strip()
    if not secret:
        raise HTTPException(status_code=500, detail="Webhook secret not configured")
    if not provided_signature:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing webhook signature")

    digest = hmac.new(secret.encode("utf-8"), raw_body, hashlib.sha512).hexdigest()
    if not hmac.compare_digest(digest, provided_signature.strip()):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid webhook signature")
