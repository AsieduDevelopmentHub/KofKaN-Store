from fastapi import APIRouter, Depends
from sqlmodel import Session

from app.api.v1.auth.dependencies import get_current_active_user
from app.db import get_session
from app.models import User
from app.api.v1.reviews.schemas import ReviewCreateRequest, ReviewReadResponse
from app.api.v1.reviews.services import create_review_for_product, list_reviews_for_product

router = APIRouter(prefix="/reviews", tags=["Reviews"])


@router.get("/product/{product_id}")
def list_reviews(product_id: int, session: Session = Depends(get_session)):
    reviews = list_reviews_for_product(session=session, product_id=product_id)
    return [
        ReviewReadResponse(
            id=review.id or 0,
            product_id=review.product_id,
            user_id=review.user_id,
            rating=review.rating,
            title=review.title,
            content=review.content,
            created_at=review.created_at,
        )
        for review in reviews
    ]


@router.post("")
def create_review(
    payload: ReviewCreateRequest, current_user: User = Depends(get_current_active_user), session: Session = Depends(get_session)
) -> ReviewReadResponse:
    review = create_review_for_product(
        session=session,
        user=current_user,
        product_id=payload.product_id,
        rating=payload.rating,
        title=payload.title,
        content=payload.content,
    )
    return ReviewReadResponse(
        id=review.id or 0,
        product_id=review.product_id,
        user_id=review.user_id,
        rating=review.rating,
        title=review.title,
        content=review.content,
        created_at=review.created_at,
    )
