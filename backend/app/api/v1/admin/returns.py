"""Admin: returns queue."""
from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlmodel import Session

from app.api.v1.auth.dependencies import require_admin_permission
from app.db import get_session
from app.models import User
from app.api.v1.returns.schemas import OrderReturnRead, OrderReturnStatusUpdate
from app.api.v1.returns.services import (
    get_return_admin,
    list_returns_admin,
    update_return_status_admin,
)

router = APIRouter()


@router.get("/", response_model=List[OrderReturnRead])
async def list_returns(
    status: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    session: Session = Depends(get_session),
    current_user: User = Depends(require_admin_permission("manage_orders")),
):
    return await list_returns_admin(
        session, status_filter=status, skip=skip, limit=limit
    )


@router.get("/{return_id}", response_model=OrderReturnRead)
async def get_return(
    return_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_admin_permission("manage_orders")),
):
    return await get_return_admin(session, return_id)


@router.patch("/{return_id}/status", response_model=OrderReturnRead)
async def update_return_status(
    return_id: int,
    payload: OrderReturnStatusUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_admin_permission("manage_orders")),
):
    return await update_return_status_admin(
        session, return_id=return_id, admin=current_user, payload=payload
    )
