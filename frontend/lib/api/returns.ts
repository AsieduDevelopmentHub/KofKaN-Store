import { apiGet, apiPost } from "@/lib/api/client";

export type OrderReturn = {
  id: number;
  order_id: number;
  user_id: number;
  reason: string;
  status: string;
  created_at: string;
};

export function fetchMyReturns(token: string) {
  return apiGet<OrderReturn[]>("/returns", token);
}

export function createReturn(token: string, orderId: number, reason: string) {
  return apiPost<OrderReturn>("/returns", { order_id: orderId, reason }, token);
}
