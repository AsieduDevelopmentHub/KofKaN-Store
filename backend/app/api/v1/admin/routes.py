from fastapi import APIRouter, Depends
from sqlmodel import Session, select

from app.api.v1.auth.dependencies import get_current_admin_user
from app.db import get_session
from app.models import AdminDashboardSummary, Order, Product, User

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get("/summary", response_model=AdminDashboardSummary)
def get_summary(current_user: User = Depends(get_current_admin_user), session: Session = Depends(get_session)):
    users = len(session.exec(select(User)).all())
    products = len(session.exec(select(Product)).all())
    orders = session.exec(select(Order)).all()
    open_orders = len([o for o in orders if o.status != "delivered"])
    revenue = sum(order.total_amount for order in orders)
    return AdminDashboardSummary(users=users, products=products, open_orders=open_orders, revenue=revenue)
