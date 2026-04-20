import { apiGet } from "@/lib/api/client";

export type AdminSummary = {
  users: number;
  products: number;
  open_orders: number;
  revenue: number;
};

export function fetchAdminSummary(token: string) {
  return apiGet<AdminSummary>("/admin/summary", token);
}
