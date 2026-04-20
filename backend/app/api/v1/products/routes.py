from fastapi import APIRouter, Depends, Query
from sqlmodel import Session

from app.api.v1.products.schemas import ProductListQuery
from app.api.v1.products.services import list_products
from app.db import get_session
from app.models import ProductRead

router = APIRouter(prefix="/products", tags=["Products"])


@router.get("", response_model=list[ProductRead])
def get_products(
    search: str | None = Query(default=None, min_length=1, max_length=120),
    category_id: int | None = None,
    featured_only: bool = False,
    limit: int = Query(default=20, ge=1, le=100),
    session: Session = Depends(get_session),
):
    query = ProductListQuery(
        search=search,
        category_id=category_id,
        featured_only=featured_only,
        limit=limit,
    )
    return list_products(
        session=session,
        search=query.search,
        category_id=query.category_id,
        featured_only=query.featured_only,
        limit=query.limit,
    )
