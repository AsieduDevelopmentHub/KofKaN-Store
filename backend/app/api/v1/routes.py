from fastapi import APIRouter

from app.api.v1.categories.routes import router as categories_router
from app.api.v1.products.routes import router as products_router

router = APIRouter()
router.include_router(products_router)
router.include_router(categories_router)
