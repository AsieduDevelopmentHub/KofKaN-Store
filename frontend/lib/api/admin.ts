import { apiGet, apiPatch } from "@/lib/api/client";

import type { Product } from "@/lib/api/products";

export type AdminSummary = {
  users: number;
  products: number;
  open_orders: number;
  revenue: number;
};

export type AdminUserRow = {
  id: number;
  email: string;
  full_name: string;
  is_admin: boolean;
  is_active: boolean;
  admin_role: string;
  admin_permissions: string;
  created_at: string;
  password_hash?: string;
};

export type AdminOrderRow = {
  id: number;
  user_id: number;
  status: string;
  total_amount: number;
  created_at: string;
};

export type AdminInventoryResponse = {
  items: Product[];
  low_stock: Product[];
  threshold: number;
};

export type AdminPaymentRow = {
  id: number;
  user_id: number;
  order_id: number | null;
  reference: string;
  provider: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
};

export type AdminSecuritySettings = {
  app_name: string;
  app_version: string;
  https_enabled: boolean;
  debug: boolean;
  disable_openapi: boolean;
  cors_allow_credentials: boolean;
  has_google_client_id: boolean;
  has_paystack_webhook_secret: boolean;
};

export function fetchAdminSummary(token: string) {
  return apiGet<AdminSummary>("/admin/summary", token);
}

export function fetchAdminUsers(token: string) {
  return apiGet<AdminUserRow[]>("/admin/users", token);
}

export function patchAdminUser(
  token: string,
  userId: number,
  body: Partial<Pick<AdminUserRow, "is_active" | "is_admin" | "admin_role" | "admin_permissions">>
) {
  return apiPatch<AdminUserRow>(`/admin/users/${userId}`, body, token);
}

export function fetchAdminOrders(token: string) {
  return apiGet<AdminOrderRow[]>("/admin/orders", token);
}

export function patchAdminOrderStatus(token: string, orderId: number, status: string) {
  return apiPatch<AdminOrderRow>(`/admin/orders/${orderId}/status`, { status }, token);
}

export function fetchAdminInventory(token: string, lowStockBelow = 5) {
  return apiGet<AdminInventoryResponse>(`/admin/inventory/products?low_stock_below=${lowStockBelow}`, token);
}

export function patchAdminProductStock(token: string, productId: number, stockQuantity: number) {
  return apiPatch<Product>(`/admin/inventory/products/${productId}/stock`, { stock_quantity: stockQuantity }, token);
}

export function fetchAdminPayments(token: string) {
  return apiGet<AdminPaymentRow[]>("/admin/payments", token);
}

export function patchAdminPaymentStatus(token: string, reference: string, status: string) {
  return apiPatch<AdminPaymentRow>(`/admin/payments/${encodeURIComponent(reference)}/status`, { status }, token);
}

export function fetchAdminSecuritySettings(token: string) {
  return apiGet<AdminSecuritySettings>("/admin/settings/security", token);
}
