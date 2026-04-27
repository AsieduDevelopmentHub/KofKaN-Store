import {
  apiFetchFormAuth,
  apiFetchJson,
  apiFetchJsonAuth,
  apiFetchJsonAuthMethod,
  getApiV1Base,
} from "@/lib/api/client";
import { parseApiErrorBody } from "@/lib/api/error-message";
import { V1 } from "@/lib/api/v1-paths";

export type ReviewMediaRow = {
  id: number;
  review_id: number;
  url: string;
  kind: "image" | "video";
  sort_order: number;
  created_at: string;
};

export type ReviewRow = {
  id: number;
  product_id: number;
  user_id: number;
  rating: number;
  title: string;
  content: string | null;
  created_at: string;
  reviewer_name?: string;
  media?: ReviewMediaRow[];
};

export async function reviewsWriteEligibility(
  productId: number,
  accessToken?: string | null
): Promise<{ can_review: boolean }> {
  const url = `${getApiV1Base()}${V1.reviews.canReview(productId)}`;
  const headers: HeadersInit = { Accept: "application/json" };
  if (accessToken?.trim()) headers.Authorization = `Bearer ${accessToken.trim()}`;
  const res = await fetch(url, { headers });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(parseApiErrorBody(res.status, text));
  }
  return res.json() as Promise<{ can_review: boolean }>;
}

export async function reviewsForProduct(
  productId: number,
  opts?: { skip?: number; limit?: number }
): Promise<ReviewRow[]> {
  const q = new URLSearchParams();
  if (opts?.skip != null) q.set("skip", String(opts.skip));
  if (opts?.limit != null) q.set("limit", String(opts.limit));
  const qs = q.toString();
  return apiFetchJson<ReviewRow[]>(`${V1.reviews.product(productId)}${qs ? `?${qs}` : ""}`);
}

export async function reviewsMine(accessToken: string): Promise<ReviewRow[]> {
  return apiFetchJsonAuth<ReviewRow[]>(accessToken, V1.reviews.mine);
}

export async function reviewsCreate(
  accessToken: string,
  body: { product_id: number; rating: number; title: string; content: string }
): Promise<ReviewRow> {
  return apiFetchJsonAuth<ReviewRow>(accessToken, V1.reviews.create, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function reviewsDelete(accessToken: string, reviewId: number): Promise<void> {
  await apiFetchJsonAuth<undefined>(accessToken, V1.reviews.delete(reviewId), {
    method: "DELETE",
  });
}

export async function reviewsUploadMedia(
  accessToken: string,
  reviewId: number,
  file: File,
  sortOrder = 0
): Promise<ReviewMediaRow> {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("sort_order", String(sortOrder));
  return apiFetchFormAuth<ReviewMediaRow>(
    accessToken,
    V1.reviews.media(reviewId),
    fd,
    "POST"
  );
}

export async function reviewsDeleteMedia(
  accessToken: string,
  reviewId: number,
  mediaId: number
): Promise<void> {
  await apiFetchJsonAuthMethod<undefined>(
    accessToken,
    V1.reviews.mediaItem(reviewId, mediaId),
    "DELETE"
  );
}
