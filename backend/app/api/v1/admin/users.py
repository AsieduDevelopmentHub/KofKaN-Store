from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlmodel import Session, select

from app.api.v1.auth.dependencies import require_admin_permission
from app.db import get_session
from app.models import User

router = APIRouter(prefix="/users", tags=["Admin"])


class AdminUserUpdateRequest(BaseModel):
    is_active: bool | None = None
    is_admin: bool | None = None
    admin_role: str | None = Field(default=None, max_length=32)
    admin_permissions: str | None = Field(default=None, max_length=4000)


@router.get("")
def list_users(
    current_user: User = Depends(require_admin_permission("view_dashboard")),
    session: Session = Depends(get_session),
):
    _ = current_user
    return session.exec(select(User).order_by(User.created_at.desc())).all()


@router.patch("/{user_id}")
def update_user(
    user_id: int,
    payload: AdminUserUpdateRequest,
    current_user: User = Depends(require_admin_permission("view_dashboard")),
    session: Session = Depends(get_session),
):
    _ = current_user
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    updates = payload.model_dump(exclude_unset=True)
    for key, value in updates.items():
        setattr(user, key, value)
    session.add(user)
    session.commit()
    session.refresh(user)
    return user
