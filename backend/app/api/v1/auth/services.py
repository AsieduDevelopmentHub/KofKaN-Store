"""
Authentication services - comprehensive business logic for all auth operations.
"""
from fastapi import HTTPException, status, BackgroundTasks
from sqlmodel import Session, select
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv
import logging
import os
import re
from urllib.parse import quote

logger = logging.getLogger(__name__)

from app.core.security import (
    ACCESS_TOKEN_EXPIRE_MINUTES,
    get_password_hash,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_refresh_token,
    generate_otp_code,
    generate_password_reset_token,
    generate_backup_codes,
    generate_totp_secret,
    verify_totp_code,
    get_totp_qr_code,
    encrypt_totp_secret,
    decrypt_totp_secret,
    decode_access_token,
)
from app.core.email_service import email_service
from app.db import apply_postgres_session_user
from app.core.pg_rls_auth import (
    email_exists,
    email_taken_except,
    fetch_password_reset_row,
    fetch_user_by_subject,
    fetch_user_for_login,
    username_exists,
    username_taken_except,
)
from app.models import (
    User,
    TokenBlacklist,
    OTPCode,
    TwoFactorSecret,
    PasswordReset,
    UserRead,
)

# Load environment variables
load_dotenv()

# Configuration
frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
_USERNAME_RE = re.compile(r"^[a-z0-9._-]{3,50}$")


def _normalize_username(raw: str) -> str:
    return raw.strip().lower()


def _identifier_is_email(identifier: str) -> bool:
    return "@" in identifier and "." in identifier


def _load_user_by_token_subject(session: Session, sub: str | None) -> User | None:
    if not sub:
        return None
    return fetch_user_by_subject(session, str(sub))

# ============ User Registration ============
def register_user(
    session: Session,
    username: str,
    name: str,
    password: str,
    email: str | None = None,
    background_tasks: BackgroundTasks | None = None,
) -> User:
    """Register a new user."""
    username = _normalize_username(username)
    if not _USERNAME_RE.fullmatch(username):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username must be 3-50 chars: lowercase letters, numbers, dot, underscore, hyphen",
        )

    if username_exists(session, username):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already taken"
        )

    if email:
        email = email.strip().lower()
        if email_exists(session, email):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered",
            )

    # Create user
    user = User(
        username=username,
        name=name,
        email=email,
        hashed_password=get_password_hash(password),
        first_name=name,
        last_name=None,
        email_verified=False,
        email_is_placeholder=False,
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    apply_postgres_session_user(session, user.id)

    if email:
        # Generate and send OTP for email verification
        otp_code = generate_otp_code()
        otp = OTPCode(
            user_id=user.id,
            code=otp_code,
            purpose="email_verification",
            expires_at=datetime.now(timezone.utc) + timedelta(hours=24)
        )
        session.add(otp)
        session.commit()

        # Send welcome email (via BackgroundTasks or fallback)
        email_service.send_welcome_email(user.email, user.name, background_tasks=background_tasks)

        # Send verification email (via BackgroundTasks or fallback)
        email_service.send_email_verification(user.email, otp_code, user.name, background_tasks=background_tasks)

    return user


# ============ User Login ============
def authenticate_user(session: Session, identifier: str, password: str) -> User:
    """Authenticate user and return user object."""
    ident = identifier.strip().lower()
    user = fetch_user_for_login(session, ident)
    if not user or not verify_password(password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username/email or password"
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive"
        )

    return user


def create_user_tokens(user: User) -> dict:
    """Create access and refresh tokens for user."""
    subject = str(user.id)
    access_token = create_access_token({"sub": subject})
    refresh_token = create_refresh_token({"sub": subject})

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    }


# ============ Token Refresh ============
def refresh_access_token(session: Session, refresh_token: str) -> dict:
    """Generate new access token from refresh token."""
    try:
        payload = decode_refresh_token(refresh_token)
        subject = payload.get("sub")
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )

    user = _load_user_by_token_subject(session, subject)
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive"
        )

    subject = str(user.id)
    new_access_token = create_access_token({"sub": subject})
    new_refresh_token = create_refresh_token({"sub": subject})

    return {
        "access_token": new_access_token,
        "refresh_token": new_refresh_token,
        "token_type": "bearer",
        "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    }


# ============ Logout & Token Blacklist ============
def logout_user(session: Session, user_id: int, token: str) -> None:
    """Add token to blacklist for logout, expiring at the token's own exp time."""
    # Use the token's own exp claim so blacklist entries are pruned correctly
    # even when ACCESS_TOKEN_EXPIRE_MINUTES is changed via env.
    payload = decode_access_token(token) or {}
    exp = payload.get("exp")
    if exp:
        expires_at = datetime.fromtimestamp(exp, tz=timezone.utc)
    else:
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    blacklist_entry = TokenBlacklist(
        user_id=user_id,
        token=token,
        expires_at=expires_at
    )
    session.add(blacklist_entry)
    session.commit()


# ============ Email Verification ============
def verify_email(session: Session, email: str, code: str, background_tasks: BackgroundTasks | None = None) -> User:
    """Verify email using OTP code."""
    user = fetch_user_for_login(session, email.strip().lower())
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired OTP code"
        )
    if user.email_is_placeholder:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This account uses a payment-only email. Add a real email in your profile to verify.",
        )
    apply_postgres_session_user(session, user.id)

    # Find valid OTP code
    otp = session.exec(
        select(OTPCode)
        .where(OTPCode.user_id == user.id)
        .where(OTPCode.code == code)
        .where(OTPCode.purpose == "email_verification")
        .where(OTPCode.used == False)
    ).first()

    if not otp:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired OTP code"
        )

    if otp.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OTP code has expired"
        )

    # Mark OTP as used and user email as verified
    otp.used = True
    user.email_verified = True
    session.add(otp)
    session.add(user)
    session.commit()
    session.refresh(user)

    # Send welcome email (via BackgroundTasks or fallback)
    email_service.send_welcome_email(user.email, user.name, background_tasks=background_tasks)

    return user


# ============ Password Reset ============
def request_password_reset(session: Session, email: str, background_tasks: BackgroundTasks | None = None) -> None:
    """Request password reset - generate token and send email."""
    user = fetch_user_for_login(session, email.strip().lower())
    if not user:
        # Don't reveal if user exists for security
        return None
    apply_postgres_session_user(session, user.id)

    # Generate reset token
    reset_token = generate_password_reset_token()
    password_reset = PasswordReset(
        user_id=user.id,
        token=reset_token,
        expires_at=datetime.now(timezone.utc) + timedelta(hours=1)
    )
    session.add(password_reset)
    session.commit()

    # Send password reset email (via BackgroundTasks or fallback)
    email_service.send_password_reset(user.email, reset_token, user.name, background_tasks=background_tasks)


def reset_password(session: Session, token: str, new_password: str) -> User:
    """Reset password using reset token."""
    password_reset = fetch_password_reset_row(session, token)

    if not password_reset:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token"
        )

    if password_reset.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reset token has expired"
        )

    apply_postgres_session_user(session, password_reset.user_id)

    # Update password
    user = session.get(User, password_reset.user_id)
    user.hashed_password = get_password_hash(new_password)
    password_reset.used = True

    session.add(user)
    session.add(password_reset)
    session.commit()
    session.refresh(user)

    return user


# ============ User Profile ============
def _invalidate_email_verification_otps(session: Session, user_id: int) -> None:
    for otp in session.exec(
        select(OTPCode).where(
            OTPCode.user_id == user_id,
            OTPCode.purpose == "email_verification",
            OTPCode.used == False,  # noqa: E712
        )
    ).all():
        otp.used = True
        session.add(otp)


def _issue_email_verification_otp(session: Session, user: User, background_tasks: BackgroundTasks | None = None) -> None:
    """Create a new email verification OTP and send mail. User row must already include the target email."""
    if not user.email:
        return
    if user.email_is_placeholder:
        return
    apply_postgres_session_user(session, user.id)
    _invalidate_email_verification_otps(session, user.id)
    otp_code = generate_otp_code()
    otp = OTPCode(
        user_id=user.id,
        code=otp_code,
        purpose="email_verification",
        expires_at=datetime.now(timezone.utc) + timedelta(hours=24),
    )
    session.add(otp)
    session.commit()
    email_service.send_email_verification(user.email, otp_code, user.name, background_tasks=background_tasks)


def resend_email_verification(session: Session, user_id: int, background_tasks: BackgroundTasks | None = None) -> None:
    """Resend verification code for the email currently on file (must be unverified)."""
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if not user.email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Add an email to your profile first",
        )
    if user.email_is_placeholder:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Add a real email address in your profile to receive verification codes",
        )
    if user.email_verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email is already verified",
        )
    apply_postgres_session_user(session, user.id)
    _issue_email_verification_otp(session, user)


def update_user_profile(session: Session, user_id: int, patch: dict, background_tasks: BackgroundTasks | None = None) -> User:
    """Apply partial profile updates. Only keys present in `patch` are updated."""
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    old_email_norm = (user.email or "").strip().lower()

    if "username" in patch and patch["username"] is not None:
        uname = _normalize_username(patch["username"])
        if not _USERNAME_RE.fullmatch(uname):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username must be 3-50 chars: lowercase letters, numbers, dot, underscore, hyphen",
            )
        if username_taken_except(session, uname, user_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already taken",
            )
        user.username = uname

    if "name" in patch and patch["name"] is not None:
        user.name = patch["name"]
        user.first_name = patch["name"]
        user.last_name = None

    if "phone" in patch:
        user.phone = patch["phone"]

    if "email" in patch:
        new_email = patch["email"]
        old_norm = (user.email or "").strip().lower()
        if new_email is None:
            user.email = None
            user.email_verified = False
            user.email_is_placeholder = False
        else:
            ne = new_email.strip().lower()
            if ne == old_norm:
                pass
            else:
                if email_taken_except(session, ne, user_id):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Email already registered",
                    )
                user.email = ne
                user.email_verified = False
                user.email_is_placeholder = False

    if "shipping_region" in patch:
        user.shipping_region = patch["shipping_region"]
    if "shipping_city" in patch:
        user.shipping_city = patch["shipping_city"]
    if "shipping_address_line1" in patch:
        user.shipping_address_line1 = patch["shipping_address_line1"]
    if "shipping_address_line2" in patch:
        user.shipping_address_line2 = patch["shipping_address_line2"]
    if "shipping_landmark" in patch:
        user.shipping_landmark = patch["shipping_landmark"]
    if "shipping_contact_name" in patch:
        user.shipping_contact_name = patch["shipping_contact_name"]
    if "shipping_contact_phone" in patch:
        user.shipping_contact_phone = patch["shipping_contact_phone"]

    user.updated_at = datetime.now(timezone.utc)
    session.add(user)
    session.commit()
    session.refresh(user)

    if "email" in patch and patch["email"]:
        new_norm = str(patch["email"]).strip().lower()
        if new_norm and new_norm != old_email_norm:
            _issue_email_verification_otp(session, user)

    return user


def change_password(session: Session, user_id: int, current_password: str, new_password: str) -> User:
    """Change user password."""
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    if not verify_password(current_password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Current password is incorrect"
        )

    user.hashed_password = get_password_hash(new_password)
    user.updated_at = datetime.now(timezone.utc)
    session.add(user)
    session.commit()
    session.refresh(user)

    return user


# ============ Account Deletion ============
def delete_user_account(session: Session, user_id: int, password: str, background_tasks: BackgroundTasks | None = None) -> None:
    """Delete user account (soft delete)."""
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    if not verify_password(password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Password is incorrect"
        )

    # Soft delete — mark as inactive but keep all data
    user.is_active = False
    user.deleted_at = datetime.now(timezone.utc)
    user.updated_at = datetime.now(timezone.utc)
    session.add(user)
    session.commit()

    # Send account deletion confirmation email (dispatched to Celery worker)
    if user.email:
        email_sent = email_service.send_account_deletion(user.email, user.name)
        if not email_sent:
            logger.warning("Failed to queue account deletion email for user_id=%s", user.id)


# ============ 2FA TOTP Setup ============
def setup_two_fa_totp(session: Session, user_id: int) -> dict:
    """Generate TOTP secret and QR code for 2FA setup."""
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    if user.two_fa_enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="2FA is already enabled"
        )

    # Generate secret, QR code, and backup codes
    secret = generate_totp_secret()
    plaintext_codes = generate_backup_codes(10)

    # Generate QR code using raw (unencrypted) secret
    qr_identity = user.email or user.username
    qr_code = get_totp_qr_code(secret, qr_identity, issuer="Sikapa")

    return {
        "secret": secret,
        "qr_code": qr_code,
        "backup_codes": plaintext_codes,  # returned to user ONCE — never stored in plaintext
    }


def enable_two_fa_totp(session: Session, user_id: int, secret: str, backup_codes: list, verification_code: str) -> User:
    """Enable 2FA after verifying the TOTP code."""
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Verify the code against the raw (unencrypted) secret
    if not verify_totp_code(secret, verification_code):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid verification code"
        )

    # Encrypt secret before storing; hash backup codes (never store plaintext)
    import json  # noqa: PLC0415
    encrypted_secret = encrypt_totp_secret(secret)
    hashed_codes = [get_password_hash(c) for c in backup_codes]

    two_fa = TwoFactorSecret(
        user_id=user_id,
        secret=encrypted_secret,
        backup_codes=json.dumps(hashed_codes),
        verified=True,
        verified_at=datetime.now(timezone.utc)
    )
    session.add(two_fa)

    user.two_fa_enabled = True
    user.two_fa_method = "totp"
    user.updated_at = datetime.now(timezone.utc)
    session.add(user)
    session.commit()
    session.refresh(user)

    # Send 2FA enabled notification email (dispatched to Celery worker)
    if user.email:
        email_sent = email_service.send_2fa_enabled(user.email, user.name)
        if not email_sent:
            logger.warning("Failed to queue 2FA-enabled email for user_id=%s", user.id)

    return user


def disable_two_fa(session: Session, user_id: int, password: str) -> User:
    """Disable 2FA."""
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    if not verify_password(password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Password is incorrect"
        )

    # Delete 2FA secret
    two_fa = session.exec(
        select(TwoFactorSecret).where(TwoFactorSecret.user_id == user_id)
    ).first()
    if two_fa:
        session.delete(two_fa)

    user.two_fa_enabled = False
    user.two_fa_method = None
    user.updated_at = datetime.now(timezone.utc)
    session.add(user)
    session.commit()
    session.refresh(user)

    return user


def verify_two_fa_code(session: Session, user_id: int, code: str) -> bool:
    """Verify 2FA TOTP code."""
    two_fa = session.exec(
        select(TwoFactorSecret).where(TwoFactorSecret.user_id == user_id)
    ).first()

    if not two_fa:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="2FA is not enabled"
        )

    # Decrypt secret before verification
    raw_secret = decrypt_totp_secret(two_fa.secret)
    return verify_totp_code(raw_secret, code)


def get_backup_codes(session: Session, user_id: int) -> list[str]:
    """Get backup codes for user."""
    two_fa = session.exec(
        select(TwoFactorSecret).where(TwoFactorSecret.user_id == user_id)
    ).first()

    if not two_fa:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="2FA is not enabled"
        )

    import json
    return json.loads(two_fa.backup_codes)