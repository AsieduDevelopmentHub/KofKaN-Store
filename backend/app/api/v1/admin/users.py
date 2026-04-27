from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlmodel import Session, select

from app.api.v1.auth.dependencies import require_admin_permission
from app.core.security import get_password_hash
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


class StaffAccountCreate(BaseModel):
    username: str = Field(min_length=2, max_length=120)
    name: str = Field(min_length=2, max_length=120)
    email: str = Field(min_length=5, max_length=255)
    password: str = Field(min_length=6, max_length=200)
    role: str = Field(default="staff", max_length=32)
    permissions: list[str] = Field(default_factory=list)


@router.post("/staff-accounts", status_code=status.HTTP_201_CREATED)
def create_staff_account(
    body: StaffAccountCreate,
    current_user: User = Depends(require_admin_permission("manage_users")),
    session: Session = Depends(get_session),
):
    _ = current_user
    email = body.email.strip().lower()
    username = body.username.strip().lower()
    if session.exec(select(User).where(User.email == email)).first():
        raise HTTPException(status_code=400, detail="Email already exists")
    if session.exec(select(User).where(User.username == username)).first():
        raise HTTPException(status_code=400, detail="Username already exists")

    u = User(
        email=email,
        full_name=body.name.strip(),
        username=username,
        password_hash=get_password_hash(body.password),
        is_admin=True,
        admin_role=body.role.strip().lower(),
        admin_permissions=",".join([p.strip() for p in body.permissions if p.strip()]),
        is_active=True,
        updated_at=datetime.utcnow(),
    )
    session.add(u)
    session.commit()
    session.refresh(u)
    return u


@router.patch("/{user_id}/deactivate")
def deactivate_user(
    user_id: int,
    current_user: User = Depends(require_admin_permission("manage_users")),
    session: Session = Depends(get_session),
):
    _ = current_user
    u = session.get(User, user_id)
    if not u:
        raise HTTPException(status_code=404, detail="User not found")
    u.is_active = False
    u.updated_at = datetime.utcnow()
    session.add(u)
    session.commit()
    return {"message": "deactivated"}


@router.patch("/{user_id}/activate")
def activate_user(
    user_id: int,
    current_user: User = Depends(require_admin_permission("manage_users")),
    session: Session = Depends(get_session),
):
    _ = current_user
    u = session.get(User, user_id)
    if not u:
        raise HTTPException(status_code=404, detail="User not found")
    u.is_active = True
    u.updated_at = datetime.utcnow()
    session.add(u)
    session.commit()
    return {"message": "activated"}


@router.patch("/{user_id}/promote-admin")
def promote_admin(
    user_id: int,
    current_user: User = Depends(require_admin_permission("manage_users")),
    session: Session = Depends(get_session),
):
    _ = current_user
    u = session.get(User, user_id)
    if not u:
        raise HTTPException(status_code=404, detail="User not found")
    u.is_admin = True
    if not (u.admin_role or "").strip():
        u.admin_role = "admin"
    u.updated_at = datetime.utcnow()
    session.add(u)
    session.commit()
    return {"message": "promoted"}


@router.patch("/{user_id}/revoke-admin")
def revoke_admin(
    user_id: int,
    current_user: User = Depends(require_admin_permission("manage_users")),
    session: Session = Depends(get_session),
):
    _ = current_user
    u = session.get(User, user_id)
    if not u:
        raise HTTPException(status_code=404, detail="User not found")
    u.is_admin = False
    u.admin_role = "customer"
    u.admin_permissions = ""
    u.updated_at = datetime.utcnow()
    session.add(u)
    session.commit()
    return {"message": "revoked"}


class StaffRoleUpdate(BaseModel):
    role: str = Field(default="staff", max_length=32)
    permissions: list[str] = Field(default_factory=list)


@router.patch("/{user_id}/staff-role")
def set_staff_role(
    user_id: int,
    body: StaffRoleUpdate,
    current_user: User = Depends(require_admin_permission("manage_users")),
    session: Session = Depends(get_session),
):
    _ = current_user
    u = session.get(User, user_id)
    if not u:
        raise HTTPException(status_code=404, detail="User not found")
    u.is_admin = True
    u.admin_role = body.role.strip().lower()
    u.admin_permissions = ",".join([p.strip() for p in body.permissions if p.strip()])
    u.updated_at = datetime.utcnow()
    session.add(u)
    session.commit()
    session.refresh(u)
    return u
