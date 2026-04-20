import { apiGet, apiPost } from "@/lib/api/client";

export type Order = {
  id: number;
  status: string;
  total_amount: number;
  created_at: string;
};

export function fetchOrders(token: string) {
  return apiGet<Order[]>("/orders", token);
}

export function checkout(token: string) {
  return apiPost<Order>("/orders/checkout", {}, token);
}
