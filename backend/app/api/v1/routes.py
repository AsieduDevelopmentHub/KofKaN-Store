from fastapi import APIRouter

from app.api.v1.admin.routes import router as admin_router
from app.api.v1.auth.routes import router as auth_router
from app.api.v1.cart.routes import router as cart_router
from app.api.v1.categories.routes import router as categories_router
from app.api.v1.orders.routes import router as orders_router
from app.api.v1.payments.routes import router as payments_router
from app.api.v1.products.routes import router as products_router
from app.api.v1.reviews.routes import router as reviews_router
from app.api.v1.returns.routes import router as returns_router
from app.api.v1.subscriptions.routes import router as subscriptions_router
from app.api.v1.wishlist.routes import router as wishlist_router

router = APIRouter()
router.include_router(auth_router)
router.include_router(products_router)
router.include_router(categories_router)
router.include_router(cart_router)
router.include_router(orders_router)
router.include_router(payments_router)
router.include_router(subscriptions_router)
router.include_router(wishlist_router)
router.include_router(reviews_router)
router.include_router(returns_router)
router.include_router(admin_router)
