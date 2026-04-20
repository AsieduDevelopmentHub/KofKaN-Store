import { apiGet, apiPost } from "@/lib/api/client";

export type PaymentInitializeResponse = {
  reference: string;
  authorization_url: string;
  amount: number;
  currency: string;
  status: string;
};

export type PaymentStatusResponse = {
  reference: string;
  status: string;
  amount: number;
  currency: string;
  provider: string;
  updated_at: string | null;
};

export function initializePayment(token: string, orderId: number) {
  return apiPost<PaymentInitializeResponse>("/payments/initialize", { order_id: orderId }, token);
}

export function verifyPayment(token: string, reference: string) {
  return apiGet<PaymentStatusResponse>(`/payments/verify/${encodeURIComponent(reference)}`, token);
}
