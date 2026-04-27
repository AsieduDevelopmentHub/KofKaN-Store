"""Admin: list and moderate reviews."""
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session, select

from app.api.v1.auth.dependencies import require_admin_permission
from app.api.v1.reviews.schemas import ReviewSchema
from app.db import get_session
from app.models import Review, User

router = APIRouter()


@router.get("/", response_model=List[ReviewSchema])
async def list_reviews_admin(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
    session: Session = Depends(get_session),
    current_user: User = Depends(require_admin_permission("manage_reviews")),
):
    reviews = session.exec(
        select(Review).order_by(Review.created_at.desc()).offset(skip).limit(limit)
    ).all()
    return [ReviewSchema.model_validate(r) for r in reviews]


@router.delete("/{review_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_review_admin(
    review_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_admin_permission("manage_reviews")),
):
    review = session.get(Review, review_id)
    if not review:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Review not found")
    session.delete(review)
    session.commit()
