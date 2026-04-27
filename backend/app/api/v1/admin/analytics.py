"""
Admin analytics routes - dashboard data and business metrics
"""
from typing import Optional
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, status
from sqlalchemy import and_
from sqlmodel import Session, select, func

from app.db import get_session
from app.api.v1.auth.dependencies import require_admin_permission
from app.models import User, Order, OrderItem, Review, Product, CartItem
from app.api.v1.admin.schemas import (
    DashboardMetrics,
    TopProduct,
    RevenueStat,
)

router = APIRouter()


@router.get("/dashboard", response_model=DashboardMetrics, status_code=status.HTTP_200_OK)
async def get_dashboard_metrics(
    days: int = 30,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_admin_permission("view_analytics")),
):
    """Get dashboard metrics and analytics (cached for 5 mins)."""
    from app.core.cache import cache
    
    cache_key = f"admin:dashboard:{days}"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    # Date range
    start_date = datetime.utcnow() - timedelta(days=days)
    
    # Total metrics
    total_users = session.exec(select(func.count(User.id))).one()
    total_products = session.exec(select(func.count(Product.id))).one()
    
    # Combined order metrics (count + revenue + avg) in one go if possible, 
    # but SQLModel/SQLAlchemy select() with multiple funcs is cleaner for readability here.
    total_orders = session.exec(
        select(func.count(Order.id)).where(Order.created_at >= start_date)
    ).one()
    
    revenue_result = session.exec(
        select(func.sum(Order.total_price)).where(
            and_(Order.created_at >= start_date, Order.payment_status == "paid")
        )
    ).one()
    total_revenue = revenue_result or 0.0
    
    avg_result = session.exec(
        select(func.avg(Order.total_price)).where(
            and_(Order.created_at >= start_date, Order.payment_status == "paid")
        )
    ).one()
    avg_order_value = avg_result or 0.0

    # Active carts
    active_carts = session.exec(select(func.count(CartItem.id))).one()
    
    # TOP PRODUCTS (Optimized)
    top_rows = session.exec(
        select(OrderItem.product_id, func.sum(OrderItem.quantity))
        .join(Order, Order.id == OrderItem.order_id)
        .where(and_(Order.created_at >= start_date, Order.payment_status == "paid"))
        .group_by(OrderItem.product_id)
        .order_by(func.sum(OrderItem.quantity).desc())
        .limit(10)
    ).all()
    
    top_products = []
    if top_rows:
        product_ids = [int(r[0]) for r in top_rows]
        prods = session.exec(select(Product).where(Product.id.in_(product_ids))).all()
        prod_map = {int(p.id): p for p in prods}
        
        for pid, qty in top_rows:
            p = prod_map.get(int(pid))
            if p:
                top_products.append(TopProduct(
                    product_id=pid,
                    name=p.name,
                    price=float(p.price),
                    quantity_sold=int(qty or 0),
                    review_count=0, # Simplified for speed
                ))

    # ORDER STATUS (Optimized batch query)
    order_stats = {}
    status_counts = session.exec(
        select(Order.status, func.count(Order.id))
        .where(and_(Order.created_at >= start_date, Order.payment_status == "paid"))
        .group_by(Order.status)
    ).all()
    for s_val, count in status_counts:
        order_stats[str(s_val)] = int(count)
    
    # User metrics
    new_users = session.exec(
        select(func.count(User.id)).where(User.created_at >= start_date)
    ).one()
    active_users = session.exec(select(func.count(User.id)).where(User.is_active == True)).one()
    
    result = DashboardMetrics(
        total_users=total_users,
        active_users=active_users,
        new_users=new_users,
        total_products=total_products,
        total_orders=total_orders,
        total_revenue=total_revenue,
        active_carts=active_carts,
        avg_order_value=avg_order_value,
        order_stats=order_stats,
        top_products=top_products,
        period_days=days,
    )
    
    # Cache for 5 minutes (300 seconds)
    cache.set(cache_key, result.model_dump(), ttl=300)
    return result


@router.get("/revenue", response_model=list[RevenueStat])
async def get_revenue_stats(
    days: int = 30,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_admin_permission("view_analytics")),
):
    """Get daily revenue statistics."""
    
    start_date = datetime.utcnow() - timedelta(days=days)
    
    query = (
        select(
            func.date(Order.created_at).label("date"),
            func.count(Order.id).label("order_count"),
            func.sum(Order.total_price).label("revenue"),
        )
        .where(and_(Order.created_at >= start_date, Order.payment_status == "paid"))
        .group_by(func.date(Order.created_at))
        .order_by(func.date(Order.created_at))
    )
    
    stats = []
    for row in session.exec(query).all():
        stats.append(RevenueStat(
            date=row[0],
            order_count=row[1],
            revenue=row[2] or 0.0,
        ))
    
    return stats
