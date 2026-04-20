from fastapi import APIRouter, Depends
from sqlmodel import Session, select

from app.api.v1.auth.dependencies import require_admin_permission
from app.api.v1.admin.inventory import router as inventory_router
from app.api.v1.admin.orders import router as orders_router
from app.api.v1.admin.payments import router as payments_router
from app.api.v1.admin.settings import router as settings_router
from app.api.v1.admin.users import router as users_router
from app.db import get_session
from app.models import AdminDashboardSummary, Order, Product, User

router = APIRouter(prefix="/admin", tags=["Admin"])
router.include_router(users_router)
router.include_router(orders_router)
router.include_router(inventory_router)
router.include_router(payments_router)
router.include_router(settings_router)


@router.get("/summary", response_model=AdminDashboardSummary)
def get_summary(
    current_user: User = Depends(require_admin_permission("view_dashboard")),
    session: Session = Depends(get_session),
):
    users = len(session.exec(select(User)).all())
    products = len(session.exec(select(Product)).all())
    orders = session.exec(select(Order)).all()
    open_orders = len([o for o in orders if o.status != "delivered"])
    revenue = sum(order.total_amount for order in orders)
    return AdminDashboardSummary(users=users, products=products, open_orders=open_orders, revenue=revenue)
