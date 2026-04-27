"""Ghana delivery: 16 regions + local pickup. Fees in GHS (tune as needed)."""

from typing import Literal

ShippingMethod = Literal["pickup", "delivery"]

REGION_SLUGS: tuple[str, ...] = (
    "greater-accra",
    "ashanti",
    "western",
    "central",
    "eastern",
    "volta",
    "northern",
    "upper-east",
    "upper-west",
    "bono",
    "bono-east",
    "ahafo",
    "western-north",
    "oti",
    "north-east",
    "savannah",
)

REGION_LABELS: dict[str, str] = {
    "greater-accra": "Greater Accra",
    "ashanti": "Ashanti",
    "western": "Western",
    "central": "Central",
    "eastern": "Eastern",
    "volta": "Volta",
    "northern": "Northern",
    "upper-east": "Upper East",
    "upper-west": "Upper West",
    "bono": "Bono",
    "bono-east": "Bono East",
    "ahafo": "Ahafo",
    "western-north": "Western North",
    "oti": "Oti",
    "north-east": "North East",
    "savannah": "Savannah",
}

REGION_DELIVERY_FEE_GHS: dict[str, float] = {
    "greater-accra": 15.0,
    "ashanti": 25.0,
    "western": 28.0,
    "central": 28.0,
    "eastern": 28.0,
    "volta": 30.0,
    "northern": 40.0,
    "upper-east": 45.0,
    "upper-west": 45.0,
    "bono": 32.0,
    "bono-east": 32.0,
    "ahafo": 32.0,
    "western-north": 35.0,
    "oti": 35.0,
    "north-east": 42.0,
    "savannah": 42.0,
}

COURIER_OPTIONS: tuple[str, ...] = (
    "Local pickup (store)",
    "Station driver",
    "Speedaf",
    "FedEx",
    "Ghana Post",
    "Other courier",
)


def normalize_region_slug(region: str | None) -> str | None:
    if not region or not isinstance(region, str):
        return None
    s = region.strip().lower().replace(" ", "-")
    return s if s in REGION_SLUGS else None


def delivery_fee_ghs(method: str, region_slug: str | None) -> float:
    if method == "pickup":
        return 0.0
    if method != "delivery":
        return 0.0
    key = normalize_region_slug(region_slug)
    if not key:
        raise ValueError("invalid_region")
    return float(REGION_DELIVERY_FEE_GHS.get(key, 35.0))
