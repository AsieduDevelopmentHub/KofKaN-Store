"""
Admin business settings routes.
"""
from typing import List

from fastapi import APIRouter, Depends
from sqlmodel import Session

from app.api.v1.admin.schemas import BusinessSettingRead, BusinessSettingUpsert
from app.api.v1.admin.services import list_business_settings, upsert_business_setting
from app.api.v1.auth.dependencies import require_admin_permission
from app.db import get_session
from app.models import User

router = APIRouter()


@router.get("/", response_model=List[BusinessSettingRead])
async def list_settings_admin(
    session: Session = Depends(get_session),
    current_user: User = Depends(require_admin_permission("manage_settings")),
):
    return await list_business_settings(session)


@router.put("/", response_model=BusinessSettingRead)
async def upsert_setting_admin(
    payload: BusinessSettingUpsert,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_admin_permission("manage_settings")),
):
    return await upsert_business_setting(
        session,
        key=payload.key,
        value=payload.value,
        admin_id=current_user.id,
    )
