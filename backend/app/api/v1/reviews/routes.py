"""
Reviews API routes
"""
from __future__ import annotations

import os
import uuid
from datetime import datetime
from pathlib import Path
from typing import List

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from sqlmodel import Session, select

from app.api.v1.auth.dependencies import get_current_active_user, get_current_active_user_optional
from app.core.supabase import upload_file
from app.db import get_session
from app.models import Review, ReviewMedia, User
from app.api.v1.reviews.schemas import (
    ReviewCreateSchema,
    ReviewMediaRead,
    ReviewPublic,
    ReviewSchema,
    ReviewWriteEligibility,
)
from app.api.v1.reviews.services import (
    can_user_write_review,
    create_review,
    delete_review,
    get_user_reviews,
    list_product_reviews_public,
    _reviewer_first_name,
)

router = APIRouter()

_MAX_MEDIA_PER_REVIEW = 6
_IMAGE_MIMES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
_VIDEO_MIMES = {"video/mp4", "video/webm", "video/quicktime"}
_MAX_IMAGE_BYTES = 8 * 1024 * 1024   # 8 MB
_MAX_VIDEO_BYTES = 50 * 1024 * 1024  # 50 MB


@router.post("", response_model=ReviewPublic, status_code=status.HTTP_201_CREATED)
async def create_review_endpoint(
    review_data: ReviewCreateSchema,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new review for a product."""
    row = await create_review(
        session=session,
        user_id=current_user.id,
        review_data=review_data
    )
    return ReviewPublic(
        id=row.id,
        product_id=row.product_id,
        rating=row.rating,
        title=row.title,
        content=row.content,
        created_at=row.created_at,
        reviewer_name=_reviewer_first_name(current_user),
    )


@router.get("/product/{product_id}/can-review", response_model=ReviewWriteEligibility)
async def review_write_eligibility(
    product_id: int,
    session: Session = Depends(get_session),
    current_user: User | None = Depends(get_current_active_user_optional),
):
    if not current_user:
        return ReviewWriteEligibility(can_review=False)
    ok = await can_user_write_review(session, current_user.id, product_id)
    return ReviewWriteEligibility(can_review=ok)


@router.get("/product/{product_id}", response_model=List[ReviewPublic])
async def get_product_reviews_endpoint(
    product_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    session: Session = Depends(get_session)
):
    """Get all reviews for a product."""
    return await list_product_reviews_public(
        session=session,
        product_id=product_id,
        skip=skip,
        limit=limit,
    )


@router.get("/user/me", response_model=List[ReviewSchema])
async def get_user_reviews_endpoint(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user)
):
    """Get all reviews by the current user."""
    return await get_user_reviews(
        session=session,
        user_id=current_user.id
    )


@router.delete("/{review_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_review_endpoint(
    review_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user)
):
    """Delete a review (user can only delete their own)."""
    await delete_review(
        session=session,
        review_id=review_id,
        user_id=current_user.id
    )


@router.post(
    "/{review_id}/media",
    response_model=ReviewMediaRead,
    status_code=status.HTTP_201_CREATED,
)
async def upload_review_media(
    review_id: int,
    file: UploadFile = File(...),
    sort_order: int = Form(0),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user),
):
    """Attach an image or short video to a review the current user owns."""
    review = session.get(Review, review_id)
    if not review:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Review not found"
        )
    if review.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only add media to your own reviews.",
        )

    existing_count = len(
        session.exec(
            select(ReviewMedia).where(ReviewMedia.review_id == review_id)
        ).all()
    )
    if existing_count >= _MAX_MEDIA_PER_REVIEW:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Max {_MAX_MEDIA_PER_REVIEW} media files per review.",
        )

    ct = (file.content_type or "").lower()
    if ct in _IMAGE_MIMES:
        kind = "image"
        max_bytes = _MAX_IMAGE_BYTES
    elif ct in _VIDEO_MIMES:
        kind = "video"
        max_bytes = _MAX_VIDEO_BYTES
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported media type. Allowed: JPEG/PNG/WebP/GIF images, MP4/WebM/MOV videos.",
        )

    data = await file.read()
    if not data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Empty upload"
        )
    if len(data) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File too large (max {max_bytes // (1024 * 1024)} MB for {kind}).",
        )

    file_id = uuid.uuid4().hex
    ext = Path(file.filename or "").suffix.lower() or (".jpg" if kind == "image" else ".mp4")
    folder = "review-media"
    storage_path = f"{folder}/{file_id}{ext}"

    public_url = upload_file(storage_path, data)
    if not public_url:
        upload_dir = os.path.join("uploads", folder)
        os.makedirs(upload_dir, exist_ok=True)
        local_path = os.path.join(upload_dir, f"{file_id}{ext}")
        with open(local_path, "wb") as fh:
            fh.write(data)
        public_url = f"/uploads/{folder}/{file_id}{ext}"

    media = ReviewMedia(
        review_id=review_id,
        url=public_url,
        kind=kind,
        sort_order=sort_order,
        created_at=datetime.utcnow(),
    )
    session.add(media)
    session.commit()
    session.refresh(media)
    return ReviewMediaRead.model_validate(media)


@router.delete("/{review_id}/media/{media_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_review_media(
    review_id: int,
    media_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user),
):
    media = session.get(ReviewMedia, media_id)
    if not media or media.review_id != review_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Media not found"
        )
    review = session.get(Review, review_id)
    if not review or review.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized"
        )
    session.delete(media)
    session.commit()
