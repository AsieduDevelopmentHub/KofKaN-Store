"""
Admin product-image gallery routes.

Each product keeps a `Product.image_url` (the primary cover used by list pages)
alongside a `ProductImage` table of extra shots. Admins can attach multiple
images, reorder them, pick a new primary, or delete extras. Public storefront
reads are exposed via `/products/{id}/images` in the products router.
"""
from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from pydantic import BaseModel, Field
from sqlmodel import Session, select

from app.api.v1.admin.services import upload_product_image
from app.api.v1.auth.dependencies import require_admin_permission
from app.core.sanitization import sanitize_plain_text
from app.db import get_session
from app.models import Product, ProductImage, User


router = APIRouter()


class ProductImageRead(BaseModel):
    id: int
    product_id: int
    image_url: str
    alt_text: Optional[str] = None
    is_primary: bool
    sort_order: int
    created_at: datetime

    class Config:
        from_attributes = True


class ReorderBody(BaseModel):
    order: List[int] = Field(..., description="ProductImage ids in desired display order")


def _load_images(session: Session, product_id: int) -> List[ProductImage]:
    stmt = (
        select(ProductImage)
        .where(ProductImage.product_id == product_id)
        .order_by(ProductImage.sort_order.asc(), ProductImage.id.asc())
    )
    return list(session.exec(stmt).all())


@router.get("/{product_id}/images", response_model=List[ProductImageRead])
async def list_product_images(
    product_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_admin_permission("manage_products")),
):
    product = session.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    return [ProductImageRead.model_validate(img) for img in _load_images(session, product_id)]


@router.post(
    "/{product_id}/images",
    response_model=ProductImageRead,
    status_code=status.HTTP_201_CREATED,
)
async def upload_product_gallery_image(
    product_id: int,
    image: UploadFile = File(...),
    alt_text: Optional[str] = Form(None),
    is_primary: bool = Form(False),
    session: Session = Depends(get_session),
    current_user: User = Depends(require_admin_permission("manage_products")),
):
    product = session.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    url = await upload_product_image(image, session, folder="products")

    existing = _load_images(session, product_id)
    next_sort = (max((img.sort_order for img in existing), default=-1) + 1) if existing else 0
    make_primary = bool(is_primary) or not existing

    if make_primary:
        for img in existing:
            if img.is_primary:
                img.is_primary = False
                session.add(img)
        product.image_url = url
        session.add(product)

    row = ProductImage(
        product_id=product_id,
        image_url=url,
        alt_text=sanitize_plain_text(alt_text, max_length=255, single_line=True) if alt_text else None,
        is_primary=make_primary,
        sort_order=next_sort,
        created_at=datetime.utcnow(),
    )
    session.add(row)
    session.commit()
    session.refresh(row)
    return ProductImageRead.model_validate(row)


@router.patch(
    "/{product_id}/images/{image_id}/primary",
    response_model=ProductImageRead,
)
async def set_primary_image(
    product_id: int,
    image_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_admin_permission("manage_products")),
):
    product = session.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    target = session.get(ProductImage, image_id)
    if not target or target.product_id != product_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Image not found")

    for img in _load_images(session, product_id):
        if img.id != image_id and img.is_primary:
            img.is_primary = False
            session.add(img)
    target.is_primary = True
    session.add(target)

    product.image_url = target.image_url
    session.add(product)

    session.commit()
    session.refresh(target)
    return ProductImageRead.model_validate(target)


@router.post(
    "/{product_id}/images/reorder",
    response_model=List[ProductImageRead],
)
async def reorder_images(
    product_id: int,
    body: ReorderBody,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_admin_permission("manage_products")),
):
    product = session.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    existing = {img.id: img for img in _load_images(session, product_id)}
    if len(body.order) != len(set(body.order)):
        # Duplicates would let the last occurrence "win" and leave gaps in sort_order,
        # silently breaking the display invariant. Reject up-front.
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Order list must not contain duplicate image ids",
        )
    if set(body.order) != set(existing.keys()) or len(body.order) != len(existing):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Order list must include exactly the existing image ids",
        )
    for idx, iid in enumerate(body.order):
        img = existing[iid]
        img.sort_order = idx
        session.add(img)
    session.commit()
    return [ProductImageRead.model_validate(img) for img in _load_images(session, product_id)]


@router.delete(
    "/{product_id}/images/{image_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_product_image(
    product_id: int,
    image_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_admin_permission("manage_products")),
):
    target = session.get(ProductImage, image_id)
    if not target or target.product_id != product_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Image not found")

    was_primary = target.is_primary
    session.delete(target)
    session.commit()

    # If the primary was deleted, promote whatever remains (if anything) so the
    # product keeps a sensible cover image on public pages.
    if was_primary:
        remaining = _load_images(session, product_id)
        product = session.get(Product, product_id)
        if remaining and product:
            head = remaining[0]
            head.is_primary = True
            session.add(head)
            product.image_url = head.image_url
            session.add(product)
            session.commit()
        elif product:
            product.image_url = None
            session.add(product)
            session.commit()
