"""
Business logic for returns.
"""
from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from fastapi import HTTPException, status
from sqlmodel import Session, select

from app.models import Order, OrderItem, OrderReturn, OrderReturnItem, User
from app.api.v1.returns.schemas import (
    OrderReturnCreate,
    OrderReturnItemRead,
    OrderReturnRead,
    OrderReturnStatusUpdate,
)


def _load_items(session: Session, return_id: int) -> List[OrderReturnItem]:
    return list(
        session.exec(
            select(OrderReturnItem)
            .where(OrderReturnItem.return_id == return_id)
            .order_by(OrderReturnItem.id.asc())
        ).all()
    )


def _to_read(session: Session, ret: OrderReturn) -> OrderReturnRead:
    items = _load_items(session, ret.id)
    return OrderReturnRead(
        id=ret.id,
        order_id=ret.order_id,
        user_id=ret.user_id,
        reason=ret.reason,
        details=ret.details,
        preferred_outcome=ret.preferred_outcome,
        status=ret.status,
        admin_notes=ret.admin_notes,
        resolved_by=ret.resolved_by,
        resolved_at=ret.resolved_at,
        created_at=ret.created_at,
        updated_at=ret.updated_at,
        items=[OrderReturnItemRead.model_validate(x) for x in items],
    )


async def create_return(
    session: Session,
    *,
    user: User,
    order_id: int,
    data: OrderReturnCreate,
) -> OrderReturnRead:
    order = session.get(Order, order_id)
    if not order or order.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

    # Validate line items belong to the order and quantities don't exceed original
    allowed: dict[int, int] = {}
    for it in session.exec(select(OrderItem).where(OrderItem.order_id == order_id)).all():
        allowed[int(it.id)] = int(it.quantity)
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This order has no items to return.",
        )

    seen: set[int] = set()
    for line in data.items:
        if line.order_item_id in seen:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Duplicate order-item in return request.",
            )
        seen.add(line.order_item_id)
        max_qty = allowed.get(line.order_item_id)
        if max_qty is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Order item {line.order_item_id} is not part of this order.",
            )
        if line.quantity > max_qty:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Return quantity for item {line.order_item_id} exceeds original purchase."
                ),
            )

    now = datetime.utcnow()
    ret = OrderReturn(
        order_id=order_id,
        user_id=user.id,
        reason=data.reason,
        details=data.details,
        preferred_outcome=data.preferred_outcome,
        status="pending",
        created_at=now,
        updated_at=now,
    )
    session.add(ret)
    session.commit()
    session.refresh(ret)

    for line in data.items:
        session.add(
            OrderReturnItem(
                return_id=ret.id,
                order_item_id=line.order_item_id,
                quantity=line.quantity,
                created_at=now,
            )
        )
    session.commit()
    session.refresh(ret)
    return _to_read(session, ret)


async def list_my_returns(
    session: Session,
    *,
    user: User,
    order_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 50,
) -> List[OrderReturnRead]:
    stmt = select(OrderReturn).where(OrderReturn.user_id == user.id)
    if order_id is not None:
        stmt = stmt.where(OrderReturn.order_id == order_id)
    stmt = stmt.order_by(OrderReturn.created_at.desc()).offset(skip).limit(limit)
    rows = list(session.exec(stmt).all())
    return [_to_read(session, r) for r in rows]


async def get_my_return(session: Session, *, user: User, return_id: int) -> OrderReturnRead:
    ret = session.get(OrderReturn, return_id)
    if not ret or ret.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Return not found")
    return _to_read(session, ret)


async def cancel_my_return(session: Session, *, user: User, return_id: int) -> OrderReturnRead:
    ret = session.get(OrderReturn, return_id)
    if not ret or ret.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Return not found")
    if ret.status not in {"pending", "approved"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only pending or approved returns can be cancelled.",
        )
    ret.status = "cancelled"
    ret.updated_at = datetime.utcnow()
    session.add(ret)
    session.commit()
    session.refresh(ret)
    return _to_read(session, ret)


# ---- Admin ----

async def list_returns_admin(
    session: Session,
    *,
    status_filter: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
) -> List[OrderReturnRead]:
    stmt = select(OrderReturn)
    if status_filter:
        stmt = stmt.where(OrderReturn.status == status_filter)
    stmt = stmt.order_by(OrderReturn.created_at.desc()).offset(skip).limit(limit)
    rows = list(session.exec(stmt).all())
    return [_to_read(session, r) for r in rows]


async def get_return_admin(session: Session, return_id: int) -> OrderReturnRead:
    ret = session.get(OrderReturn, return_id)
    if not ret:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Return not found")
    return _to_read(session, ret)


async def update_return_status_admin(
    session: Session,
    *,
    return_id: int,
    admin: User,
    payload: OrderReturnStatusUpdate,
) -> OrderReturnRead:
    ret = session.get(OrderReturn, return_id)
    if not ret:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Return not found")

    ret.status = payload.status
    if payload.admin_notes is not None:
        ret.admin_notes = payload.admin_notes
    ret.updated_at = datetime.utcnow()
    if payload.status in {"refunded", "rejected", "received"}:
        ret.resolved_by = admin.id
        ret.resolved_at = datetime.utcnow()
    else:
        # leave resolved_* untouched if reopened
        pass
    session.add(ret)
    session.commit()
    session.refresh(ret)
    return _to_read(session, ret)
