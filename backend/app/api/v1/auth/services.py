import re
from datetime import datetime, timedelta

import pyotp
from fastapi import HTTPException, status
from sqlmodel import Session, select

from app.core.config import settings
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_refresh_token,
    get_password_hash,
    verify_password,
)
from app.models import (
    TokenBlacklist,
    TokenResponse,
    TwoFactorSecret,
    User,
    UserCreate,
    UserProfileRead,
    UserRead,
)

PLACEHOLDER_EMAIL_DOMAIN = "users.kofkan.local"


def as_user_read(user: User) -> UserRead:
    return UserRead(
        id=user.id or 0,
        email=user.email,
        full_name=user.full_name,
        is_admin=user.is_admin,
        admin_role=user.admin_role,
    )


def _two_fa_enabled(session: Session, user: User) -> bool:
    record = session.exec(
        select(TwoFactorSecret).where(TwoFactorSecret.user_id == user.id)
    ).first()
    return bool(record and record.verified)


def _email_is_placeholder(email: str | None) -> bool:
    return bool(email and email.endswith(f"@{PLACEHOLDER_EMAIL_DOMAIN}"))


def as_user_profile(session: Session, user: User) -> UserProfileRead:
    name = (user.full_name or user.username or (user.email or "").split("@")[0]).strip()
    username = (user.username or (user.email or "").split("@")[0] or "user").strip()
    return UserProfileRead(
        id=user.id or 0,
        username=username,
        name=name,
        email=user.email if not _email_is_placeholder(user.email) else None,
        email_is_placeholder=_email_is_placeholder(user.email),
        phone=user.phone,
        email_verified=bool(user.is_email_verified),
        two_fa_enabled=_two_fa_enabled(session, user),
        is_active=user.is_active,
        is_admin=user.is_admin,
        admin_role=user.admin_role,
        admin_permissions=user.admin_permissions or None,
        created_at=user.created_at,
        updated_at=user.updated_at or user.created_at,
    )


def issue_tokens(user: User) -> TokenResponse:
    payload = {"sub": str(user.id)}
    return TokenResponse(
        access_token=create_access_token(payload),
        refresh_token=create_refresh_token(payload),
        expires_in=settings.access_token_expire_minutes * 60,
        user=as_user_read(user),
    )


def _slugify_username(raw: str) -> str:
    cleaned = re.sub(r"[^a-z0-9._-]+", "", raw.strip().lower())
    return cleaned or "user"


def register_user(session: Session, payload: UserCreate) -> TokenResponse:
    raw_username = (payload.username or "").strip()
    raw_email = (payload.email or "").strip().lower()
    raw_name = (payload.name or payload.full_name or raw_username).strip()
    if not payload.password:
        raise HTTPException(status_code=400, detail="Password is required")
    if not raw_username and not raw_email:
        raise HTTPException(status_code=400, detail="Username or email is required")
    if not raw_name:
        raise HTTPException(status_code=400, detail="Display name is required")

    username = _slugify_username(raw_username or raw_email.split("@")[0])
    email = raw_email or f"{username}@{PLACEHOLDER_EMAIL_DOMAIN}"

    if session.exec(select(User).where(User.email == email)).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    if session.exec(select(User).where(User.username == username)).first():
        raise HTTPException(status_code=400, detail="Username already taken")

    user = User(
        email=email,
        full_name=raw_name,
        username=username,
        phone=(payload.phone or None),
        password_hash=get_password_hash(payload.password),
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return issue_tokens(user)


def authenticate_user(session: Session, identifier: str, password: str) -> User:
    """Look up by email or username, then verify password."""
    needle = (identifier or "").strip()
    if not needle:
        raise HTTPException(status_code=400, detail="Identifier is required")
    user = session.exec(select(User).where(User.email == needle.lower())).first()
    if not user:
        user = session.exec(select(User).where(User.username == needle.lower())).first()
    if not user or not verify_password(password, user.password_hash):
        raise HTTPException(status_code=400, detail="Invalid credentials")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="User account is inactive")
    return user


def refresh_user_tokens(session: Session, refresh_token: str) -> TokenResponse:
    decoded = decode_refresh_token(refresh_token)
    if not decoded:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")
    subject = decoded.get("sub")
    if not subject or not str(subject).isdigit():
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")
    user = session.get(User, int(subject))
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive")
    return issue_tokens(user)


def logout_user(session: Session, user: User, token: str) -> None:
    blacklisted = TokenBlacklist(
        user_id=user.id or 0,
        token=token,
        expires_at=datetime.utcnow() + timedelta(minutes=settings.access_token_expire_minutes),
    )
    session.add(blacklisted)
    session.commit()


def google_login_or_register(session: Session, email: str, name: str, sub: str) -> TokenResponse:
    user = session.exec(select(User).where(User.google_sub == sub)).first()
    if not user:
        user = session.exec(select(User).where(User.email == email.lower())).first()
        if user:
            user.google_sub = sub
        else:
            user = User(
                email=email.lower(),
                full_name=name,
                password_hash=get_password_hash(sub),
                google_sub=sub,
            )
            session.add(user)
        session.commit()
        session.refresh(user)
    return issue_tokens(user)


def setup_totp(session: Session, user: User) -> dict:
    existing = session.exec(select(TwoFactorSecret).where(TwoFactorSecret.user_id == user.id)).first()
    secret = existing.secret if existing else pyotp.random_base32()
    otp_uri = pyotp.TOTP(secret).provisioning_uri(name=user.email, issuer_name="KofKaN Store")
    if not existing:
        session.add(TwoFactorSecret(user_id=user.id or 0, secret=secret, verified=False))
        session.commit()
    return {"secret": secret, "otp_uri": otp_uri}


def verify_totp_and_enable(session: Session, user: User, code: str) -> dict:
    record = session.exec(select(TwoFactorSecret).where(TwoFactorSecret.user_id == user.id)).first()
    if not record:
        raise HTTPException(status_code=400, detail="2FA setup has not been initialized")
    if not pyotp.TOTP(record.secret).verify(code, valid_window=1):
        raise HTTPException(status_code=401, detail="Invalid 2FA code")
    record.verified = True
    record.verified_at = datetime.utcnow()
    session.add(record)
    session.commit()
    return {"message": "2FA enabled successfully"}
