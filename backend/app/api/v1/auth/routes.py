from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request, status
from sqlmodel import Session

from app.api.v1.auth.dependencies import get_current_active_user
from app.api.v1.auth.services import (
    as_user_read,
    authenticate_user,
    google_login_or_register,
    issue_tokens,
    logout_user,
    refresh_user_tokens,
    register_user,
    setup_totp,
    verify_totp_and_enable,
)
from app.core.config import settings
from app.core.rate_limit import auth_limiter, login_limiter, register_limiter, token_refresh_limiter
from app.db import get_session
from app.models import RefreshTokenRequest, TokenResponse, TwoFASetupResponse, TwoFAVerifyRequest, User, UserCreate, UserLogin, UserRead

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/register", response_model=TokenResponse)
@register_limiter
def register(request: Request, payload: UserCreate, session: Session = Depends(get_session)):
    return register_user(session, payload)


@router.post("/login", response_model=TokenResponse)
@login_limiter
def login(request: Request, payload: UserLogin, session: Session = Depends(get_session)):
    user = authenticate_user(session, payload.email, payload.password)
    return issue_tokens(user)


@router.post("/refresh", response_model=TokenResponse)
@token_refresh_limiter
def refresh(request: Request, payload: RefreshTokenRequest, session: Session = Depends(get_session)):
    return refresh_user_tokens(session, payload.refresh_token)


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
    logout_user(session, current_user, token)
    return {"message": "Logout successful"}


@router.get("/profile", response_model=UserRead)
def profile(current_user: User = Depends(get_current_active_user)):
    return as_user_read(current_user)


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
    return google_login_or_register(session, email=email, name=name, sub=sub)


@router.post("/2fa/setup", response_model=TwoFASetupResponse)
@auth_limiter
def setup_2fa(
    request: Request,
    current_user: User = Depends(get_current_active_user),
    session: Session = Depends(get_session),
):
    data = setup_totp(session, current_user)
    return TwoFASetupResponse(secret=data["secret"], otp_uri=data["otp_uri"])


@router.post("/2fa/enable")
@auth_limiter
def enable_2fa(
    request: Request,
    payload: TwoFAVerifyRequest,
    current_user: User = Depends(get_current_active_user),
    session: Session = Depends(get_session),
):
    return verify_totp_and_enable(session, current_user, payload.code)
