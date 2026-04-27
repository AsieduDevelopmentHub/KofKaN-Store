"""
Customer-facing returns API.

- POST   /orders/{order_id}/returns     -> create a return request
- GET    /orders/{order_id}/returns     -> list returns for that order
- GET    /returns/                      -> current user's returns
- GET    /returns/{return_id}           -> single return
- DELETE /returns/{return_id}           -> cancel a pending/approved return
"""
from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, Depends, Query, status
from sqlmodel import Session

from app.api.v1.auth.dependencies import get_current_active_user
from app.db import get_session
from app.models import User
from app.api.v1.returns.schemas import OrderReturnCreate, OrderReturnRead
from app.api.v1.returns.services import (
    cancel_my_return,
    create_return,
    get_my_return,
    list_my_returns,
)

router = APIRouter()


@router.post(
    "/orders/{order_id}/returns",
    response_model=OrderReturnRead,
    status_code=status.HTTP_201_CREATED,
    tags=["returns"],
)
async def create_order_return(
    order_id: int,
    data: OrderReturnCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user),
):
    return await create_return(session, user=current_user, order_id=order_id, data=data)


@router.get(
    "/orders/{order_id}/returns",
    response_model=List[OrderReturnRead],
    tags=["returns"],
)
async def list_returns_for_order(
    order_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user),
):
    return await list_my_returns(session, user=current_user, order_id=order_id)


@router.get("/returns/", response_model=List[OrderReturnRead], tags=["returns"])
async def list_my_returns_endpoint(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user),
):
    return await list_my_returns(session, user=current_user, skip=skip, limit=limit)


@router.get("/returns/{return_id}", response_model=OrderReturnRead, tags=["returns"])
async def get_my_return_endpoint(
    return_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user),
):
    return await get_my_return(session, user=current_user, return_id=return_id)


@router.delete("/returns/{return_id}", response_model=OrderReturnRead, tags=["returns"])
async def cancel_my_return_endpoint(
    return_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user),
):
    return await cancel_my_return(session, user=current_user, return_id=return_id)
