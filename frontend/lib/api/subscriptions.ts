import { apiFetchJson } from "@/lib/api/client";
import { V1 } from "@/lib/api/v1-paths";

export type SubscriptionResponse = {
  email: string;
  is_subscribed: boolean;
  verified: boolean;
  subscribed_at?: string;
};

export async function newsletterSubscribe(
  email: string,
  options?: { marketingOptIn: boolean }
): Promise<SubscriptionResponse> {
  const marketing_opt_in = options?.marketingOptIn ?? false;
  return apiFetchJson<SubscriptionResponse>(V1.subscriptions.subscribe, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, marketing_opt_in }),
  });
}

export async function newsletterUnsubscribe(email: string): Promise<void> {
  await apiFetchJson<undefined>(V1.subscriptions.unsubscribe, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
}

export async function newsletterVerifyToken(token: string): Promise<unknown> {
  return apiFetchJson<unknown>(V1.subscriptions.verify(token));
}
