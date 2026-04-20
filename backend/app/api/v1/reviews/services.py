from fastapi import HTTPException
from sqlmodel import Session, select

from app.models import Product, Review, User


def list_reviews_for_product(session: Session, product_id: int) -> list[Review]:
    return session.exec(select(Review).where(Review.product_id == product_id).order_by(Review.created_at.desc())).all()


def create_review_for_product(
    session: Session, user: User, product_id: int, rating: int, title: str, content: str | None
) -> Review:
    product = session.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    review = Review(
        product_id=product_id,
        user_id=user.id or 0,
        rating=rating,
        title=title.strip() or "Review",
        content=(content or "").strip() or None,
    )
    session.add(review)
    session.commit()
    session.refresh(review)
    return review
