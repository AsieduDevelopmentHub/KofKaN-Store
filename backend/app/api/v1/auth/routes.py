"""
Authentication API routes - all endpoints for user auth flows.
"""
import os
from urllib.parse import quote, urlencode

from fastapi import APIRouter, Depends, HTTPException, status, Header, Request, BackgroundTasks
from fastapi.responses import RedirectResponse
from sqlmodel import Session

from app.api.v1.auth.google_oauth import (
    build_google_authorize_url,
    create_google_oauth_state,
    google_oauth_configured,
    resolve_google_oauth_user,
)

from app.api.v1.auth.schemas import (
    RegisterRequest,
    LoginRequest,
    TokenResponse,
    PasswordResetRequest,
    PasswordResetConfirm,
    VerifyEmailRequest,
    UserProfileResponse,
    UserProfileUpdate,
    ChangePasswordRequest,
    TwoFASetupResponse,
    TwoFAVerifyRequest,
    TwoFAEnableRequest,
    LoginWithTwoFARequest,
    DeleteAccountRequest,
    RefreshTokenRequest,
    GoogleOAuth2FAVerifyRequest,
)
from sqlmodel import SQLModel
from pydantic import Field as PydanticField


class DisableTwoFARequest(SQLModel):
    """Typed request body for disabling 2FA (replaces unvalidated raw dict)."""
    password: str = PydanticField(min_length=1, max_length=128)
from app.api.v1.auth.services import (
    register_user,
    authenticate_user,
    create_user_tokens,
    refresh_access_token,
    logout_user,
    verify_email,
    request_password_reset,
    reset_password,
    update_user_profile,
    resend_email_verification,
    change_password,
    delete_user_account,
    setup_two_fa_totp,
    enable_two_fa_totp,
    disable_two_fa,
    verify_two_fa_code,
    get_backup_codes,
)
from app.api.v1.auth.dependencies import (
    get_current_user,
    get_current_active_user,
    get_current_admin_user,
)
from app.db import get_session
from app.models import User, UserRead
from app.core.security import create_oauth_2fa_pending_token
from app.core.rate_limit import (
    auth_limiter,
    login_limiter,
    password_reset_confirm_limiter,
    password_reset_limiter,
    password_reset_request_limiter,
    register_limiter,
    token_refresh_limiter,
)

router = APIRouter()

# ============ REGISTRATION & LOGIN ============

@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
@register_limiter
def register_endpoint(
    request: Request,
    payload: RegisterRequest,
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session)
):
    """Register a new user account."""
    user = register_user(
        session=session,
        username=payload.username,
        name=payload.name,
        email=payload.email,
        password=payload.password,
        background_tasks=background_tasks,
    )
    return user


@router.post("/login", response_model=TokenResponse)
@login_limiter
def login_endpoint(
    request: Request,
    payload: LoginRequest,
    session: Session = Depends(get_session)
):
    """Login user and return access/refresh tokens."""
    user = authenticate_user(session, payload.identifier, payload.password)
    if user.two_fa_enabled:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="two_factor_required",
        )
    tokens = create_user_tokens(user)
    return tokens


@router.post("/login-2fa", response_model=TokenResponse)
@login_limiter
def login_with_2fa_endpoint(
    request: Request,
    payload: LoginWithTwoFARequest,
    session: Session = Depends(get_session)
):
    """Login with 2FA verification code."""
    user = authenticate_user(session, payload.identifier, payload.password)

    if not user.two_fa_enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="2FA is not enabled for this account"
        )

    # Verify 2FA code
    if not verify_two_fa_code(session, user.id, payload.code):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid 2FA code"
        )

    tokens = create_user_tokens(user)
    return tokens


@router.get("/google/start")
@login_limiter
def google_oauth_start(request: Request):
    """Redirect browser to Google's consent screen (must match GOOGLE_OAUTH_* env)."""
    frontend = os.getenv("FRONTEND_URL", "http://localhost:3000").rstrip("/")
    if not google_oauth_configured():
        return RedirectResponse(f"{frontend}/account?oauth_error=config", status_code=302)
    state = create_google_oauth_state()
    url = build_google_authorize_url(state)
    return RedirectResponse(url, status_code=302)


@router.get("/google/callback")
@login_limiter
def google_oauth_callback(
    request: Request,
    session: Session = Depends(get_session),
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
):
    """OAuth redirect target — exchanges code, issues Sikapa JWTs, redirects to the SPA."""
    frontend = os.getenv("FRONTEND_URL", "http://localhost:3000").rstrip("/")
    if error:
        return RedirectResponse(f"{frontend}/account?oauth_error={quote(error)}", status_code=302)
    try:
        user = resolve_google_oauth_user(session, code, state)
    except HTTPException as he:
        detail = he.detail
        if isinstance(detail, list) and detail:
            detail = detail[0]
        msg = detail if isinstance(detail, str) else "oauth_failed"
        return RedirectResponse(f"{frontend}/account?oauth_error={quote(msg)}", status_code=302)

    if user.two_fa_enabled:
        pending = create_oauth_2fa_pending_token(user.id)
        frag = urlencode({"pending_2fa_token": pending})
        return RedirectResponse(f"{frontend}/auth/google/2fa#{frag}", status_code=302)

    tokens = create_user_tokens(user)
    frag = urlencode({
        "access_token": tokens["access_token"],
        "refresh_token": tokens["refresh_token"],
        "token_type": tokens["token_type"],
        "expires_in": str(tokens["expires_in"]),
    })
    return RedirectResponse(f"{frontend}/auth/google/callback#{frag}", status_code=302)


@router.post("/google/verify-2fa", response_model=TokenResponse)
@login_limiter
def google_oauth_verify_2fa(
    request: Request,
    payload: GoogleOAuth2FAVerifyRequest,
    session: Session = Depends(get_session),
):
    """Issue JWTs after Google OAuth when TOTP 2FA is enabled (pending token from /google/callback)."""
    from jose import JWTError

    from app.core.security import decode_oauth_2fa_pending_token

    try:
        data = decode_oauth_2fa_pending_token(payload.pending_token)
        uid = int(data.get("sub", 0))
    except (JWTError, ValueError, TypeError):
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED,
            "Invalid or expired sign-in session. Please try Google sign-in again.",
        )

    user = session.get(User, uid)
    if not user or not user.is_active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User not found or inactive")

    if not user.two_fa_enabled:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            detail="Two-factor verification is not required for this account",
        )

    if not verify_two_fa_code(session, user.id, payload.code):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Invalid authentication code")

    return create_user_tokens(user)


@router.post("/logout")
def logout_endpoint(
    current_user: User = Depends(get_current_active_user),
    authorization: str = Header(None),
    session: Session = Depends(get_session)
):
    """Logout user by blacklisting current token."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid authorization header"
        )

    token = authorization.replace("Bearer ", "")
    logout_user(session, current_user.id, token)

    return {"message": "Logout successful"}


# ============ EMAIL VERIFICATION ============

@router.post("/verify-email")
@auth_limiter  # 10 verification attempts per minute per IP
def verify_email_endpoint(
    request: Request,
    payload: VerifyEmailRequest,
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session)
):
    """Verify email address using OTP code."""
    user = verify_email(session, payload.email, payload.code, background_tasks=background_tasks)
    return {
        "message": "Email verified successfully",
        "email": user.email,
        "verified": user.email_verified
    }


# ============ PASSWORD RESET ============

@router.post("/password-reset/request")
@password_reset_request_limiter  # 3 password reset requests per minute per IP
def request_password_reset_endpoint(
    request: Request,
    payload: PasswordResetRequest,
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session)
):
    """Request password reset - send token to email."""
    request_password_reset(session, payload.email, background_tasks=background_tasks)
    # Always return success for security (don't leak email existence)
    return {"message": "If email exists, reset link has been sent"}


@router.post("/password-reset/confirm")
@password_reset_confirm_limiter  # 5 password reset confirmations per minute per IP
def reset_password_endpoint(
    request: Request,
    payload: PasswordResetConfirm,
    session: Session = Depends(get_session)
):
    """Reset password using reset token."""
    user = reset_password(session, payload.token, payload.new_password)
    return {
        "message": "Password reset successfully",
        "email": user.email
    }


# ============ TOKEN MANAGEMENT ============

@router.post("/refresh", response_model=TokenResponse)
@token_refresh_limiter  # 5 token refresh requests per minute per IP
def refresh_token_endpoint(
    request: Request,
    payload: RefreshTokenRequest,
    session: Session = Depends(get_session)
):
    """Refresh access token using refresh token."""
    new_tokens = refresh_access_token(session, payload.refresh_token)
    return new_tokens


# ============ PROFILE MANAGEMENT ============

@router.get("/profile", response_model=UserProfileResponse)
def get_profile_endpoint(
    current_user: User = Depends(get_current_active_user)
):
    """Get current user profile."""
    return UserProfileResponse.model_validate(current_user)


@router.put("/profile", response_model=UserProfileResponse)
def update_profile_endpoint(
    request: UserProfileUpdate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_active_user),
    session: Session = Depends(get_session)
):
    """Update user profile information."""
    patch = request.model_dump(exclude_unset=True)
    updated_user = update_user_profile(session, current_user.id, patch, background_tasks=background_tasks)
    return UserProfileResponse.model_validate(updated_user)


@router.post("/resend-email-verification")
@auth_limiter
def resend_email_verification_endpoint(
    request: Request,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_active_user),
    session: Session = Depends(get_session),
):
    """Send a new email verification code to the address on file."""
    resend_email_verification(session, current_user.id, background_tasks=background_tasks)
    return {"message": "Verification code sent"}


# ============ PASSWORD MANAGEMENT ============

@router.post("/password/change")
def change_password_endpoint(
    request: ChangePasswordRequest,
    current_user: User = Depends(get_current_active_user),
    session: Session = Depends(get_session)
):
    """Change user password."""
    change_password(
        session,
        current_user.id,
        request.current_password,
        request.new_password,
    )
    return {"message": "Password changed successfully"}


# ============ 2FA TOTP ============

@router.post("/2fa/setup", response_model=TwoFASetupResponse)
def setup_2fa_endpoint(
    current_user: User = Depends(get_current_active_user),
    session: Session = Depends(get_session)
):
    """Setup 2FA - generate TOTP secret and QR code."""
    setup_data = setup_two_fa_totp(session, current_user.id)
    return TwoFASetupResponse(
        secret=setup_data["secret"],
        qr_code=setup_data["qr_code"],
        backup_codes=setup_data["backup_codes"],
    )


@router.post("/2fa/enable")
def enable_2fa_endpoint(
    request: TwoFAEnableRequest,
    current_user: User = Depends(get_current_active_user),
    session: Session = Depends(get_session)
):
    """Enable 2FA after verification."""
    user = enable_two_fa_totp(
        session,
        current_user.id,
        request.secret,
        request.backup_codes,
        request.verification_code,
    )
    return {
        "message": "2FA enabled successfully",
        "two_fa_enabled": user.two_fa_enabled,
        "two_fa_method": user.two_fa_method,
    }


@router.post("/2fa/disable")
def disable_2fa_endpoint(
    request: DisableTwoFARequest,
    current_user: User = Depends(get_current_active_user),
    session: Session = Depends(get_session)
):
    """Disable 2FA."""
    user = disable_two_fa(session, current_user.id, request.password)
    return {
        "message": "2FA disabled successfully",
        "two_fa_enabled": user.two_fa_enabled,
    }


@router.get("/2fa/backup-codes")
def get_backup_codes_endpoint(
    current_user: User = Depends(get_current_active_user),
    session: Session = Depends(get_session)
):
    """Get backup codes for 2FA."""
    codes = get_backup_codes(session, current_user.id)
    return {"backup_codes": codes}


# ============ ACCOUNT MANAGEMENT ============

@router.post("/account/delete")
def delete_account_endpoint(
    request: DeleteAccountRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_active_user),
    session: Session = Depends(get_session)
):
    """Delete user account (irreversible)."""
    delete_user_account(session, current_user.id, request.password, background_tasks=background_tasks)
    return {"message": "Account deleted successfully"}
