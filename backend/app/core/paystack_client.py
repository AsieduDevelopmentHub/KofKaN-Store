"""
Paystack REST API client (https://paystack.com/docs/api).
Uses PAYSTACK_SECRET_KEY; amounts are in the smallest currency unit (e.g. pesewas for GHS).
"""
from __future__ import annotations

import logging
import os
from typing import Any, Optional

import httpx

logger = logging.getLogger(__name__)


def _secret_key() -> str:
    return os.getenv("PAYSTACK_SECRET_KEY", "").strip()


def _base_url() -> str:
    return os.getenv("PAYSTACK_BASE_URL", "https://api.paystack.co").rstrip("/")


def _headers() -> dict[str, str]:
    sk = _secret_key()
    if not sk:
        raise RuntimeError("PAYSTACK_SECRET_KEY is not configured")
    return {
        "Authorization": f"Bearer {sk}",
        "Content-Type": "application/json",
    }


def is_configured() -> bool:
    return bool(_secret_key())


def key_mode() -> str:
    """Return 'test', 'live', or 'none' based on the current secret key prefix."""
    sk = _secret_key()
    if sk.startswith("sk_test_"):
        return "test"
    if sk.startswith("sk_live_"):
        return "live"
    return "none" if not sk else "unknown"


def money_to_subunit(amount_major: float) -> int:
    """Convert major unit (e.g. 12.50 GHS) to subunit (1250 pesewas)."""
    return int(round(float(amount_major) * 100))


def initialize_transaction(
    email: str,
    amount_subunit: int,
    reference: str,
    callback_url: str,
    metadata: Optional[dict[str, Any]] = None,
    currency: str = "GHS",
) -> dict[str, Any]:
    """
    POST /transaction/initialize
    Returns Paystack JSON including data.authorization_url, data.access_code, data.reference.
    """
    payload: dict[str, Any] = {
        "email": email,
        "amount": amount_subunit,
        "reference": reference,
        "callback_url": callback_url,
        "currency": currency,
    }
    if metadata:
        payload["metadata"] = metadata

    url = f"{_base_url()}/transaction/initialize"
    with httpx.Client(timeout=60.0) as client:
        r = client.post(url, headers=_headers(), json=payload)
    try:
        data = r.json()
    except Exception:
        logger.error("Paystack initialize non-JSON response (HTTP %s): %s", r.status_code, r.text[:500])
        raise RuntimeError("Invalid response from Paystack") from None
    if not data.get("status"):
        logger.warning(
            "Paystack initialize failed (HTTP %s, mode=%s): %s",
            r.status_code, key_mode(), data,
        )
    return data


def verify_transaction(reference: str) -> dict[str, Any]:
    """GET /transaction/verify/{reference}"""
    url = f"{_base_url()}/transaction/verify/{reference}"
    with httpx.Client(timeout=60.0) as client:
        r = client.get(url, headers=_headers())
    try:
        return r.json()
    except Exception:
        logger.error("Paystack verify non-JSON response (HTTP %s): %s", r.status_code, r.text[:500])
        raise RuntimeError("Invalid response from Paystack") from None


def create_refund(
    transaction: str,
    *,
    amount_subunit: Optional[int] = None,
    currency: Optional[str] = None,
    customer_note: Optional[str] = None,
    merchant_note: Optional[str] = None,
) -> dict[str, Any]:
    """
    POST /refund
    `transaction` is the Paystack transaction reference (e.g. SKP-1-abc...).
    """
    payload: dict[str, Any] = {"transaction": transaction}
    if amount_subunit is not None:
        payload["amount"] = amount_subunit
    if currency:
        payload["currency"] = currency
    if customer_note:
        payload["customer_note"] = customer_note
    if merchant_note:
        payload["merchant_note"] = merchant_note

    url = f"{_base_url()}/refund"
    with httpx.Client(timeout=60.0) as client:
        r = client.post(url, headers=_headers(), json=payload)
    try:
        return r.json()
    except Exception:
        logger.error("Paystack refund non-JSON response (HTTP %s): %s", r.status_code, r.text[:500])
        raise RuntimeError("Invalid response from Paystack") from None
