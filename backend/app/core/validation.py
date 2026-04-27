"""
Input validation and sanitization utilities.
Uses nh3 instead of deprecated bleach.
"""
from __future__ import annotations

import re
from typing import Optional

import nh3

_ALLOWED_TAGS: set[str] = set()


class ValidationRules:
    """Common validation patterns."""

    # Email regex (simplified but practical)
    EMAIL_REGEX = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'

    # Phone number (international +1-999-999-9999)
    PHONE_REGEX = r'^\+?1?\d{9,15}$'

    # URL pattern
    URL_REGEX = r'^https?://[^\s/$.?#].[^\s]*$'

    # Username (alphanumeric, underscore, hyphen, 3-50 chars)
    USERNAME_REGEX = r'^[a-zA-Z0-9_-]{3,50}$'

    # SKU pattern (alphanumeric and hyphens, max 10 chars for production)
    SKU_REGEX = r'^[A-Z0-9-]{3,10}$'


def validate_email(email: str) -> str:
    """
    Validate and normalize email.

    Returns:
        Normalized email (lowercase, trimmed)

    Raises:
        ValueError: If email is invalid
    """
    email = email.strip().lower()

    if not email or len(email) > 254:
        raise ValueError("Email must be between 1 and 254 characters")

    if not re.match(ValidationRules.EMAIL_REGEX, email):
        raise ValueError("Email format is invalid")

    return email


def validate_phone(phone: str) -> str:
    """
    Validate and normalize phone number.

    Raises:
        ValueError: If phone is invalid
    """
    # Remove common formatting characters
    phone = re.sub(r'[\s\-\.\(\)]+', '', phone)

    if not re.match(ValidationRules.PHONE_REGEX, phone):
        raise ValueError("Phone number format is invalid")

    return phone


def validate_password(password: str) -> None:
    """
    Validate password strength.

    Raises:
        ValueError: If password doesn't meet requirements
    """
    if not password:
        raise ValueError("Password is required")

    if len(password) < 8:
        raise ValueError("Password must be at least 8 characters")

    if len(password) > 128:
        raise ValueError("Password must be at most 128 characters")

    has_lower = any(c.islower() for c in password)
    has_upper = any(c.isupper() for c in password)
    has_digit = any(c.isdigit() for c in password)
    has_special = any(c in '!@#$%^&*()-_=+[]{}|;:,.<>?' for c in password)

    variety = sum([has_lower, has_upper, has_digit, has_special])

    if variety < 3:
        raise ValueError(
            "Password must contain at least 3 of: lowercase, uppercase, digits, special characters"
        )


def validate_username(username: str) -> str:
    """
    Validate and normalize username.

    Raises:
        ValueError: If username is invalid
    """
    username = username.strip()

    if not re.match(ValidationRules.USERNAME_REGEX, username):
        raise ValueError("Username must be 3-50 alphanumeric characters (underscore/hyphen allowed)")

    return username


def validate_url(url: str) -> str:
    """
    Validate URL format.

    Raises:
        ValueError: If URL is invalid
    """
    url = url.strip()

    if not re.match(ValidationRules.URL_REGEX, url):
        raise ValueError("Invalid URL format")

    if len(url) > 2048:
        raise ValueError("URL is too long (max 2048 characters)")

    return url


def validate_sku(sku: str) -> str:
    """
    Validate product SKU.

    Raises:
        ValueError: If SKU is invalid
    """
    sku = sku.strip().upper()

    if not re.match(ValidationRules.SKU_REGEX, sku):
        raise ValueError("SKU must be 3-15 characters (alphanumeric and hyphens)")

    return sku


def abbreviate_sku(full_name: str, target_length: int = 10) -> str:
    """
    Generate abbreviated SKU from product name (10-15 chars).
    """
    if target_length < 3 or target_length > 10:
        target_length = 10

    full_name = full_name.strip().upper()
    full_name = re.sub(r'[^A-Z0-9\s]', '', full_name)

    words = [w for w in full_name.split() if w]

    if not words:
        raise ValueError("Product name must contain at least one word")

    abbrev_parts = []
    for word in words[:3]:
        if len(word) > 2:
            abbrev_parts.append(word[:3])
        elif len(word) >= 2:
            abbrev_parts.append(word[:2])
        else:
            abbrev_parts.append(word)

    abbrev = '-'.join(abbrev_parts)

    if len(abbrev) > target_length:
        abbrev = abbrev[:target_length]

    return abbrev


def sanitize_html(html: str, allowed_tags: Optional[set] = None) -> str:
    """
    Sanitize HTML content to prevent XSS using nh3.
    """
    if allowed_tags is None:
        allowed_tags = {
            'p', 'br', 'strong', 'em', 'u', 'a', 'ul', 'ol', 'li', 'blockquote',
            'h1', 'h2', 'h3', 'h4', 'h5', 'h6'
        }
    return nh3.clean(html, tags=allowed_tags)


def sanitize_text(text: str, max_length: Optional[int] = None) -> str:
    """
    Sanitize plain text (remove XSS attempts, trim whitespace).
    """
    if not text:
        return ""

    # Remove control characters and trim
    text = ''.join(c for c in text if ord(c) >= 32 or c in '\n\t')
    text = text.strip()

    if max_length and len(text) > max_length:
        text = text[:max_length]

    return text


def validate_amount(amount: float, min_amount: float = 0.01, max_amount: float = 999999.99) -> float:
    """
    Validate monetary amount.

    Raises:
        ValueError: If amount is invalid
    """
    if not isinstance(amount, (int, float)):
        raise ValueError("Amount must be a number")

    if amount < min_amount:
        raise ValueError(f"Amount must be at least {min_amount}")

    if amount > max_amount:
        raise ValueError(f"Amount cannot exceed {max_amount}")

    return round(amount, 2)


def validate_pagination(page: int = 1, limit: int = 20) -> tuple[int, int]:
    """
    Validate pagination parameters.

    Raises:
        ValueError: If parameters are invalid
    """
    if page < 1:
        raise ValueError("Page must be >= 1")

    if limit < 1 or limit > 100:
        raise ValueError("Limit must be between 1 and 100")

    return page, limit
