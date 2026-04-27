import { apiFetchJsonAuth, apiFetchJsonAuthMethod } from "@/lib/api/client";
import { V1 } from "@/lib/api/v1-paths";

export type ReturnStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "received"
  | "refunded"
  | "cancelled";

export type ReturnItem = {
  id: number;
  return_id: number;
  order_item_id: number;
  quantity: number;
  created_at: string;
};

export type OrderReturn = {
  id: number;
  order_id: number;
  user_id: number;
  reason: string;
  details?: string | null;
  preferred_outcome: "refund" | "replacement";
  status: ReturnStatus;
  admin_notes?: string | null;
  resolved_by?: number | null;
  resolved_at?: string | null;
  created_at: string;
  updated_at: string;
  items: ReturnItem[];
};

export type ReturnCreateBody = {
  reason: string;
  details?: string | null;
  preferred_outcome: "refund" | "replacement";
  items: Array<{ order_item_id: number; quantity: number }>;
};

export async function returnsCreate(
  accessToken: string,
  orderId: number,
  body: ReturnCreateBody
): Promise<OrderReturn> {
  return apiFetchJsonAuth<OrderReturn>(accessToken, V1.returns.createForOrder(orderId), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function returnsForOrder(
  accessToken: string,
  orderId: number
): Promise<OrderReturn[]> {
  return apiFetchJsonAuth<OrderReturn[]>(accessToken, V1.returns.listForOrder(orderId));
}

export async function returnsList(accessToken: string): Promise<OrderReturn[]> {
  return apiFetchJsonAuth<OrderReturn[]>(accessToken, V1.returns.myList);
}

export async function returnsDetail(
  accessToken: string,
  returnId: number
): Promise<OrderReturn> {
  return apiFetchJsonAuth<OrderReturn>(accessToken, V1.returns.detail(returnId));
}

export async function returnsCancel(
  accessToken: string,
  returnId: number
): Promise<OrderReturn> {
  return apiFetchJsonAuthMethod<OrderReturn>(
    accessToken,
    V1.returns.cancel(returnId),
    "DELETE"
  );
}

/**
 * Convenience helpers for the simple `/account/returns` page that just wants
 * "list mine" and "open a return for an order with a reason".
 */
export async function fetchMyReturns(accessToken: string): Promise<OrderReturn[]> {
  return returnsList(accessToken);
}

export async function createReturn(
  accessToken: string,
  orderId: number,
  reason: string,
  options?: {
    details?: string | null;
    preferred_outcome?: "refund" | "replacement";
    items?: Array<{ order_item_id: number; quantity: number }>;
  }
): Promise<OrderReturn> {
  return returnsCreate(accessToken, orderId, {
    reason,
    details: options?.details ?? null,
    preferred_outcome: options?.preferred_outcome ?? "refund",
    items: options?.items ?? [],
  });
}
