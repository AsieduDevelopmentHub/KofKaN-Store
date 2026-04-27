"""
Products API routes - public endpoints for browsing products
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Request, status, Query
from sqlmodel import Session

from app.db import get_session
from app.api.v1.auth.dependencies import get_current_active_user_optional
from app.api.v1.products.schemas import (
    ProductRead,
    ProductSearchResponse,
    CategoryRead,
)
from app.api.v1.products.services import (
    get_products_with_filters,
    get_product_by_id,
    get_product_by_slug,
    search_products,
    get_all_categories,
    get_category_by_id,
)
from app.core.search_analytics import log_search
from app.models import User

router = APIRouter()


@router.get("/search", response_model=ProductSearchResponse)
async def search_products_endpoint(
    request: Request,
    q: str = Query(..., min_length=1, max_length=100),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    session: Session = Depends(get_session),
    current_user: Optional[User] = Depends(get_current_active_user_optional),
):
    """Search products by name, description, or SKU. Logs the query (fire-and-forget)."""
    result = await search_products(session, q, skip, limit)
    # Only log the first page to avoid inflating analytics with paginated scans.
    if skip == 0:
        client_ip = request.client.host if request.client else None
        log_search(
            session,
            query=q,
            result_count=result.total,
            user_id=current_user.id if current_user else None,
            ip=client_ip,
        )
    return result


@router.get("/categories", response_model=List[CategoryRead])
async def list_categories(
    session: Session = Depends(get_session),
):
    """Get all product categories."""
    return await get_all_categories(session)


@router.get("/categories/{category_id}", response_model=CategoryRead)
async def get_category(
    category_id: int,
    session: Session = Depends(get_session),
):
    """Get category by ID."""
    return await get_category_by_id(session, category_id)


@router.get("/", response_model=ProductSearchResponse)
async def list_products(
    category_id: Optional[int] = Query(None),
    min_price: Optional[float] = Query(None, ge=0),
    max_price: Optional[float] = Query(None, ge=0),
    min_rating: Optional[float] = Query(None, ge=0, le=5),
    sort_by: str = Query("created_at", pattern="^(name|price|rating|created_at|sales|random)$"),
    sort_order: str = Query("desc", pattern="^(asc|desc)$"),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    session: Session = Depends(get_session),
):
    """
    Get products with advanced filtering and sorting.
    
    Query parameters:
    - category_id: Filter by category
    - min_price: Minimum price filter
    - max_price: Maximum price filter
    - min_rating: Minimum average rating (0-5)
    - sort_by: Sort by name, price, rating, created_at, or sales
    - sort_order: asc or desc
    - skip: Pagination offset
    - limit: Pagination limit (max 100)
    """
    return await get_products_with_filters(
        session=session,
        category_id=category_id,
        min_price=min_price,
        max_price=max_price,
        min_rating=min_rating,
        sort_by=sort_by,
        sort_order=sort_order,
        skip=skip,
        limit=limit,
    )


@router.get("/{product_id}", response_model=ProductRead)
async def get_product(
    product_id: int,
    session: Session = Depends(get_session),
):
    """Get product by ID."""
    return await get_product_by_id(session, product_id)


@router.get("/slug/{slug}", response_model=ProductRead)
async def get_product_by_slug_endpoint(
    slug: str,
    session: Session = Depends(get_session),
):
    """Get product by slug."""
    return await get_product_by_slug(session, slug)


@router.get("/{product_id}/images")
async def list_product_images_public(
    product_id: int,
    session: Session = Depends(get_session),
):
    """Public: list gallery images for a product (for storefront carousel)."""
    from sqlmodel import select as _select
    from app.models import ProductImage as _PI

    rows = list(
        session.exec(
            _select(_PI)
            .where(_PI.product_id == product_id)
            .order_by(_PI.sort_order.asc(), _PI.id.asc())
        ).all()
    )
    return [
        {
            "id": img.id,
            "product_id": img.product_id,
            "image_url": img.image_url,
            "alt_text": img.alt_text,
            "is_primary": img.is_primary,
            "sort_order": img.sort_order,
        }
        for img in rows
    ]


@router.get("/{product_id}/variants")
async def list_product_variants_public(
    product_id: int,
    session: Session = Depends(get_session),
):
    """Public: list active variants for a product (for display on PDP)."""
    from sqlmodel import select as _select
    from app.models import ProductVariant as _PV
    import json as _json

    rows = list(
        session.exec(
            _select(_PV)
            .where(_PV.product_id == product_id, _PV.is_active == True)
            .order_by(_PV.sort_order.asc(), _PV.id.asc())
        ).all()
    )
    out = []
    for v in rows:
        attrs = None
        if v.attributes:
            try:
                parsed = _json.loads(v.attributes)
                if isinstance(parsed, dict):
                    attrs = parsed
            except Exception:
                attrs = None
        out.append(
            {
                "id": v.id,
                "product_id": v.product_id,
                "name": v.name,
                "sku": v.sku,
                "attributes": attrs,
                "price_delta": v.price_delta,
                "in_stock": v.in_stock,
                "image_url": getattr(v, "image_url", None),
                "description": getattr(v, "description", None),
            }
        )
    return out