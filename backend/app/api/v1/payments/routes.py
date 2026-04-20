from datetime import datetime
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.api.v1.auth.dependencies import get_current_active_user
from app.db import get_session
from app.models import Order, PaymentIntent, User

router = APIRouter(prefix="/payments", tags=["Payments"])


@router.post("/initialize")
def initialize_payment(
    payload: dict,
    current_user: User = Depends(get_current_active_user),
    session: Session = Depends(get_session),
):
    order_id = int(payload.get("order_id", 0))
    order = session.get(Order, order_id)
    if not order or order.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Order not found")

    reference = f"KOFKAN-{uuid4().hex[:14].upper()}"
    intent = PaymentIntent(
        user_id=current_user.id or 0,
        order_id=order.id,
        reference=reference,
        amount=order.total_amount,
        currency="GHS",
        status="initialized",
        created_at=datetime.utcnow(),
    )
    session.add(intent)
    session.commit()
    return {
        "reference": reference,
        "authorization_url": f"https://pay.example/checkout/{reference}",
        "amount": order.total_amount,
        "currency": "GHS",
    }


@router.get("/verify/{reference}")
def verify_payment(reference: str, current_user: User = Depends(get_current_active_user), session: Session = Depends(get_session)):
    intent = session.exec(select(PaymentIntent).where(PaymentIntent.reference == reference)).first()
    if not intent or intent.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Payment not found")
    return {
        "reference": intent.reference,
        "status": intent.status,
        "amount": intent.amount,
        "currency": intent.currency,
    }
