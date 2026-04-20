from fastapi import APIRouter, Depends, Header, Request
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
    verify_webhook_signature,
)

router = APIRouter(prefix="/payments", tags=["Payments"])


@router.post("/initialize")
def initialize_payment(
    payload: PaymentInitializeRequest,
    current_user: User = Depends(get_current_active_user),
    session: Session = Depends(get_session),
) -> PaymentInitializeResponse:
    intent = initialize_payment_for_order(session=session, user=current_user, order_id=payload.order_id)
    return PaymentInitializeResponse(
        reference=intent.reference,
        authorization_url=f"https://pay.example/checkout/{intent.reference}",
        amount=intent.amount,
        currency=intent.currency,
        status=intent.status,
    )


@router.get("/verify/{reference}", response_model=PaymentStatusResponse)
def verify_payment(reference: str, current_user: User = Depends(get_current_active_user), session: Session = Depends(get_session)):
    intent = get_payment_by_reference(session=session, user=current_user, reference=reference)
    return PaymentStatusResponse(
        reference=intent.reference,
        status=intent.status,
        amount=intent.amount,
        currency=intent.currency,
        provider=intent.provider,
        updated_at=intent.created_at,
    )


@router.post("/webhook", response_model=PaymentStatusResponse)
async def payment_webhook(
    payload: PaymentWebhookPayload,
    request: Request,
    x_paystack_signature: str | None = Header(default=None),
    session: Session = Depends(get_session),
):
    raw_body = await request.body()
    verify_webhook_signature(raw_body=raw_body, provided_signature=x_paystack_signature)
    intent = apply_webhook_status(session=session, reference=payload.reference, provider_status=payload.status)
    return PaymentStatusResponse(
        reference=intent.reference,
        status=intent.status,
        amount=intent.amount,
        currency=intent.currency,
        provider=intent.provider,
        updated_at=intent.created_at,
    )
