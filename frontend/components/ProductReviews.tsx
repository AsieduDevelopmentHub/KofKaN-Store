"use client";

import { MessageSquare, Star } from "lucide-react";
import { useEffect, useState } from "react";

import { useAppSession } from "@/components/Providers";
import { createReview, fetchProductReviews, type Review } from "@/lib/api/reviews";

type ProductReviewsProps = {
  productId: number;
};

export function ProductReviews({ productId }: ProductReviewsProps) {
  const { token, user } = useAppSession();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [message, setMessage] = useState("");

  const load = async () => {
    try {
      setReviews(await fetchProductReviews(productId));
    } catch {
      setReviews([]);
    }
  };

  useEffect(() => {
    void load();
  }, [productId]);

  const submit = async () => {
    if (!token || !user) {
      setMessage("Sign in to leave a review.");
      return;
    }
    if (!title.trim()) {
      setMessage("Add a short title.");
      return;
    }
    setMessage("");
    try {
      await createReview(token, {
        product_id: productId,
        rating,
        title: title.trim(),
        content: content.trim() || null
      });
      setTitle("");
      setContent("");
      setRating(5);
      await load();
      setMessage("Thanks — your review was posted.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not submit review");
    }
  };

  return (
    <section className="mt-10 border-t border-kofkan-border pt-8">
      <h2 className="flex items-center gap-2 text-xl font-bold">
        <MessageSquare className="h-5 w-5" />
        Reviews
      </h2>
      <div className="mt-4 space-y-4">
        {reviews.length === 0 ? (
          <p className="text-sm text-kofkan-muted">No reviews yet. Be the first to share your experience.</p>
        ) : (
          reviews.map((r) => (
            <article key={r.id} className="rounded-xl border border-kofkan-border bg-kofkan-bg-secondary p-4">
              <div className="flex items-center gap-1 text-kofkan-black">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`h-4 w-4 ${i < r.rating ? "fill-kofkan-black text-kofkan-black" : "text-kofkan-border"}`}
                  />
                ))}
              </div>
              <h3 className="mt-1 font-semibold">{r.title}</h3>
              {r.content ? <p className="mt-1 text-sm text-kofkan-charcoal">{r.content}</p> : null}
              <p className="mt-2 text-xs text-kofkan-muted">{new Date(r.created_at).toLocaleDateString()}</p>
            </article>
          ))
        )}
      </div>

      <div className="mt-8 rounded-xl border border-kofkan-border p-4">
        <p className="text-sm font-semibold">Write a review</p>
        {!user ? (
          <p className="mt-2 text-sm text-kofkan-muted">Sign in to submit a review.</p>
        ) : (
          <div className="mt-3 grid gap-3">
            <label className="block text-xs font-medium text-kofkan-muted">
              Rating
              <select
                value={rating}
                onChange={(e) => setRating(Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-kofkan-border px-3 py-2"
              >
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={n}>
                    {n} stars
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-medium text-kofkan-muted">
              Title
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 w-full rounded-lg border border-kofkan-border px-3 py-2"
                placeholder="Great for prototyping"
              />
            </label>
            <label className="block text-xs font-medium text-kofkan-muted">
              Details (optional)
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="mt-1 min-h-[88px] w-full rounded-lg border border-kofkan-border px-3 py-2"
                placeholder="What did you use it for?"
              />
            </label>
            <button
              type="button"
              onClick={() => void submit()}
              className="rounded-lg bg-kofkan-black px-4 py-2 text-sm font-semibold text-kofkan-white"
            >
              Submit review
            </button>
          </div>
        )}
        {message ? <p className="mt-2 text-xs text-kofkan-muted">{message}</p> : null}
      </div>
    </section>
  );
}
