from sqlmodel import Session, select

from app.models import Product


def get_product_by_id(session: Session, product_id: int) -> Product | None:
    product = session.get(Product, product_id)
    if not product or not product.is_active:
        return None
    return product


def list_products(
    session: Session,
    search: str | None,
    category_id: int | None,
    featured_only: bool,
    limit: int,
) -> list[Product]:
    statement = select(Product).where(Product.is_active.is_(True))

    if search:
        normalized = f"%{search.lower()}%"
        statement = statement.where(Product.name.ilike(normalized))

    if category_id is not None:
        statement = statement.where(Product.category_id == category_id)

    if featured_only:
        statement = statement.where(Product.is_featured.is_(True))

    statement = statement.order_by(Product.created_at.desc()).limit(limit)
    return list(session.exec(statement))
