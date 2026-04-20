from datetime import datetime, timedelta

import pyotp
from fastapi import HTTPException, status
from sqlmodel import Session, select

from app.core.config import settings
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_refresh_token,
    hash_password,
    verify_password,
)
from app.models import TokenBlacklist, TokenResponse, TwoFactorSecret, User, UserCreate, UserRead


def as_user_read(user: User) -> UserRead:
    return UserRead(
        id=user.id or 0,
        email=user.email,
        full_name=user.full_name,
        is_admin=user.is_admin,
        admin_role=user.admin_role,
    )


def issue_tokens(user: User) -> TokenResponse:
    return TokenResponse(
        access_token=create_access_token(str(user.id)),
        refresh_token=create_refresh_token(str(user.id)),
        expires_in=settings.access_token_expire_minutes * 60,
        user=as_user_read(user),
    )


def register_user(session: Session, payload: UserCreate) -> TokenResponse:
    existing = session.exec(select(User).where(User.email == payload.email.lower())).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(
        email=payload.email.lower(),
        full_name=payload.full_name.strip(),
        password_hash=hash_password(payload.password),
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return issue_tokens(user)


def authenticate_user(session: Session, identifier: str, password: str) -> User:
    user = session.exec(select(User).where(User.email == identifier.lower())).first()
    if not user or not verify_password(password, user.password_hash):
        raise HTTPException(status_code=400, detail="Invalid email or password")
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
                password_hash=hash_password(sub),
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
