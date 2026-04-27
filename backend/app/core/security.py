"""
Security utilities — JWT tokens, password hashing, OTP, TOTP, backup codes.

JWT library: authlib (replaces unmaintained python-jose / CVE-2024-33664)
TOTP encryption: Fernet (AES-128-CBC + HMAC-SHA256) via cryptography package.
"""
from __future__ import annotations

import base64
import logging
import os
import secrets
import string
from datetime import datetime, timedelta, timezone

from authlib.jose import JsonWebToken, JoseError
from authlib.jose.errors import ExpiredTokenError, InvalidClaimError
from cryptography.fernet import Fernet, InvalidToken
from dotenv import load_dotenv
from passlib.context import CryptContext
from passlib.exc import MissingBackendError, UnknownHashError

load_dotenv()

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# JWT configuration
# ---------------------------------------------------------------------------
SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    is_production = os.getenv("ENVIRONMENT", "development").lower() == "production"
    if is_production:
        raise ValueError(
            "FATAL: SECRET_KEY environment variable must be set in production. "
            "Generate with: python -c 'import secrets; print(secrets.token_urlsafe(32))'"
        )
    logger.warning("⚠️  SECRET_KEY not set — using unsafe default for development only!")
    SECRET_KEY = "UNSAFE-DEV-KEY-CHANGE-IN-PRODUCTION"

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "15"))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))

if ACCESS_TOKEN_EXPIRE_MINUTES > 1440:  # 24 hours
    logger.warning("⚠️  ACCESS_TOKEN_EXPIRE_MINUTES is > 24h. Consider reducing for security.")
if REFRESH_TOKEN_EXPIRE_DAYS > 30:
    logger.warning("⚠️  REFRESH_TOKEN_EXPIRE_DAYS is > 30 days. Consider reducing for security.")

_jwt = JsonWebToken([ALGORITHM])
_jwt_key = {"kty": "oct", "k": base64.urlsafe_b64encode(SECRET_KEY.encode()).decode()}


# ---------------------------------------------------------------------------
# TOTP / secret encryption (Fernet — AES-128-CBC + HMAC-SHA256)
# ---------------------------------------------------------------------------
def _build_fernet() -> Fernet | None:
    raw = os.getenv("TOTP_ENCRYPTION_KEY", "").strip()
    if not raw:
        is_prod = os.getenv("ENVIRONMENT", "development").lower() == "production"
        if is_prod:
            raise ValueError(
                "FATAL: TOTP_ENCRYPTION_KEY must be set in production. "
                "Generate with: python -c \"from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())\""
            )
        logger.warning("⚠️  TOTP_ENCRYPTION_KEY not set — TOTP secrets stored unencrypted (dev only).")
        return None
    return Fernet(raw.encode())


_fernet: Fernet | None = _build_fernet()


def encrypt_totp_secret(secret: str) -> str:
    """Encrypt a raw TOTP secret before storing in the database."""
    if _fernet is None:
        return secret  # dev fallback — no encryption
    return _fernet.encrypt(secret.encode()).decode()


def decrypt_totp_secret(stored: str) -> str:
    """Decrypt a stored TOTP secret retrieved from the database."""
    if _fernet is None:
        return stored  # dev fallback — not encrypted
    try:
        return _fernet.decrypt(stored.encode()).decode()
    except InvalidToken:
        # Handles the case where a legacy unencrypted value is still in the DB
        logger.warning("Could not decrypt TOTP secret — returning raw value (migration needed?)")
        return stored


# ---------------------------------------------------------------------------
# Password hashing
# ---------------------------------------------------------------------------
pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto",
    bcrypt__rounds=12,
)

# Legacy context for verifying old pbkdf2_sha256 hashes during migration
legacy_context = CryptContext(
    schemes=["pbkdf2_sha256", "sha256_crypt"],
    deprecated="auto",
)

try:
    pwd_context.handler("bcrypt")
except Exception:
    logger.warning(
        "⚠️  bcrypt backend unavailable — password hashing may fail. "
        "Ensure bcrypt is installed: pip install bcrypt"
    )


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify plain password against hashed password.
    Supports both bcrypt and legacy pbkdf2_sha256 formats for migration.
    """
    if not plain_password or not hashed_password:
        return False
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except (MissingBackendError, UnknownHashError):
        logger.debug("Attempting legacy password verification")
        try:
            return legacy_context.verify(plain_password, hashed_password)
        except (MissingBackendError, UnknownHashError):
            return False


def get_password_hash(password: str) -> str:
    """Hash password using bcrypt with secure rounds."""
    if not password or len(password) < 8:
        raise ValueError("Password must be at least 8 characters long")
    try:
        return pwd_context.hash(password)
    except Exception as e:
        logger.error("Password hashing failed: %s", e)
        raise


# ---------------------------------------------------------------------------
# JWT helpers (authlib)
# ---------------------------------------------------------------------------

def _encode(claims: dict) -> str:
    """Encode a JWT with HS256 using authlib."""
    return _jwt.encode({"alg": ALGORITHM}, claims, _jwt_key).decode()


def _decode(token: str) -> dict | None:
    """Decode and validate a JWT; returns None on any error."""
    try:
        claims = _jwt.decode(token, _jwt_key)
        claims.validate()
        return dict(claims)
    except (JoseError, Exception) as exc:
        logger.debug("JWT decode error: %s", exc)
        return None


def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    """Create JWT access token."""
    to_encode = data.copy()
    now = datetime.now(timezone.utc)
    expire = now + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": int(expire.timestamp()), "type": "access", "iat": int(now.timestamp())})
    try:
        return _encode(to_encode)
    except Exception as e:
        logger.error("Failed to create access token: %s", e)
        raise


def create_refresh_token(data: dict) -> str:
    """Create JWT refresh token (long-lived)."""
    to_encode = data.copy()
    now = datetime.now(timezone.utc)
    expire = now + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": int(expire.timestamp()), "type": "refresh", "iat": int(now.timestamp())})
    try:
        return _encode(to_encode)
    except Exception as e:
        logger.error("Failed to create refresh token: %s", e)
        raise


def decode_access_token(token: str) -> dict | None:
    """Decode and validate JWT access token."""
    payload = _decode(token)
    if payload is None:
        return None
    if payload.get("type") != "access":
        logger.warning("Invalid token type in access token")
        return None
    return payload


def decode_refresh_token(token: str) -> dict | None:
    """Decode and validate JWT refresh token."""
    payload = _decode(token)
    if payload is None:
        return None
    if payload.get("type") != "refresh":
        logger.warning("Invalid token type in refresh token")
        return None
    return payload


# ---------------------------------------------------------------------------
# OAuth 2FA pending token
# ---------------------------------------------------------------------------
OAUTH_2FA_PENDING_MINUTES = 10


def create_oauth_2fa_pending_token(user_id: int) -> str:
    """Create temporary token for OAuth user awaiting 2FA verification."""
    now = datetime.now(timezone.utc)
    expire = now + timedelta(minutes=OAUTH_2FA_PENDING_MINUTES)
    try:
        return _encode({
            "sub": str(user_id),
            "exp": int(expire.timestamp()),
            "type": "oauth_2fa_pending",
            "iat": int(now.timestamp()),
        })
    except Exception as e:
        logger.error("Failed to create OAuth 2FA pending token: %s", e)
        raise


def decode_oauth_2fa_pending_token(token: str) -> dict | None:
    """Decode OAuth 2FA pending token."""
    payload = _decode(token)
    if payload is None:
        return None
    if payload.get("type") != "oauth_2fa_pending":
        logger.warning("Invalid OAuth 2FA pending token type")
        return None
    return payload


# ---------------------------------------------------------------------------
# OTP & verification codes
# ---------------------------------------------------------------------------

def generate_otp_code(length: int = 6) -> str:
    """Generate a cryptographically secure numeric OTP code."""
    if length < 4 or length > 10:
        raise ValueError("OTP length must be between 4 and 10")
    return "".join(secrets.choice(string.digits) for _ in range(length))


def generate_password_reset_token() -> str:
    """Generate a cryptographically secure password reset token."""
    return secrets.token_urlsafe(32)


def generate_backup_codes(count: int = 10) -> list[str]:
    """
    Generate backup codes for 2FA recovery.
    Format: XXXX-XXXX (8 alphanumeric chars + hyphen).
    Returns plaintext codes — caller must hash before storage.
    """
    if count < 1 or count > 20:
        raise ValueError("Backup code count must be between 1 and 20")
    return [
        "-".join(
            "".join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(4))
            for _ in range(2)
        )
        for _ in range(count)
    ]


def verify_backup_code(plain_code: str, hashed_codes: list[str]) -> tuple[bool, list[str]]:
    """
    Verify a backup code against a list of bcrypt-hashed codes.
    Returns (matched, updated_hashed_codes_with_used_removed).
    Uses constant-time comparison to prevent timing attacks.
    """
    for i, hashed in enumerate(hashed_codes):
        try:
            if pwd_context.verify(plain_code, hashed):
                remaining = hashed_codes[:i] + hashed_codes[i + 1:]
                return True, remaining
        except Exception:
            continue
    return False, hashed_codes


# ---------------------------------------------------------------------------
# TOTP (Time-based One-Time Passwords)
# ---------------------------------------------------------------------------

def generate_totp_secret() -> str:
    """
    Generate a Base32-encoded TOTP secret for 2FA.
    Returns the raw (unencrypted) secret — encrypt before storing.
    Compatible with Google Authenticator, Authy, Microsoft Authenticator.
    """
    secret = secrets.token_bytes(20)  # 160 bits — RFC 4226 recommends ≥128
    return base64.b32encode(secret).decode("utf-8").rstrip("=")


def verify_totp_code(secret: str, code: str, window: int = 1) -> bool:
    """
    Verify TOTP code against secret.
    `secret` should be the raw (decrypted) Base32 secret.
    """
    if not secret or not code:
        return False
    if not code.isdigit() or len(code) != 6:
        logger.warning("Invalid TOTP code format: %d digits", len(code))
        return False
    try:
        import pyotp  # noqa: PLC0415
        totp = pyotp.TOTP(secret)
        is_valid = totp.verify(code, valid_window=window)
        if not is_valid:
            logger.warning("TOTP verification failed")
        return is_valid
    except Exception as e:
        logger.error("TOTP verification error: %s", e)
        return False


def get_totp_qr_code(secret: str, name: str, issuer: str = "KofKaN") -> str:
    """
    Generate QR code URI for TOTP setup (as base64-encoded PNG data URI).
    `secret` should be the raw (decrypted) Base32 secret.
    """
    if not secret or not name:
        raise ValueError("Secret and name are required")
    try:
        import pyotp   # noqa: PLC0415
        import qrcode  # noqa: PLC0415
        from io import BytesIO  # noqa: PLC0415

        totp = pyotp.TOTP(secret)
        uri = totp.provisioning_uri(name=name, issuer_name=issuer)

        qr = qrcode.QRCode(version=1, box_size=10, border=5)
        qr.add_data(uri)
        qr.make(fit=True)
        img = qr.make_image(fill_color="black", back_color="white")

        buffered = BytesIO()
        img.save(buffered, format="PNG")
        img_str = base64.b64encode(buffered.getvalue()).decode()
        logger.debug("QR code generated for user: %s", name[:3] + "***")
        return f"data:image/png;base64,{img_str}"
    except Exception as e:
        logger.error("Failed to generate QR code: %s", e)
        raise ValueError(f"Failed to generate QR code: {e}") from e
