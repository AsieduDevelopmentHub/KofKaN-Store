"""
Admin coupon management routes.
"""
from typing import List, Optional

from fastapi import APIRouter, Depends, Query, status
from sqlmodel import Session

from app.api.v1.admin.schemas import CouponCreateUpdate, CouponRead
from app.api.v1.admin.services import create_coupon, delete_coupon, list_coupons, update_coupon
from app.api.v1.auth.dependencies import require_admin_permission
from app.db import get_session
from app.models import User

router = APIRouter()


@router.get("/", response_model=List[CouponRead])
async def list_coupons_admin(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
    is_active: Optional[bool] = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_admin_permission("manage_coupons")),
):
    return await list_coupons(session, skip=skip, limit=limit, is_active=is_active)


@router.post("/", response_model=CouponRead, status_code=status.HTTP_201_CREATED)
async def create_coupon_admin(
    payload: CouponCreateUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_admin_permission("manage_coupons")),
):
    return await create_coupon(session, payload.model_dump(), current_user.id)


@router.put("/{coupon_id}", response_model=CouponRead)
async def update_coupon_admin(
    coupon_id: int,
    payload: CouponCreateUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_admin_permission("manage_coupons")),
):
    return await update_coupon(session, coupon_id, payload.model_dump())


@router.delete("/{coupon_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_coupon_admin(
    coupon_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_admin_permission("manage_coupons")),
):
    await delete_coupon(session, coupon_id)
