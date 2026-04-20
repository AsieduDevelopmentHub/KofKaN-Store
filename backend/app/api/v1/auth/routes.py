from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request, status
from sqlmodel import Session, select

from app.api.v1.auth.dependencies import get_current_active_user
from app.core.config import settings
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_refresh_token,
    hash_password,
    verify_password,
)
from app.db import get_session
from app.models import RefreshTokenRequest, TokenBlacklist, TokenResponse, User, UserCreate, UserLogin, UserRead

router = APIRouter(prefix="/auth", tags=["Auth"])


def _as_user_read(user: User) -> UserRead:
    return UserRead(id=user.id or 0, email=user.email, full_name=user.full_name, is_admin=user.is_admin)

def _issue_tokens(user: User) -> TokenResponse:
    return TokenResponse(
        access_token=create_access_token(str(user.id)),
        refresh_token=create_refresh_token(str(user.id)),
        expires_in=settings.access_token_expire_minutes * 60,
        user=_as_user_read(user),
    )


@router.post("/register", response_model=TokenResponse)
def register(payload: UserCreate, session: Session = Depends(get_session)):
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
    return _issue_tokens(user)


@router.post("/login", response_model=TokenResponse)
def login(payload: UserLogin, session: Session = Depends(get_session)):
    user = session.exec(select(User).where(User.email == payload.email.lower())).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=400, detail="Invalid email or password")
    return _issue_tokens(user)


@router.post("/refresh", response_model=TokenResponse)
def refresh(payload: RefreshTokenRequest, session: Session = Depends(get_session)):
    decoded = decode_refresh_token(payload.refresh_token)
    if not decoded:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")
    subject = decoded.get("sub")
    if not subject or not str(subject).isdigit():
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")
    user = session.get(User, int(subject))
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive")
    return _issue_tokens(user)


@router.post("/logout")
def logout(
    request: Request,
    current_user: User = Depends(get_current_active_user),
    authorization: str | None = Header(default=None),
    session: Session = Depends(get_session),
):
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token")
    token = authorization.split(" ", 1)[1].strip()
    blacklisted = TokenBlacklist(
        user_id=current_user.id or 0,
        token=token,
        expires_at=datetime.utcnow() + timedelta(minutes=settings.access_token_expire_minutes),
    )
    session.add(blacklisted)
    session.commit()
    return {"message": "Logout successful"}


@router.get("/profile", response_model=UserRead)
def profile(current_user: User = Depends(get_current_active_user)):
    return _as_user_read(current_user)


@router.get("/google/url")
def google_oauth_url():
    # Frontend can still use Supabase OAuth directly; this route keeps parity in API surface.
    return {"provider": "google", "url": f"{settings.frontend_base_url}/auth/google/callback"}


@router.get("/google/callback", response_model=TokenResponse)
def google_callback(
    email: str = Query(...),
    name: str = Query(default="Google User"),
    sub: str = Query(...),
    session: Session = Depends(get_session),
):
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
    return _issue_tokens(user)
