from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlmodel import Session, select

from app.api.v1.auth.dependencies import require_admin_permission
from app.db import get_session
from app.models import Category, Product, User

router = APIRouter(prefix="/products", tags=["Admin"])


class ProductCreate(BaseModel):
    name: str = Field(min_length=2, max_length=200)
    slug: str = Field(min_length=2, max_length=220)
    description: str | None = Field(default=None, max_length=4000)
    price: float = Field(ge=0)
    in_stock: int = Field(default=0, ge=0)
    category: str | None = None
    sku: str | None = Field(default=None, max_length=120)
    image_url: str | None = None
    is_active: bool = True


@router.post("/bulk-import")
def bulk_import_products(
    current_user: User = Depends(require_admin_permission("manage_products")),
):
    """
    Compatibility stub for the admin bulk import UI.
    Full CSV parsing + create/update can be added later.
    """
    _ = current_user
    return {
        "mode": "dry_run",
        "total_rows": 0,
        "created": 0,
        "updated": 0,
        "skipped": 0,
        "errors": 0,
        "results": [],
    }


@router.get("/low-stock/list")
def low_stock_list(
    current_user: User = Depends(require_admin_permission("manage_products")),
):
    """Compatibility stub for the low stock table page (list view)."""
    _ = current_user
    return []


@router.get("")
def list_products(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=500),
    category: str | None = None,
    current_user: User = Depends(require_admin_permission("manage_products")),
    session: Session = Depends(get_session),
):
    _ = current_user
    statement = select(Product).order_by(Product.created_at.desc()).offset(skip).limit(limit)
    items = list(session.exec(statement))

    # Map to UI shape (AdminProduct).
    cat_map = {c.id: c.slug for c in session.exec(select(Category)).all()}
    res: list[dict] = []
    for p in items:
        if category and cat_map.get(p.category_id) != category:
            continue
        res.append(
            {
                "id": p.id,
                "name": p.name,
                "slug": p.slug,
                "description": p.description,
                "price": float(p.price),
                "in_stock": int(p.stock_quantity),
                "category": cat_map.get(p.category_id),
                "sku": p.sku,
                "image_url": p.image_url,
                "is_active": bool(p.is_active),
                "created_at": p.created_at.isoformat(),
            }
        )
    return res


# NOTE: keep any literal paths ABOVE this route, otherwise FastAPI will try to
# parse them as `{product_id}`.
@router.get("/{product_id}")
def get_product(
    product_id: int,
    current_user: User = Depends(require_admin_permission("manage_products")),
    session: Session = Depends(get_session),
):
    _ = current_user
    p = session.get(Product, product_id)
    if not p:
        raise HTTPException(status_code=404, detail="Product not found")
    cat = session.get(Category, p.category_id) if p.category_id else None
    return {
        "id": p.id,
        "name": p.name,
        "slug": p.slug,
        "description": p.description,
        "price": float(p.price),
        "in_stock": int(p.stock_quantity),
        "category": cat.slug if cat else None,
        "sku": p.sku,
        "image_url": p.image_url,
        "is_active": bool(p.is_active),
        "created_at": p.created_at.isoformat(),
    }


@router.post("/")
def create_product(
    payload: ProductCreate,
    current_user: User = Depends(require_admin_permission("manage_products")),
    session: Session = Depends(get_session),
):
    _ = current_user
    if session.exec(select(Product).where(Product.slug == payload.slug)).first():
        raise HTTPException(status_code=400, detail="Slug already exists")
    if payload.sku and session.exec(select(Product).where(Product.sku == payload.sku)).first():
        raise HTTPException(status_code=400, detail="SKU already exists")

    category_id = None
    if payload.category:
        cat = session.exec(select(Category).where(Category.slug == payload.category)).first()
        if cat:
            category_id = cat.id

    p = Product(
        name=payload.name.strip(),
        slug=payload.slug.strip(),
        description=payload.description,
        price=float(payload.price),
        stock_quantity=int(payload.in_stock),
        category_id=category_id,
        sku=(payload.sku or payload.slug).upper()[:120],
        image_url=payload.image_url,
        is_active=payload.is_active,
        updated_at=datetime.utcnow(),
    )
    session.add(p)
    session.commit()
    session.refresh(p)
    return get_product(p.id, current_user=current_user, session=session)  # type: ignore[arg-type]


@router.put("/{product_id}")
def update_product(
    product_id: int,
    payload: ProductCreate,
    current_user: User = Depends(require_admin_permission("manage_products")),
    session: Session = Depends(get_session),
):
    _ = current_user
    p = session.get(Product, product_id)
    if not p:
        raise HTTPException(status_code=404, detail="Product not found")

    existing = session.exec(select(Product).where(Product.slug == payload.slug)).first()
    if existing and existing.id != p.id:
        raise HTTPException(status_code=400, detail="Slug already exists")

    category_id = p.category_id
    if payload.category is not None:
        if payload.category == "":
            category_id = None
        else:
            cat = session.exec(select(Category).where(Category.slug == payload.category)).first()
            category_id = cat.id if cat else None

    p.name = payload.name.strip()
    p.slug = payload.slug.strip()
    p.description = payload.description
    p.price = float(payload.price)
    p.stock_quantity = int(payload.in_stock)
    p.category_id = category_id
    p.image_url = payload.image_url
    p.is_active = payload.is_active
    p.updated_at = datetime.utcnow()

    session.add(p)
    session.commit()
    session.refresh(p)
    return get_product(p.id, current_user=current_user, session=session)  # type: ignore[arg-type]


@router.delete("/{product_id}")
def delete_product(
    product_id: int,
    current_user: User = Depends(require_admin_permission("manage_products")),
    session: Session = Depends(get_session),
):
    _ = current_user
    p = session.get(Product, product_id)
    if not p:
        raise HTTPException(status_code=404, detail="Product not found")
    session.delete(p)
    session.commit()
    return {"message": "deleted"}


@router.get("/low-stock/alerts")
def low_stock_alerts(
    threshold: int = Query(default=5, ge=0, le=1000),
    limit: int = Query(default=50, ge=1, le=500),
    current_user: User = Depends(require_admin_permission("manage_products")),
    session: Session = Depends(get_session),
):
    """Compatibility endpoint used by the admin dashboard low-stock widget."""
    _ = current_user
    products = session.exec(
        select(Product)
        .where(Product.stock_quantity <= threshold)
        .order_by(Product.stock_quantity.asc(), Product.created_at.desc())
        .limit(limit)
    ).all()
    return [
        {
            "kind": "product",
            "product_id": p.id,
            "variant_id": None,
            "name": p.name,
            "parent_product_name": None,
            "sku": p.sku,
            "in_stock": p.stock_quantity,
            "unit_price": float(p.price),
        }
        for p in products
        if p.id is not None
    ]

