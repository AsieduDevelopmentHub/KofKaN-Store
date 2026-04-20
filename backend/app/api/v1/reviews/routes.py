from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.api.v1.auth.dependencies import get_current_active_user
from app.db import get_session
from app.models import Product, Review, User

router = APIRouter(prefix="/reviews", tags=["Reviews"])


@router.get("/product/{product_id}")
def list_reviews(product_id: int, session: Session = Depends(get_session)):
    return session.exec(select(Review).where(Review.product_id == product_id).order_by(Review.created_at.desc())).all()


@router.post("")
def create_review(payload: dict, current_user: User = Depends(get_current_active_user), session: Session = Depends(get_session)):
    product_id = int(payload.get("product_id", 0))
    product = session.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    rating = int(payload.get("rating", 0))
    if rating < 1 or rating > 5:
        raise HTTPException(status_code=400, detail="rating must be 1-5")
    review = Review(
        product_id=product_id,
        user_id=current_user.id or 0,
        rating=rating,
        title=str(payload.get("title", "Review")).strip() or "Review",
        content=str(payload.get("content", "")).strip() or None,
    )
    session.add(review)
    session.commit()
    session.refresh(review)
    return review
