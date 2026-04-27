"""
Synthetic email addresses for Paystack when a user has no real inbox.

We never deliver mail to PLACEHOLDER_EMAIL_DOMAIN — EmailService skips those.
Use a domain you control in production if Paystack rejects `.invalid` (RFC 2606).
"""
from __future__ import annotations

import logging
import os
import re
from datetime import datetime

logger = logging.getLogger(__name__)

_PLACEHOLDER_DOMAIN = os.getenv(
    "PLACEHOLDER_EMAIL_DOMAIN",
    "payments-internal.kofkan.com",
).strip().lower()


_EMAIL_RE = re.compile(r"^[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$", re.IGNORECASE)


def _sanitize_domain(raw: str | None) -> str:
    text = (raw or "").strip().lower()
    if "@" in text:
        text = text.split("@", 1)[1]
    text = text.split("(", 1)[0].strip()
    text = re.sub(r"[^a-z0-9.\-]", "", text)
    if "." not in text:
        return "payments-internal.kofkan.com"
    return text.strip(".-") or "payments-internal.kofkan.com"


def placeholder_email_domain() -> str:
    return _sanitize_domain(_PLACEHOLDER_DOMAIN)


def _is_valid_email(email: str | None) -> bool:
    if not email:
        return False
    candidate = email.strip().split("(", 1)[0].strip()
    return bool(_EMAIL_RE.match(candidate))


def is_undeliverable_placeholder_email(email: str | None) -> bool:
    if not email or not email.strip():
        return True
    dom = placeholder_email_domain()
    return email.strip().lower().endswith(f"@{dom}")


def build_placeholder_email(user_id: int, username: str | None) -> str:
    safe = re.sub(r"[^a-z0-9]", "", (username or "user").lower())[:24] or "user"
    return f"{safe}-{user_id}@{placeholder_email_domain()}"


def ensure_paystack_customer_email(session, user) -> str:
    """Persist a unique placeholder email if missing; return email string for Paystack."""
    if user.email and not user.email_is_placeholder and _is_valid_email(user.email):
        return user.email
    if user.email and user.email_is_placeholder and _is_valid_email(user.email):
        return user.email

    generated = build_placeholder_email(user.id, user.username)

    # If user has a malformed real email, use a payment-safe alias without overwriting profile data.
    if user.email and not user.email_is_placeholder and not _is_valid_email(user.email):
        logger.warning("Malformed real email for user %s; using placeholder for Paystack only", user.id)
        return generated

    # Missing/malformed placeholder email: persist a corrected placeholder.
    user.email = generated
    user.email_is_placeholder = True
    user.email_verified = True
    user.updated_at = datetime.utcnow()
    session.add(user)
    session.commit()
    session.refresh(user)
    return user.email
