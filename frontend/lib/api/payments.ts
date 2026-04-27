import { apiFetchJsonAuth } from "@/lib/api/client";
import { V1 } from "@/lib/api/v1-paths";

export type PaystackInitializeResponse = {
  authorization_url: string;
  access_code: string;
  reference: string;
  public_key?: string | null;
};

export async function paystackInitialize(
  accessToken: string,
  orderId: number,
  callbackUrl: string
): Promise<PaystackInitializeResponse> {
  return apiFetchJsonAuth<PaystackInitializeResponse>(accessToken, V1.payments.paystackInitialize, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ order_id: orderId, callback_url: callbackUrl }),
  });
}

export type PaystackVerifyResponse = {
  status: string;
  reference: string;
  amount_subunit: number;
  currency: string;
  order_id?: number | null;
  already_confirmed?: boolean;
};

export async function paystackVerify(
  accessToken: string,
  reference: string
): Promise<PaystackVerifyResponse> {
  return apiFetchJsonAuth<PaystackVerifyResponse>(
    accessToken,
    V1.payments.paystackVerify(reference)
  );
}
