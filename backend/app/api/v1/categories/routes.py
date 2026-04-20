from fastapi import APIRouter, Depends
from sqlmodel import Session, select

from app.db import get_session
from app.models import Category

router = APIRouter(prefix="/categories", tags=["Categories"])


@router.get("", response_model=list[Category])
def get_categories(session: Session = Depends(get_session)):
    statement = select(Category).where(Category.is_active.is_(True)).order_by(Category.sort_order.asc())
    return list(session.exec(statement))
