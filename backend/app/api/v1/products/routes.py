from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, func, select

from app.api.v1.products.services import get_product_by_id, list_products
from app.db import get_session
from app.models import Category, Product, ProductRead

router = APIRouter(prefix="/products", tags=["Products"])

SortBy = Literal["created_at", "price", "name"]
SortOrder = Literal["asc", "desc"]


def _apply_filters(
    statement,
    *,
    search: str | None,
    category_id: int | None,
    category_slug: str | None,
    featured_only: bool,
    session: Session,
):
    statement = statement.where(Product.is_active.is_(True))
    if search:
        normalized = f"%{search.lower()}%"
        statement = statement.where(Product.name.ilike(normalized))
    if category_id is not None:
        statement = statement.where(Product.category_id == category_id)
    elif category_slug:
        cat = session.exec(select(Category).where(Category.slug == category_slug)).first()
        if cat:
            statement = statement.where(Product.category_id == cat.id)
        else:
            statement = statement.where(Product.id == -1)  # force empty
    if featured_only:
        statement = statement.where(Product.is_featured.is_(True))
    return statement


@router.get("/categories")
def list_product_categories(session: Session = Depends(get_session)):
    """Frontend alias for `/categories` so the storefront can fetch from the same prefix."""
    statement = (
        select(Category)
        .where(Category.is_active.is_(True))
        .order_by(Category.sort_order.asc(), Category.name.asc())
    )
    return list(session.exec(statement))


@router.get("/")
def list_products_paginated(
    search: str | None = Query(default=None, min_length=1, max_length=120),
    category_id: int | None = None,
    category_slug: str | None = None,
    featured_only: bool = False,
    sort_by: SortBy = "created_at",
    sort_order: SortOrder = "desc",
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    session: Session = Depends(get_session),
):
    """Paginated product list — `{ total, skip, limit, items }`."""
    base = _apply_filters(
        select(Product),
        search=search,
        category_id=category_id,
        category_slug=category_slug,
        featured_only=featured_only,
        session=session,
    )

    total_stmt = _apply_filters(
        select(func.count()).select_from(Product),
        search=search,
        category_id=category_id,
        category_slug=category_slug,
        featured_only=featured_only,
        session=session,
    )
    total = session.exec(total_stmt).one()
    if isinstance(total, tuple):
        total = total[0]

    sort_col_map = {
        "created_at": Product.created_at,
        "price": Product.price,
        "name": Product.name,
    }
    column = sort_col_map.get(sort_by, Product.created_at)
    ordered = base.order_by(column.desc() if sort_order == "desc" else column.asc())
    items = list(session.exec(ordered.offset(skip).limit(limit)))
    return {
        "total": int(total or 0),
        "skip": skip,
        "limit": limit,
        "items": [ProductRead.model_validate(row, from_attributes=True) for row in items],
    }


@router.get("", response_model=list[ProductRead])
def get_products(
    search: str | None = Query(default=None, min_length=1, max_length=120),
    category_id: int | None = None,
    featured_only: bool = False,
    limit: int = Query(default=20, ge=1, le=100),
    session: Session = Depends(get_session),
):
    """Legacy flat list."""
    return list_products(
        session=session,
        search=search,
        category_id=category_id,
        featured_only=featured_only,
        limit=limit,
    )


@router.get("/search")
def search_products(
    q: str = Query(..., min_length=1, max_length=120),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    session: Session = Depends(get_session),
):
    """Storefront search analytics ping — returns the same envelope as `/`."""
    return list_products_paginated(
        search=q,
        category_id=None,
        category_slug=None,
        featured_only=False,
        sort_by="created_at",
        sort_order="desc",
        skip=skip,
        limit=limit,
        session=session,
    )


@router.get("/slug/{slug}", response_model=ProductRead)
def get_product_by_slug(slug: str, session: Session = Depends(get_session)):
    product = session.exec(
        select(Product).where(Product.slug == slug, Product.is_active.is_(True))
    ).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


@router.get("/{product_id}", response_model=ProductRead)
def get_product(product_id: int, session: Session = Depends(get_session)):
    product = get_product_by_id(session=session, product_id=product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product
