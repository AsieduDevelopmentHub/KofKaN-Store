"""
Products business logic with Redis caching layer
"""
from typing import Optional
from fastapi import HTTPException, status
from sqlalchemy import func
from sqlmodel import Session, select, and_, or_

from app.models import Product, Category
from app.api.v1.products.schemas import ProductSearchResponse
from app.core.cache import cache, TTL_CATEGORIES, TTL_PRODUCT, TTL_PRODUCT_LIST, TTL_SEARCH


async def get_products_with_filters(
    session: Session,
    category_id: Optional[int] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    min_rating: Optional[float] = None,
    sort_by: str = "created_at",
    sort_order: str = "desc",
    skip: int = 0,
    limit: int = 20,
) -> dict:
    """Get products with advanced filtering and sorting (cached)."""
    cache_key = f"products:filters:{category_id}:{min_price}:{max_price}:{min_rating}:{sort_by}:{sort_order}:{skip}:{limit}"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    filters = [Product.is_active == True]
    if category_id is not None:
        filters.append(Product.category == str(category_id))
    if min_price is not None:
        filters.append(Product.price >= min_price)
    if max_price is not None:
        filters.append(Product.price <= max_price)
    if min_rating is not None:
        filters.append(Product.avg_rating >= min_rating)

    where_clause = and_(*filters)
    total = session.exec(
        select(func.count(Product.id)).where(where_clause)
    ).one()

    query = select(Product).where(where_clause)

    if sort_by == "price":
        sort_col = Product.price
    elif sort_by == "rating":
        sort_col = Product.avg_rating
    elif sort_by == "sales":
        sort_col = Product.sales_count
    elif sort_by == "name":
        sort_col = Product.name
    elif sort_by == "random":
        sort_col = func.random()
    else:
        sort_col = Product.created_at

    if sort_by == "random":
        query = query.order_by(sort_col)
    elif sort_order.lower() == "asc":
        query = query.order_by(sort_col.asc())
    else:
        query = query.order_by(sort_col.desc())

    query = query.offset(skip).limit(limit)

    products = session.exec(query).all()

    result = {
        "total": total,
        "skip": skip,
        "limit": limit,
        "items": [p.model_dump() for p in products],
    }
    cache.set(cache_key, result, ttl=TTL_PRODUCT_LIST)
    return result


async def search_products(
    session: Session,
    search_query: str,
    skip: int = 0,
    limit: int = 20,
) -> dict:
    """Search products by name, description, or SKU (cached)."""
    cache_key = f"products:search:{search_query}:{skip}:{limit}"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    search_term = f"%{search_query}%"
    search_words = [w.strip() for w in search_query.split() if len(w.strip()) > 1]

    match_any = or_(
        Product.name.ilike(search_term),
        Product.description.ilike(search_term),
        and_(Product.sku.isnot(None), Product.sku.ilike(search_term)),
    )

    if search_words:
        word_filters = [Product.name.ilike(f"%{w}%") for w in search_words]
        match_any = or_(match_any, *word_filters)
    where_clause = and_(Product.is_active == True, match_any)
    total = session.exec(select(func.count(Product.id)).where(where_clause)).one()

    query = (
        select(Product)
        .where(where_clause)
        .order_by(Product.created_at.desc())
        .offset(skip)
        .limit(limit)
    )

    products = session.exec(query).all()

    result = {
        "total": total,
        "skip": skip,
        "limit": limit,
        "items": [p.model_dump() for p in products],
    }
    cache.set(cache_key, result, ttl=TTL_SEARCH)
    return result


async def get_product_by_id(session: Session, product_id: int):
    """Get product by ID (cached)."""
    cache_key = f"product:id:{product_id}"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    product = session.exec(
        select(Product).where(Product.id == product_id)
    ).first()

    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found",
        )

    result = product.model_dump()
    cache.set(cache_key, result, ttl=TTL_PRODUCT)
    return result


async def get_product_by_slug(session: Session, slug: str):
    """Get product by slug (cached)."""
    cache_key = f"product:slug:{slug}"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    product = session.exec(
        select(Product).where(Product.slug == slug)
    ).first()

    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found",
        )

    result = product.model_dump()
    cache.set(cache_key, result, ttl=TTL_PRODUCT)
    return result


async def get_all_categories(session: Session):
    """Get all active categories (cached)."""
    cache_key = "categories:all"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    categories = session.exec(
        select(Category).where(Category.is_active == True).order_by(Category.sort_order)
    ).all()

    result = [c.model_dump() for c in categories]
    cache.set(cache_key, result, ttl=TTL_CATEGORIES)
    return result


async def get_category_by_id(session: Session, category_id: int):
    """Get category by ID (cached)."""
    cache_key = f"category:id:{category_id}"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    category = session.exec(
        select(Category).where(Category.id == category_id)
    ).first()

    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found",
        )

    result = category.model_dump()
    cache.set(cache_key, result, ttl=TTL_CATEGORIES)
    return result
