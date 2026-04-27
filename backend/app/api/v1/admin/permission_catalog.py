"""Canonical admin/staff permission keys — keep in sync with require_admin_permission(...) usage."""

from __future__ import annotations

# (key, human label)
ADMIN_PERMISSION_DEFS: tuple[tuple[str, str], ...] = (
    ("view_users", "View users"),
    ("manage_users", "Manage users (activate / deactivate)"),
    ("manage_staff", "Manage staff & permissions"),
    ("manage_products", "Manage products"),
    ("manage_orders", "Manage orders & returns"),
    ("manage_inventory", "Manage inventory"),
    ("manage_coupons", "Manage coupons"),
    ("manage_reviews", "Manage reviews"),
    ("view_analytics", "View analytics"),
    ("view_payments", "View payments"),
    ("manage_settings", "Manage settings"),
)

KNOWN_ADMIN_PERMISSION_KEYS: frozenset[str] = frozenset(k for k, _ in ADMIN_PERMISSION_DEFS)


def permission_catalog_list() -> list[dict[str, str]]:
    return [{"key": k, "label": lbl} for k, lbl in ADMIN_PERMISSION_DEFS]
