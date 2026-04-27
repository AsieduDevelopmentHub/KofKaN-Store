"""Dynamic shipping matrix (region/city/courier/fee) with sane fallbacks."""

from __future__ import annotations

import json
from typing import Any

from sqlmodel import Session, select

from app.core.ghana_shipping import (
    COURIER_OPTIONS,
    REGION_DELIVERY_FEE_GHS,
    REGION_LABELS,
    REGION_SLUGS,
    delivery_fee_ghs,
    normalize_region_slug,
)
from app.models import BusinessSetting

SHIPPING_MATRIX_SETTING_KEY = "shipping_matrix_v1"


def _to_float(raw: Any, default: float) -> float:
    try:
        v = float(raw)
        return v if v >= 0 else default
    except Exception:
        return default


def _default_matrix() -> dict[str, Any]:
    return {
        "regions": [
            {
                "slug": slug,
                "label": REGION_LABELS.get(slug, slug.replace("-", " ").title()),
                "base_fee": float(REGION_DELIVERY_FEE_GHS.get(slug, 35.0)),
                "cities": [],
            }
            for slug in REGION_SLUGS
        ],
        "couriers": [{"name": c, "fee_delta": 0.0} for c in COURIER_OPTIONS if c != "Local pickup (store)"],
    }


def _load_matrix(session: Session) -> dict[str, Any]:
    row = session.exec(
        select(BusinessSetting).where(BusinessSetting.key == SHIPPING_MATRIX_SETTING_KEY)
    ).first()
    if not row or not (row.value or "").strip():
        return _default_matrix()
    try:
        parsed = json.loads(row.value)
        if isinstance(parsed, dict):
            return parsed
    except Exception:
        pass
    return _default_matrix()


def _courier_delta(matrix: dict[str, Any], provider: str | None) -> float:
    pick = (provider or "").strip().lower()
    if not pick:
        return 0.0
    for c in matrix.get("couriers", []):
        name = str(c.get("name", "")).strip()
        if name.lower() == pick:
            return _to_float(c.get("fee_delta"), 0.0)
    return 0.0


def _city_fee(region: dict[str, Any], city: str | None) -> float | None:
    pick = (city or "").strip().lower()
    if not pick:
        return None
    for c in region.get("cities", []):
        nm = str(c.get("name", "")).strip()
        if nm.lower() == pick:
            return _to_float(c.get("fee"), 0.0)
    return None


def delivery_fee_dynamic_ghs(
    session: Session,
    *,
    method: str,
    region_slug: str | None,
    city: str | None = None,
    provider: str | None = None,
) -> float:
    if method == "pickup":
        return 0.0
    if method != "delivery":
        return 0.0

    key = normalize_region_slug(region_slug)
    if not key:
        raise ValueError("invalid_region")

    matrix = _load_matrix(session)
    region = next((r for r in matrix.get("regions", []) if str(r.get("slug", "")).strip() == key), None)
    if region:
        base = _to_float(region.get("base_fee"), delivery_fee_ghs("delivery", key))
        city_fee = _city_fee(region, city)
        if city_fee is not None:
            base = city_fee
    else:
        base = delivery_fee_ghs("delivery", key)

    total = base + _courier_delta(matrix, provider)
    return round(max(total, 0.0), 2)


def shipping_options_payload(session: Session) -> dict[str, Any]:
    matrix = _load_matrix(session)
    return {
        "regions": matrix.get("regions", []),
        "couriers": matrix.get("couriers", []),
    }
