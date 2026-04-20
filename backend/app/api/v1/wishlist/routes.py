from fastapi import APIRouter, Depends
from sqlmodel import Session

from app.api.v1.auth.dependencies import get_current_active_user
from app.db import get_session
from app.models import Product, User
from app.api.v1.wishlist.schemas import WishlistAddRequest, WishlistMessage
from app.api.v1.wishlist.services import add_product_to_wishlist, list_wishlist_products, remove_product_from_wishlist

router = APIRouter(prefix="/wishlist", tags=["Wishlist"])


@router.get("")
def list_wishlist(current_user: User = Depends(get_current_active_user), session: Session = Depends(get_session)):
    return list_wishlist_products(session=session, user=current_user)


@router.post("")
def add_to_wishlist(
    payload: WishlistAddRequest, current_user: User = Depends(get_current_active_user), session: Session = Depends(get_session)
) -> WishlistMessage:
    add_product_to_wishlist(session=session, user=current_user, product_id=payload.product_id)
    return WishlistMessage(message="Added to wishlist")


@router.delete("/{product_id}")
def remove_from_wishlist(
    product_id: int, current_user: User = Depends(get_current_active_user), session: Session = Depends(get_session)
) -> WishlistMessage:
    remove_product_from_wishlist(session=session, user=current_user, product_id=product_id)
    return WishlistMessage(message="Removed from wishlist")
