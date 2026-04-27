from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional
from datetime import datetime

from app.core.sanitization import sanitize_phone, sanitize_plain_text


# ============ Registration & Login ============
class RegisterRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    name: str = Field(..., min_length=1, max_length=120)
    email: Optional[EmailStr] = None
    password: str = Field(..., min_length=8)

    @field_validator("username", mode="before")
    @classmethod
    def _normalize_username(cls, v):
        txt = sanitize_plain_text(v, max_length=50, single_line=True)
        return txt.lower() if txt else txt

    @field_validator("name", mode="before")
    @classmethod
    def _strip_name(cls, v):
        return sanitize_plain_text(v, max_length=120, single_line=True)

    @field_validator("email", mode="before")
    @classmethod
    def _strip_email(cls, v):
        if v is None:
            return None
        txt = sanitize_plain_text(v, max_length=255, single_line=True)
        return txt.lower() if txt else None


class LoginRequest(BaseModel):
    identifier: str = Field(..., min_length=1, max_length=255)
    password: str


class LoginWithTwoFARequest(BaseModel):
    identifier: str = Field(..., min_length=1, max_length=255)
    password: str
    code: str = Field(..., min_length=6, max_length=6)


class GoogleOAuth2FAVerifyRequest(BaseModel):
    """Complete sign-in after Google OAuth when TOTP 2FA is enabled on the account."""

    pending_token: str = Field(..., min_length=20, max_length=4096)
    code: str = Field(..., min_length=6, max_length=6)

    @field_validator("code", mode="before")
    @classmethod
    def _six_digit_code(cls, v):
        if v is None:
            raise ValueError("Authentication code is required")
        s = "".join(ch for ch in str(v) if ch.isdigit())[:6]
        if len(s) != 6:
            raise ValueError("Enter the 6-digit authenticator code")
        return s


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: Optional[str] = None
    token_type: str = "bearer"
    expires_in: int


# ============ Token & JWT ============
class TokenData(BaseModel):
    email: Optional[str] = None
    exp: Optional[datetime] = None


class RefreshTokenRequest(BaseModel):
    refresh_token: str


# ============ User Profile ============
class UserProfileUpdate(BaseModel):
    username: Optional[str] = None
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    shipping_region: Optional[str] = None
    shipping_city: Optional[str] = None
    shipping_address_line1: Optional[str] = None
    shipping_address_line2: Optional[str] = None
    shipping_landmark: Optional[str] = None
    shipping_contact_name: Optional[str] = None
    shipping_contact_phone: Optional[str] = None

    @field_validator("username", mode="before")
    @classmethod
    def _normalize_username(cls, v):
        txt = sanitize_plain_text(v, max_length=50, single_line=True)
        return txt.lower() if txt else None

    @field_validator("name", mode="before")
    @classmethod
    def _strip_name(cls, v):
        return sanitize_plain_text(v, max_length=120, single_line=True)

    @field_validator("phone", mode="before")
    @classmethod
    def _strip_phone(cls, v):
        return sanitize_phone(v)

    @field_validator("email", mode="before")
    @classmethod
    def _strip_email_profile(cls, v):
        if v is None:
            return None
        txt = sanitize_plain_text(str(v).strip(), max_length=255, single_line=True)
        return txt.lower() if txt else None

    @field_validator(
        "shipping_region",
        "shipping_city",
        "shipping_address_line1",
        "shipping_address_line2",
        "shipping_landmark",
        "shipping_contact_name",
        mode="before",
    )
    @classmethod
    def _strip_shipping_fields(cls, v):
        return sanitize_plain_text(v, max_length=255, single_line=True)

    @field_validator("shipping_contact_phone", mode="before")
    @classmethod
    def _strip_shipping_phone(cls, v):
        return sanitize_phone(v)


class UserProfileResponse(BaseModel):
    id: int
    username: str
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    shipping_region: Optional[str] = None
    shipping_city: Optional[str] = None
    shipping_address_line1: Optional[str] = None
    shipping_address_line2: Optional[str] = None
    shipping_landmark: Optional[str] = None
    shipping_contact_name: Optional[str] = None
    shipping_contact_phone: Optional[str] = None
    email_verified: bool
    email_is_placeholder: bool = False
    two_fa_enabled: bool
    two_fa_method: Optional[str] = None
    is_active: bool
    is_admin: bool = False
    admin_role: str = "customer"
    admin_permissions: Optional[str] = ""
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class DeleteAccountRequest(BaseModel):
    password: str = Field(..., description="Current password to confirm deletion")


# ============ Email & OTP Verification ============
class EmailVerificationRequest(BaseModel):
    email: EmailStr


class VerifyOTPRequest(BaseModel):
    code: str = Field(..., min_length=6, max_length=6)


class VerifyEmailRequest(BaseModel):
    email: EmailStr
    code: str = Field(..., min_length=6, max_length=6)


# ============ Password Reset ============
class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str = Field(..., min_length=8)


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8)


# ============ 2FA Setup ============
class TwoFASetupResponse(BaseModel):
    secret: str
    qr_code: str  # Base64 encoded QR code image
    backup_codes: list[str]


class TwoFAVerifyRequest(BaseModel):
    code: str = Field(..., min_length=6, max_length=6)


class TwoFAEnableRequest(BaseModel):
    secret: str
    backup_codes: list[str]
    verification_code: str = Field(..., min_length=6, max_length=6)


class TwoFADisableRequest(BaseModel):
    password: str


class TwoFAMethodRequest(BaseModel):
    method: str = Field(..., pattern="^(totp|email)$")


class BackupCodesResponse(BaseModel):
    backup_codes: list[str]
    regenerated_at: datetime


# ============ Logout ============
class LogoutRequest(BaseModel):
    pass


# ============ Session Management ============
class SessionResponse(BaseModel):
    session_id: str
    user_email: str
    created_at: datetime
    last_activity: datetime
    expires_at: datetime
