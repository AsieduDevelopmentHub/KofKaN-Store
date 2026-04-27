/** Matches backend `ADMIN_PERMISSION_DEFS` — labels may also load from GET /admin/users/permission-catalog */

export type AdminPermissionDef = { key: string; label: string };

export const ADMIN_PERMISSION_PRESETS: Record<"super_admin" | "admin" | "staff", string[]> = {
  super_admin: [],
  admin: [
    "view_users",
    "manage_users",
    "manage_staff",
    "manage_products",
    "manage_orders",
    "manage_inventory",
    "manage_coupons",
    "manage_reviews",
    "view_analytics",
    "view_payments",
    "manage_settings",
  ],
  staff: [
    "manage_products",
    "manage_orders",
    "manage_inventory",
    "manage_reviews",
    "view_analytics",
  ],
};

export const STATIC_ADMIN_PERMISSION_CATALOG: AdminPermissionDef[] = [
  { key: "view_users", label: "View users" },
  { key: "manage_users", label: "Manage users (activate / deactivate)" },
  { key: "manage_staff", label: "Manage staff & permissions" },
  { key: "manage_products", label: "Manage products" },
  { key: "manage_orders", label: "Manage orders & returns" },
  { key: "manage_inventory", label: "Manage inventory" },
  { key: "manage_coupons", label: "Manage coupons" },
  { key: "manage_reviews", label: "Manage reviews" },
  { key: "view_analytics", label: "View analytics" },
  { key: "view_payments", label: "View payments" },
  { key: "manage_settings", label: "Manage settings" },
];

export function parsePermissionString(raw: string | null | undefined): string[] {
  if (!raw || !raw.trim()) return [];
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}
