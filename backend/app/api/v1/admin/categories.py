from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlmodel import Session, select

from app.api.v1.auth.dependencies import require_admin_permission
from app.db import get_session
from app.models import Category, User

router = APIRouter(prefix="/categories", tags=["Admin"])


class CategoryCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    slug: str = Field(min_length=2, max_length=140)
    description: str | None = Field(default=None, max_length=600)
    image_url: str | None = None
    is_active: bool = True
    sort_order: int = 0


@router.get("/")
def list_categories(
    current_user: User = Depends(require_admin_permission("manage_products")),
    session: Session = Depends(get_session),
):
    _ = current_user
    return list(session.exec(select(Category).order_by(Category.sort_order.asc(), Category.name.asc())))


@router.post("/")
def create_category(
    payload: CategoryCreate,
    current_user: User = Depends(require_admin_permission("manage_products")),
    session: Session = Depends(get_session),
):
    _ = current_user
    if session.exec(select(Category).where(Category.slug == payload.slug)).first():
        raise HTTPException(status_code=400, detail="Slug already exists")
    c = Category(
        name=payload.name.strip(),
        slug=payload.slug.strip(),
        description=payload.description,
        image_url=payload.image_url,
        is_active=payload.is_active,
        sort_order=payload.sort_order,
    )
    session.add(c)
    session.commit()
    session.refresh(c)
    return c


@router.put("/{category_id}")
def update_category(
    category_id: int,
    payload: CategoryCreate,
    current_user: User = Depends(require_admin_permission("manage_products")),
    session: Session = Depends(get_session),
):
    _ = current_user
    c = session.get(Category, category_id)
    if not c:
        raise HTTPException(status_code=404, detail="Category not found")
    existing = session.exec(select(Category).where(Category.slug == payload.slug)).first()
    if existing and existing.id != c.id:
        raise HTTPException(status_code=400, detail="Slug already exists")
    c.name = payload.name.strip()
    c.slug = payload.slug.strip()
    c.description = payload.description
    c.image_url = payload.image_url
    c.is_active = payload.is_active
    c.sort_order = payload.sort_order
    session.add(c)
    session.commit()
    session.refresh(c)
    return c


@router.delete("/{category_id}")
def delete_category(
    category_id: int,
    current_user: User = Depends(require_admin_permission("manage_products")),
    session: Session = Depends(get_session),
):
    _ = current_user
    c = session.get(Category, category_id)
    if not c:
        raise HTTPException(status_code=404, detail="Category not found")
    session.delete(c)
    session.commit()
    return {"message": "deleted"}

