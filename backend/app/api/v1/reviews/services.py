"""
Reviews business logic
"""
from fastapi import HTTPException, status
from sqlmodel import Session, select, func

from app.models import Review, Product, Order, OrderItem, ReviewMedia, User
from app.core.pg_rls_auth import users_public_profiles_for_ids
from app.api.v1.reviews.schemas import ReviewCreateSchema, ReviewMediaRead, ReviewPublic


def _media_for_reviews(session: Session, review_ids: list[int]) -> dict[int, list[ReviewMediaRead]]:
    if not review_ids:
        return {}
    rows = session.exec(
        select(ReviewMedia)
        .where(ReviewMedia.review_id.in_(review_ids))
        .order_by(ReviewMedia.sort_order.asc(), ReviewMedia.id.asc())
    ).all()
    grouped: dict[int, list[ReviewMediaRead]] = {}
    for m in rows:
        grouped.setdefault(m.review_id, []).append(ReviewMediaRead.model_validate(m))
    return grouped


def _reviewer_first_name(user: User | None) -> str:
    if user and (user.first_name or "").strip():
        return (user.first_name or "").strip()
    if user and user.email:
        return user.email.split("@")[0]
    return "Customer"


def user_has_paid_purchase_for_product(session: Session, user_id: int, product_id: int) -> bool:
    stmt = (
        select(OrderItem.id)
        .join(Order, OrderItem.order_id == Order.id)
        .where(Order.user_id == user_id)
        .where(OrderItem.product_id == product_id)
        .where(Order.payment_status == "paid")
    )
    row = session.exec(stmt).first()
    return row is not None


async def can_user_write_review(session: Session, user_id: int, product_id: int) -> bool:
    if not user_has_paid_purchase_for_product(session, user_id, product_id):
        return False
    existing = session.exec(
        select(Review.id).where(Review.user_id == user_id, Review.product_id == product_id)
    ).first()
    return existing is None


async def create_review(
    session: Session,
    user_id: int,
    review_data: ReviewCreateSchema
) -> Review:
    """Create a new review."""
    # Verify product exists
    product = session.exec(
        select(Product).where(Product.id == review_data.product_id)
    ).first()

    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )

    if not user_has_paid_purchase_for_product(session, user_id, review_data.product_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only review products you have purchased.",
        )

    # Check if user already reviewed this product
    existing_review = session.exec(
        select(Review).where(
            Review.user_id == user_id,
            Review.product_id == review_data.product_id
        )
    ).first()

    if existing_review:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You have already reviewed this product"
        )

    review = Review(
        user_id=user_id,
        product_id=review_data.product_id,
        rating=review_data.rating,
        title=review_data.title,
        content=review_data.content,
        verified_purchase=True,
    )
    session.add(review)
    session.commit()
    session.refresh(review)

    raw = session.exec(
        select(func.avg(Review.rating)).where(Review.product_id == product.id)
    ).first()
    avg_val = float(raw) if raw is not None else 0.0
    product.avg_rating = round(avg_val, 2)
    session.add(product)
    session.commit()

    return review


async def get_product_reviews(
    session: Session,
    product_id: int,
    skip: int = 0,
    limit: int = 10
) -> list[Review]:
    """Get reviews for a product."""
    reviews = session.exec(
        select(Review)
        .where(Review.product_id == product_id)
        .order_by(Review.created_at.desc())
        .offset(skip)
        .limit(limit)
    ).all()
    return reviews


async def list_product_reviews_public(
    session: Session,
    product_id: int,
    skip: int = 0,
    limit: int = 10,
) -> list[ReviewPublic]:
    reviews = await get_product_reviews(session, product_id, skip=skip, limit=limit)
    if not reviews:
        return []
    user_ids = list({r.user_id for r in reviews})
    by_id = users_public_profiles_for_ids(session, user_ids)
    media_by_review = _media_for_reviews(session, [r.id for r in reviews])
    out: list[ReviewPublic] = []
    for r in reviews:
        u = by_id.get(r.user_id)
        out.append(
            ReviewPublic(
                id=r.id,
                product_id=r.product_id,
                rating=r.rating,
                title=r.title,
                content=r.content,
                created_at=r.created_at,
                reviewer_name=_reviewer_first_name(u),
                media=media_by_review.get(r.id, []),
            )
        )
    return out


async def get_user_reviews(session: Session, user_id: int) -> list[Review]:
    """Get all reviews by a user."""
    reviews = session.exec(
        select(Review)
        .where(Review.user_id == user_id)
        .order_by(Review.created_at.desc())
    ).all()
    return reviews


async def delete_review(session: Session, review_id: int, user_id: int) -> None:
    """Delete a review (only if user owns it)."""
    review = session.exec(
        select(Review).where(Review.id == review_id)
    ).first()

    if not review:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Review not found"
        )

    if review.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this review"
        )

    session.delete(review)
    session.commit()
