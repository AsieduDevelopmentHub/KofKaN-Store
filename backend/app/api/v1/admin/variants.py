"""
Admin product-variant management.

Each variant has its own stock (`in_stock`), optional image and copy, and is
sold through checkout when the shopper picks that option. Admins can create/update/delete variants and
browse them per product.
"""
from __future__ import annotations

import json
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from pydantic import BaseModel, Field, field_validator
from sqlmodel import Session, select

from app.api.v1.auth.dependencies import require_admin_permission
from app.api.v1.admin.services import upload_product_image
from app.core.sanitization import sanitize_multiline_text, sanitize_plain_text
from app.db import get_session
from app.models import Product, ProductVariant, User
from app.core.sku_generator import generate_variant_sku

router = APIRouter()


class VariantRead(BaseModel):
    id: int
    product_id: int
    name: str
    sku: Optional[str] = None
    attributes: Optional[dict] = None
    price_delta: float
    in_stock: int
    is_active: bool
    sort_order: int
    image_url: Optional[str] = None
    description: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class VariantCreate(BaseModel):
    product_id: int = Field(..., gt=0)
    name: str = Field(..., min_length=1, max_length=160)
    sku: Optional[str] = Field(default=None, max_length=120)
    attributes: Optional[dict] = None
    price_delta: float = Field(default=0.0)
    in_stock: int = Field(default=0, ge=0)
    is_active: bool = True
    sort_order: int = Field(default=0)
    image_url: Optional[str] = Field(default=None, max_length=1024)
    description: Optional[str] = Field(default=None, max_length=4000)

    @field_validator("description", mode="before")
    @classmethod
    def _clean_desc(cls, v):
        if v is None:
            return None
        return sanitize_multiline_text(v, max_length=4000)

    @field_validator("name", mode="before")
    @classmethod
    def _clean_name(cls, v):
        return sanitize_plain_text(v, max_length=160, single_line=True)

    @field_validator("sku", mode="before")
    @classmethod
    def _clean_sku(cls, v):
        if v is None:
            return None
        return sanitize_plain_text(v, max_length=120, single_line=True)


class VariantUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=160)
    sku: Optional[str] = Field(default=None, max_length=120)
    attributes: Optional[dict] = None
    price_delta: Optional[float] = None
    in_stock: Optional[int] = Field(default=None, ge=0)
    is_active: Optional[bool] = None
    sort_order: Optional[int] = None
    image_url: Optional[str] = Field(default=None, max_length=1024)
    description: Optional[str] = Field(default=None, max_length=4000)

    @field_validator("description", mode="before")
    @classmethod
    def _clean_desc(cls, v):
        if v is None:
            return None
        return sanitize_multiline_text(v, max_length=4000)

    @field_validator("name", mode="before")
    @classmethod
    def _clean_name(cls, v):
        if v is None:
            return None
        return sanitize_plain_text(v, max_length=160, single_line=True)

    @field_validator("sku", mode="before")
    @classmethod
    def _clean_sku(cls, v):
        if v is None:
            return None
        return sanitize_plain_text(v, max_length=120, single_line=True)


def _serialize_attributes(attrs: Optional[dict]) -> Optional[str]:
    if attrs is None:
        return None
    try:
        return json.dumps(attrs, separators=(",", ":"))
    except (TypeError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid variant attributes: {exc}",
        )


def _parse_attributes(raw: Optional[str]) -> Optional[dict]:
    if not raw:
        return None
    try:
        parsed = json.loads(raw)
        return parsed if isinstance(parsed, dict) else None
    except Exception:
        return None


def _to_read(v: ProductVariant) -> VariantRead:
    return VariantRead(
        id=v.id,
        product_id=v.product_id,
        name=v.name,
        sku=v.sku,
        attributes=_parse_attributes(v.attributes),
        price_delta=v.price_delta,
        in_stock=v.in_stock,
        is_active=v.is_active,
        sort_order=v.sort_order,
        image_url=getattr(v, "image_url", None),
        description=getattr(v, "description", None),
        created_at=v.created_at,
        updated_at=v.updated_at,
    )


@router.get("/", response_model=List[VariantRead])
async def list_variants(
    product_id: Optional[int] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
    session: Session = Depends(get_session),
    current_user: User = Depends(require_admin_permission("manage_products")),
):
    stmt = select(ProductVariant)
    if product_id is not None:
        stmt = stmt.where(ProductVariant.product_id == product_id)
    stmt = (
        stmt.order_by(ProductVariant.product_id.asc(), ProductVariant.sort_order.asc())
        .offset(skip)
        .limit(limit)
    )
    rows = list(session.exec(stmt).all())
    return [_to_read(r) for r in rows]


@router.post("/", response_model=VariantRead, status_code=status.HTTP_201_CREATED)
async def create_variant(
    body: VariantCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_admin_permission("manage_products")),
):
    product = session.get(Product, body.product_id)
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Product not found"
        )
    now = datetime.utcnow()
    sku = body.sku
    if sku is None or not str(sku).strip():
        sku = generate_variant_sku(session, product=product, variant_name=body.name or "")
    v = ProductVariant(
        product_id=body.product_id,
        name=body.name or "",
        sku=sku,
        attributes=_serialize_attributes(body.attributes),
        price_delta=float(body.price_delta),
        in_stock=int(body.in_stock),
        is_active=bool(body.is_active),
        sort_order=int(body.sort_order),
        image_url=body.image_url,
        description=body.description,
        created_at=now,
        updated_at=now,
    )
    session.add(v)
    session.commit()
    session.refresh(v)
    return _to_read(v)


@router.patch("/{variant_id}", response_model=VariantRead)
async def update_variant(
    variant_id: int,
    body: VariantUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_admin_permission("manage_products")),
):
    v = session.get(ProductVariant, variant_id)
    if not v:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Variant not found"
        )
    data = body.model_dump(exclude_unset=True)
    if "name" in data and data["name"] is not None:
        v.name = data["name"]
    if "sku" in data:
        v.sku = data["sku"]
    if "attributes" in data:
        v.attributes = _serialize_attributes(data["attributes"])
    if "price_delta" in data and data["price_delta"] is not None:
        v.price_delta = float(data["price_delta"])
    if "in_stock" in data and data["in_stock"] is not None:
        v.in_stock = int(data["in_stock"])
    if "is_active" in data and data["is_active"] is not None:
        v.is_active = bool(data["is_active"])
    if "sort_order" in data and data["sort_order"] is not None:
        v.sort_order = int(data["sort_order"])
    if "image_url" in data:
        v.image_url = data["image_url"]
    if "description" in data:
        v.description = data["description"]
    v.updated_at = datetime.utcnow()
    if not (v.sku or "").strip():
        p = session.get(Product, v.product_id)
        if p:
            v.sku = generate_variant_sku(
                session,
                product=p,
                variant_name=v.name or "",
                exclude_variant_id=v.id,
            )
    session.add(v)
    session.commit()
    session.refresh(v)
    return _to_read(v)


@router.post("/{variant_id}/image", response_model=VariantRead)
async def upload_variant_image(
    variant_id: int,
    image: UploadFile = File(...),
    session: Session = Depends(get_session),
    current_user: User = Depends(require_admin_permission("manage_products")),
):
    """Upload a photo for this variant. Replaces the existing image URL."""
    v = session.get(ProductVariant, variant_id)
    if not v:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Variant not found"
        )
    url = await upload_product_image(image, session, folder="variants")
    v.image_url = url
    v.updated_at = datetime.utcnow()
    session.add(v)
    session.commit()
    session.refresh(v)
    return _to_read(v)


@router.delete("/{variant_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_variant(
    variant_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_admin_permission("manage_products")),
):
    v = session.get(ProductVariant, variant_id)
    if not v:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Variant not found"
        )
    session.delete(v)
    session.commit()
