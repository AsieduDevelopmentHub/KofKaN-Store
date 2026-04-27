from fastapi import APIRouter

from app.api.v1.auth.routes import router as auth_router
from app.api.v1.products.routes import router as products_router
from app.api.v1.cart.routes import router as cart_router
from app.api.v1.orders.routes import router as orders_router
from app.api.v1.reviews.routes import router as reviews_router
from app.api.v1.admin.routes import router as admin_router
from app.api.v1.subscriptions.routes import router as subscriptions_router
from app.api.v1.payments.routes import router as payments_router
from app.api.v1.wishlist.routes import router as wishlist_router
from app.api.v1.returns.routes import router as returns_router

router = APIRouter()

router.include_router(auth_router, prefix="/auth", tags=["auth"])
router.include_router(products_router, prefix="/products", tags=["products"])
router.include_router(cart_router, prefix="/cart", tags=["cart"])
router.include_router(orders_router, prefix="/orders", tags=["orders"])
router.include_router(reviews_router, prefix="/reviews", tags=["reviews"])
router.include_router(admin_router, tags=["Admin"])
router.include_router(subscriptions_router, prefix="/subscriptions", tags=["subscriptions"])
router.include_router(payments_router, prefix="/payments", tags=["payments"])
router.include_router(wishlist_router, prefix="/wishlist", tags=["wishlist"])
# Returns: customer-facing endpoints are mounted at the root of /api/v1 because
# routes span both /orders/{id}/returns and /returns/* (see returns/routes.py).
router.include_router(returns_router, tags=["returns"])