from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlmodel import Session, select

from app.api.v1.auth.dependencies import require_admin_permission
from app.api.v1.payments.services import update_payment_status_by_reference
from app.db import get_session
from app.models import PaymentIntent, User

router = APIRouter(prefix="/payments", tags=["Admin"])


class AdminPaymentStatusUpdateRequest(BaseModel):
    status: str = Field(min_length=3, max_length=32)


@router.get("")
def list_payments(
    current_user: User = Depends(require_admin_permission("manage_orders")),
    session: Session = Depends(get_session),
):
    _ = current_user
    return session.exec(select(PaymentIntent).order_by(PaymentIntent.created_at.desc())).all()


@router.patch("/{reference}/status")
def update_payment_status(
    reference: str,
    payload: AdminPaymentStatusUpdateRequest,
    current_user: User = Depends(require_admin_permission("manage_orders")),
    session: Session = Depends(get_session),
):
    _ = current_user
    return update_payment_status_by_reference(session=session, reference=reference, next_status=payload.status)
