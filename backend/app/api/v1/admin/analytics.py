from __future__ import annotations

from datetime import date, datetime, timedelta

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlmodel import Session, func, select

from app.api.v1.auth.dependencies import require_admin_permission
from app.db import get_session
from app.models import Order, OrderItem, Product, User

router = APIRouter(prefix="/analytics", tags=["Admin"])


class DashboardTopProduct(BaseModel):
    product_id: int
    name: str
    price: float
    quantity_sold: int
    review_count: int = 0


class AdminDashboardMetrics(BaseModel):
    total_users: int
    active_users: int
    new_users: int
    total_products: int
    total_orders: int
    total_revenue: float
    active_carts: int = 0
    avg_order_value: float
    order_stats: dict[str, int]
    top_products: list[DashboardTopProduct]
    period_days: int


class RevenueStat(BaseModel):
    date: str
    order_count: int
    revenue: float


def _window_start(days: int) -> datetime:
    return datetime.utcnow() - timedelta(days=max(1, min(days, 365)))


@router.get("/dashboard", response_model=AdminDashboardMetrics)
def dashboard(
    days: int = Query(default=30, ge=1, le=365),
    current_user: User = Depends(require_admin_permission("view_dashboard")),
    session: Session = Depends(get_session),
):
    _ = current_user
    since = _window_start(days)

    total_users = session.exec(select(func.count()).select_from(User)).one()
    active_users = session.exec(
        select(func.count()).select_from(User).where(User.is_active.is_(True))
    ).one()
    new_users = session.exec(
        select(func.count()).select_from(User).where(User.created_at >= since)
    ).one()
    total_products = session.exec(select(func.count()).select_from(Product)).one()

    orders = list(session.exec(select(Order).where(Order.created_at >= since)))
    total_orders = len(orders)
    total_revenue = float(sum(o.total_amount for o in orders))
    avg_order_value = float(total_revenue / total_orders) if total_orders else 0.0

    order_stats: dict[str, int] = {}
    for o in orders:
        k = (o.status or "unknown").strip().lower()
        order_stats[k] = order_stats.get(k, 0) + 1

    # Top products by quantity sold in window.
    rows = session.exec(
        select(OrderItem.product_id, func.sum(OrderItem.quantity).label("qty"))
        .join(Order, Order.id == OrderItem.order_id)
        .where(Order.created_at >= since)
        .group_by(OrderItem.product_id)
        .order_by(func.sum(OrderItem.quantity).desc())
        .limit(8)
    ).all()

    top_products: list[DashboardTopProduct] = []
    for pid, qty in rows:
        p = session.get(Product, int(pid))
        if not p:
            continue
        top_products.append(
            DashboardTopProduct(
                product_id=int(pid),
                name=p.name,
                price=float(p.price),
                quantity_sold=int(qty or 0),
                review_count=0,
            )
        )

    return AdminDashboardMetrics(
        total_users=int(total_users or 0),
        active_users=int(active_users or 0),
        new_users=int(new_users or 0),
        total_products=int(total_products or 0),
        total_orders=total_orders,
        total_revenue=total_revenue,
        active_carts=0,
        avg_order_value=avg_order_value,
        order_stats=order_stats,
        top_products=top_products,
        period_days=days,
    )


@router.get("/revenue", response_model=list[RevenueStat])
def revenue(
    days: int = Query(default=30, ge=1, le=365),
    current_user: User = Depends(require_admin_permission("view_dashboard")),
    session: Session = Depends(get_session),
):
    _ = current_user
    since = _window_start(days)

    orders = list(session.exec(select(Order).where(Order.created_at >= since)))

    # Group by UTC day in Python for SQLite compatibility.
    buckets: dict[date, RevenueStat] = {}
    for o in orders:
        d = (o.created_at or datetime.utcnow()).date()
        s = buckets.get(d)
        if not s:
            s = RevenueStat(date=d.isoformat(), order_count=0, revenue=0.0)
            buckets[d] = s
        s.order_count += 1
        s.revenue += float(o.total_amount or 0)

    # Return ascending dates.
    return [buckets[d] for d in sorted(buckets.keys())]

