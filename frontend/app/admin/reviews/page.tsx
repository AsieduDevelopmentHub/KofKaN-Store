"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useDialog } from "@/context/DialogContext";
import {
  adminDeleteReview,
  adminFetchProducts,
  adminFetchReviews,
  adminFetchUsers,
  type AdminReview,
} from "@/lib/api/admin";
import { AdminSearchInput } from "@/components/admin/AdminSearchInput";
import { AdminReviewsListSkeleton } from "@/components/admin/Skeleton";

export default function AdminReviewsPage() {
  const { accessToken } = useAuth();
  const { confirm: confirmDialog, alert: alertDialog } = useDialog();
  const [rows, setRows] = useState<AdminReview[]>([]);
  const [users, setUsers] = useState<Record<number, string>>({});
  const [products, setProducts] = useState<Record<number, string>>({});
  const [err, setErr] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [ready, setReady] = useState(false);

  const load = useCallback(async () => {
    if (!accessToken) return;
    try {
      const [reviews, userRows, productRows] = await Promise.all([
        adminFetchReviews(accessToken),
        adminFetchUsers(accessToken, { limit: 100 }),
        adminFetchProducts(accessToken, { limit: 100 }),
      ]);
      setRows(reviews);
      setUsers(
        Object.fromEntries(userRows.map((u) => [u.id, u.name?.trim() || u.username || `User ${u.id}`]))
      );
      setProducts(
        Object.fromEntries(productRows.map((p) => [p.id, p.name || `Product #${p.id}`]))
      );
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setReady(true);
    }
  }, [accessToken]);

  useEffect(() => {
    void load();
  }, [load]);

  const visibleRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const productName = products[r.product_id] ?? "";
      const userName = users[r.user_id] ?? "";
      const hay = `${r.title} ${r.content ?? ""} ${productName} ${userName} ${r.rating}`.toLowerCase();
      return hay.includes(q);
    });
  }, [rows, query, products, users]);

  return (
    <div className="w-full min-w-0 max-w-full">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-page-title font-semibold">Reviews</h1>
          <p className="text-small text-kofkan-text-secondary">Moderate customer feedback. Removing a review is permanent.</p>
        </div>
        <AdminSearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search product, customer, or text…"
          hint={query ? `${visibleRows.length} of ${rows.length} shown` : undefined}
        />
      </div>
      {err && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-small text-red-800">{err}</p>}
      {!ready && !err ? (
        <AdminReviewsListSkeleton />
      ) : (
      <ul className="mt-6 divide-y divide-kofkan-gray-soft rounded-xl bg-white shadow-sm ring-1 ring-black/[0.06]">
        {visibleRows.map((r) => (
          <li key={r.id} className="px-4 py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1">
                <p className="break-words font-semibold">
                  {r.title}{" "}
                  <span className="text-kofkan-gold">★ {r.rating}</span>
                </p>
                <p className="mt-1 break-words text-[11px] text-kofkan-text-muted">
                  {products[r.product_id] ?? `Product #${r.product_id}`} ·{" "}
                  {users[r.user_id] ?? `User #${r.user_id}`} · {new Date(r.created_at).toLocaleString()}
                </p>
                {r.content && (
                  <p className="mt-2 break-words text-small text-kofkan-text-secondary">{r.content}</p>
                )}
                <Link
                  href={`/product/${r.product_id}`}
                  className="mt-2 inline-block text-[11px] font-semibold text-kofkan-gold hover:underline"
                >
                  View product
                </Link>
              </div>
              <button
                type="button"
                className="w-full shrink-0 rounded-full bg-red-50 px-3 py-1.5 text-[11px] font-semibold text-red-800 sm:w-auto"
                onClick={() => {
                  void (async () => {
                    if (!accessToken) return;
                    const ok = await confirmDialog({
                      title: "Delete review",
                      message: "Delete this review? This cannot be undone.",
                      confirmLabel: "Delete",
                      variant: "danger",
                    });
                    if (!ok) return;
                    try {
                      await adminDeleteReview(accessToken, r.id);
                      await load();
                    } catch (e) {
                      await alertDialog(e instanceof Error ? e.message : "Failed", {
                        variant: "error",
                      });
                    }
                  })();
                }}
              >
                Remove
              </button>
            </div>
          </li>
        ))}
        {visibleRows.length === 0 && !err && ready && (
          <li className="px-4 py-8 text-center text-small text-kofkan-text-muted">
            {query ? "No reviews match your search." : "No reviews."}
          </li>
        )}
      </ul>
      )}
    </div>
  );
}
