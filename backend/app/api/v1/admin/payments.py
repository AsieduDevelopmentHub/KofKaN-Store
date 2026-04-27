"""Admin: Paystack transaction audit list."""
from typing import List

from fastapi import APIRouter, Depends, Query
from sqlmodel import Session, select

from app.api.v1.admin.schemas import PaystackTransactionRead
from app.api.v1.auth.dependencies import require_admin_permission
from app.db import get_session
from app.models import PaystackTransaction, User

router = APIRouter()


@router.get("/transactions", response_model=List[PaystackTransactionRead])
async def list_paystack_transactions(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    status: str | None = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_admin_permission("view_payments")),
):
    stmt = select(PaystackTransaction).order_by(PaystackTransaction.created_at.desc())
    if status:
        stmt = stmt.where(PaystackTransaction.status == status)
    rows = session.exec(stmt.offset(skip).limit(limit)).all()
    return [PaystackTransactionRead.model_validate(r) for r in rows]
