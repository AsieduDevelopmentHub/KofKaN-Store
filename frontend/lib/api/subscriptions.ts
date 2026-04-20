import { apiGet, apiPost } from "@/lib/api/client";

export type NewsletterSubscriptionResponse = {
  message: string;
  email: string;
  is_subscribed: boolean;
};

export type NewsletterRow = {
  email: string;
  is_subscribed: boolean;
  created_at: string;
};

export function subscribeNewsletter(email: string) {
  return apiPost<NewsletterSubscriptionResponse>("/subscriptions/newsletter/subscribe", { email });
}

export function unsubscribeNewsletter(email: string) {
  return apiPost<NewsletterSubscriptionResponse>("/subscriptions/newsletter/unsubscribe", { email });
}

export function listNewsletterSubscriptions(token: string) {
  return apiGet<NewsletterRow[]>("/subscriptions/newsletter", token);
}
