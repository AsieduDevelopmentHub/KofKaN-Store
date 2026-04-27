"""
Admin API routes - main router
"""
from fastapi import APIRouter

from app.api.v1.admin.analytics import router as analytics_router
from app.api.v1.admin.users import router as users_router
from app.api.v1.admin.products import router as products_router
from app.api.v1.admin.orders import router as orders_router
from app.api.v1.admin.categories import router as categories_router
from app.api.v1.admin.payments import router as payments_router
from app.api.v1.admin.reviews import router as reviews_router
from app.api.v1.admin.inventory import router as inventory_router
from app.api.v1.admin.coupons import router as coupons_router
from app.api.v1.admin.settings import router as settings_router
from app.api.v1.admin.returns import router as returns_admin_router
from app.api.v1.admin.search_analytics import router as search_analytics_router
from app.api.v1.admin.variants import router as variants_router
from app.api.v1.admin.product_images import router as product_images_router

router = APIRouter(prefix="/admin")

# All admin endpoints grouped under single "Admin" tag for cleaner Swagger UI
router.include_router(analytics_router, prefix="/analytics")
router.include_router(users_router, prefix="/users")
router.include_router(products_router, prefix="/products")
router.include_router(categories_router, prefix="/categories")
router.include_router(orders_router, prefix="/orders")
router.include_router(payments_router, prefix="/payments")
router.include_router(reviews_router, prefix="/reviews")
router.include_router(inventory_router, prefix="/inventory")
router.include_router(coupons_router, prefix="/coupons")
router.include_router(settings_router, prefix="/settings")
router.include_router(returns_admin_router, prefix="/returns")
router.include_router(search_analytics_router, prefix="/search-analytics")
router.include_router(variants_router, prefix="/variants")
# Product image gallery (multi-image uploads). Nested under /admin/products/{id}/images
# but registered as a sibling router so it doesn't conflict with core CRUD.
router.include_router(product_images_router, prefix="/products")
