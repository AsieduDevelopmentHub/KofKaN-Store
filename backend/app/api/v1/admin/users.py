"""
Admin user management routes
"""
from typing import List, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel, Field, EmailStr
from sqlmodel import Session

from app.db import get_session
from app.api.v1.auth.dependencies import require_admin_permission
from app.models import User
from app.api.v1.admin.schemas import UserManagementResponse
from app.api.v1.admin.permission_catalog import permission_catalog_list
from app.api.v1.admin.services import (
    deactivate_user,
    activate_user,
    grant_admin_role,
    revoke_admin_role,
    get_all_users,
    create_staff_account,
    normalize_staff_permissions,
    user_is_super_admin,
    assert_can_assign_super_admin,
)

router = APIRouter()


class StaffRoleUpdate(BaseModel):
    role: str = Field(..., pattern="^(super_admin|admin|staff)$")
    permissions: list[str] = []


class StaffAccountCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    name: str = Field(..., min_length=1, max_length=120)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    role: str = Field(..., pattern="^(super_admin|admin|staff)$")
    permissions: list[str] = []


@router.get("/permission-catalog")
async def get_permission_catalog(
    current_user: User = Depends(require_admin_permission("manage_staff")),
) -> dict[str, Any]:
    """Permission keys allowed for admin/staff roles (used when creating or editing access)."""
    return {"permissions": permission_catalog_list()}


@router.post("/staff-accounts", response_model=UserManagementResponse, status_code=status.HTTP_201_CREATED)
async def create_staff_account_endpoint(
    payload: StaffAccountCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_admin_permission("manage_staff")),
):
    user = create_staff_account(
        session,
        username_raw=payload.username,
        name=payload.name,
        email=payload.email,
        password=payload.password,
        role=payload.role,
        permissions=payload.permissions,
        creator=current_user,
    )
    return UserManagementResponse.model_validate(user)


@router.get("/", response_model=List[UserManagementResponse])
async def list_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    is_active: bool = None,
    is_admin: bool = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_admin_permission("view_users")),
):
    """List all users with optional filters."""
    return await get_all_users(
        session,
        skip=skip,
        limit=limit,
        is_active=is_active,
        is_admin=is_admin,
    )


@router.patch("/{user_id}/deactivate", status_code=status.HTTP_204_NO_CONTENT)
async def deactivate_user_endpoint(
    user_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_admin_permission("manage_users")),
):
    """Deactivate a user."""
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot deactivate yourself",
        )
    await deactivate_user(session, user_id)


@router.patch("/{user_id}/activate", status_code=status.HTTP_204_NO_CONTENT)
async def activate_user_endpoint(
    user_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_admin_permission("manage_users")),
):
    """Activate a user."""
    await activate_user(session, user_id)


@router.patch("/{user_id}/promote-admin", status_code=status.HTTP_204_NO_CONTENT)
async def grant_admin_role_endpoint(
    user_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_admin_permission("manage_staff")),
):
    """Grant admin role to a user."""
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot modify your own admin role",
        )
    await grant_admin_role(session, user_id)


@router.patch("/{user_id}/revoke-admin", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_admin_role_endpoint(
    user_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_admin_permission("manage_staff")),
):
    """Revoke admin role from a user."""
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot revoke admin role from yourself",
        )
    target = session.get(User, user_id)
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if user_is_super_admin(target):
        assert_can_assign_super_admin(current_user)
    await revoke_admin_role(session, user_id)


@router.patch("/{user_id}/staff-role")
async def set_staff_role(
    user_id: int,
    payload: StaffRoleUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_admin_permission("manage_staff")),
):
    if user_id == current_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot modify your own staff role")
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    payload_role = payload.role.strip().lower()
    will_be_super = payload_role == "super_admin"
    if user_is_super_admin(user) or will_be_super:
        assert_can_assign_super_admin(current_user)

    if payload.role in {"super_admin", "admin", "staff"}:
        user.is_admin = True
    user.admin_role = payload_role

    if payload_role == "super_admin":
        user.admin_permissions = ""
    else:
        user.admin_permissions = normalize_staff_permissions(payload.permissions)

    session.add(user)
    session.commit()
    session.refresh(user)
    return UserManagementResponse.model_validate(user)
