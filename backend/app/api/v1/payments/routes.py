import os
from typing import Any

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from sqlmodel import Session

from app.api.v1.auth.dependencies import get_current_active_user
from app.db import get_session
from app.models import User
from app.api.v1.payments.schemas import (
    PaymentInitializeRequest,
    PaymentInitializeResponse,
    PaymentStatusResponse,
    PaymentWebhookPayload,
)
from app.api.v1.payments.services import (
    apply_webhook_status,
    get_payment_by_reference,
    initialize_payment_for_order,
    update_payment_status_by_reference,
    verify_webhook_signature,
)
from app.core.config import settings
from app.core.paystack_client import initialize_transaction, is_configured, money_to_subunit, verify_transaction

router = APIRouter(prefix="/payments", tags=["Payments"])


@router.post("/paystack/initialize")
@router.post("/initialize")
def initialize_payment(
    payload: PaymentInitializeRequest,
    current_user: User = Depends(get_current_active_user),
    session: Session = Depends(get_session),
) -> PaymentInitializeResponse:
    intent = initialize_payment_for_order(session=session, user=current_user, order_id=payload.order_id)
    cb = (payload.callback_url or settings.frontend_base_url).strip() or settings.frontend_base_url

    if not is_configured():
        raise HTTPException(status_code=500, detail="Paystack is not configured (missing PAYSTACK_SECRET_KEY)")

    email = (current_user.email or "").strip() or f"user-{current_user.id}@kofkan.store"
    currency = (os.getenv("PAYSTACK_CURRENCY", "") or intent.currency or "GHS").strip().upper()
    ps = initialize_transaction(
        email=email,
        amount_subunit=money_to_subunit(intent.amount),
        reference=intent.reference,
        callback_url=f"{cb.rstrip('/')}/checkout/success?order={payload.order_id}",
        currency=currency,
        metadata={"order_id": payload.order_id, "user_id": current_user.id},
    )
    data: dict[str, Any] = ps.get("data") or {}

    return PaymentInitializeResponse(
        reference=str(data.get("reference") or intent.reference),
        authorization_url=str(data.get("authorization_url") or ""),
        access_code=str(data.get("access_code") or ""),
        public_key=(os.getenv("PAYSTACK_PUBLIC_KEY", "") or None),
        amount=float(intent.amount),
        currency=currency,
        status=str(intent.status),
    )


@router.get("/paystack/verify/{reference}", response_model=PaymentStatusResponse)
@router.get("/verify/{reference}", response_model=PaymentStatusResponse)
def verify_payment(reference: str, current_user: User = Depends(get_current_active_user), session: Session = Depends(get_session)):
    intent = get_payment_by_reference(session=session, user=current_user, reference=reference)
    if not is_configured():
        raise HTTPException(status_code=500, detail="Paystack is not configured (missing PAYSTACK_SECRET_KEY)")

    ps = verify_transaction(reference=intent.reference)
    data: dict[str, Any] = ps.get("data") or {}
    provider_status = str(data.get("status") or "pending")
    update_payment_status_by_reference(session=session, reference=intent.reference, next_status=provider_status)
    intent = get_payment_by_reference(session=session, user=current_user, reference=reference)
    return PaymentStatusResponse(
        reference=intent.reference,
        status=provider_status,
        amount=intent.amount,
        currency=(data.get("currency") or intent.currency),
        provider=intent.provider,
        updated_at=intent.created_at,
    )


@router.post("/paystack/webhook", response_model=PaymentStatusResponse)
@router.post("/webhook", response_model=PaymentStatusResponse)
async def payment_webhook(
    payload: PaymentWebhookPayload,
    request: Request,
    x_paystack_signature: str | None = Header(default=None),
    session: Session = Depends(get_session),
):
    raw_body = await request.body()
    digest = verify_webhook_signature(raw_body=raw_body, provided_signature=x_paystack_signature)
    event_key = f"{payload.provider}:{payload.event_id or digest}"
    intent = apply_webhook_status(
        session=session,
        reference=payload.reference,
        provider_status=payload.status,
        provider=payload.provider,
        event_key=event_key,
        provider_event_id=payload.event_id,
    )
    return PaymentStatusResponse(
        reference=intent.reference,
        status=intent.status,
        amount=intent.amount,
        currency=intent.currency,
        provider=intent.provider,
        updated_at=intent.created_at,
    )
