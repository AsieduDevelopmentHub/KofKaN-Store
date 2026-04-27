"""
Authentication dependencies for FastAPI route protection and token validation.
"""
from __future__ import annotations

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlmodel import Session, select

security = HTTPBearer(scheme_name="BearerAuth", auto_error=False)

from app.core.security import decode_access_token
from app.core.pg_rls_auth import fetch_user_by_subject, pg_rls_enabled
from app.db import get_session
from app.models import User, TokenBlacklist


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    session: Session = Depends(get_session)
) -> User:
    """Validate JWT token and return current user."""
    if not credentials or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid authorization header",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials

    # Check if token is blacklisted
    blacklisted = session.exec(
        select(TokenBlacklist).where(TokenBlacklist.token == token)
    ).first()
    if blacklisted:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has been revoked"
        )

    # Decode token
    try:
        payload = decode_access_token(token)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )

    subject: str = payload.get("sub")
    if subject is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )

    # Get user from database (new tokens use user id; legacy tokens may still carry email/username)
    if pg_rls_enabled():
        user = fetch_user_by_subject(session, str(subject))
    elif str(subject).isdigit():
        user = session.get(User, int(subject))
    else:
        sub = str(subject).strip().lower()
        user = session.exec(select(User).where((User.email == sub) | (User.username == sub))).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )

    return user


async def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """Ensure user is active and return user."""
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive"
        )
    return current_user


async def get_current_active_user_optional(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    session: Session = Depends(get_session),
) -> User | None:
    if not credentials or credentials.scheme.lower() != "bearer":
        return None
    try:
        user = await get_current_user(credentials, session)
        if not user.is_active:
            return None
        return user
    except HTTPException:
        return None


async def get_current_admin_user(
    current_user: User = Depends(get_current_active_user)
) -> User:
    """Ensure user is admin and return user."""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user


def _permission_set(user: User) -> set[str]:
    raw = (user.admin_permissions or "").strip()
    if not raw:
        return set()
    return {p.strip().lower() for p in raw.split(",") if p.strip()}


def require_admin_permission(permission: str):
    """
    Dependency factory for granular admin access.
    super_admin role bypasses explicit permission checks.
    """
    required = permission.strip().lower()

    async def _checker(current_user: User = Depends(get_current_admin_user)) -> User:
        role = (current_user.admin_role or "").strip().lower()
        if role == "super_admin":
            return current_user
        if required in _permission_set(current_user):
            return current_user
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Missing admin permission: {required}",
        )

    return _checker
