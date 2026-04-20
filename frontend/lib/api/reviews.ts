import { apiGet, apiPost } from "@/lib/api/client";

export type Review = {
  id: number;
  product_id: number;
  user_id: number;
  rating: number;
  title: string;
  content: string | null;
  created_at: string;
};

export function fetchProductReviews(productId: number) {
  return apiGet<Review[]>(`/reviews/product/${productId}`);
}

export function createReview(
  token: string,
  payload: { product_id: number; rating: number; title: string; content?: string | null }
) {
  return apiPost<Review>("/reviews", payload, token);
}
