"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { adminFetchLowStockAlerts, type StockAlertItem } from "@/lib/api/admin";
import { formatGhs } from "@/lib/mock-data";
import { AdminSearchInput } from "@/components/admin/AdminSearchInput";
import { AdminTableSkeleton } from "@/components/admin/Skeleton";

export default function AdminLowStockPage() {
  const { accessToken } = useAuth();
  const [threshold, setThreshold] = useState<number>(5);
  const [rows, setRows] = useState<StockAlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setErr(null);
    try {
      const data = await adminFetchLowStockAlerts(accessToken, { threshold, limit: 100 });
      setRows(data);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [accessToken, threshold]);

  useEffect(() => {
    void load();
  }, [load]);

  const visibleRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const hay = `${r.name} ${r.parent_product_name ?? ""} ${r.sku ?? ""} ${r.kind}`
        .toLowerCase();
      return hay.includes(q);
    });
  }, [rows, query]);

  return (
    <div className="w-full min-w-0 max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-page-title font-semibold">Low stock</h1>
          <p className="text-small text-kofkan-text-secondary">
            Base products and variant SKUs at or below your threshold. Restock soon to avoid missed
            orders.
          </p>
        </div>
        <Link
          href="/system/products"
          className="text-small font-semibold text-kofkan-gold hover:underline"
        >
          ← Back to products
        </Link>
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-small text-kofkan-text-secondary">
            Threshold
            <input
              type="number"
              min={0}
              max={1000}
              value={threshold}
              onChange={(e) => {
                const n = Number(e.target.value);
                setThreshold(Number.isFinite(n) && n >= 0 ? n : 0);
              }}
              className="ml-2 w-24 rounded-lg border border-kofkan-gray-soft bg-white px-2 py-1 text-small focus:border-kofkan-gold focus:outline-none"
            />
          </label>
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-full bg-kofkan-crimson px-4 py-1.5 text-small font-semibold text-white"
          >
            Refresh
          </button>
        </div>
        <AdminSearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search name or SKU…"
          hint={query ? `${visibleRows.length} of ${rows.length} shown` : undefined}
        />
      </div>

      {err && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-small text-red-800">{err}</p>}

      {loading ? (
        <div className="mt-6">
          <AdminTableSkeleton minWidthClass="min-w-[560px]" columns={5} />
        </div>
      ) : visibleRows.length === 0 ? (
        <div className="mt-6 rounded-xl bg-white p-8 text-center text-small text-kofkan-text-muted shadow-sm ring-1 ring-black/[0.06]">
          {query
            ? "No rows match your search."
            : `All catalog rows are above the threshold of ${threshold}.`}
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-black/[0.06]">
          <table className="w-full min-w-[640px] text-left text-small">
            <thead className="border-b border-black/[0.06] text-[11px] font-semibold uppercase tracking-wider text-kofkan-text-muted">
              <tr>
                <th className="px-4 py-3">Item</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3 text-right">Stock</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-kofkan-gray-soft">
              {visibleRows.map((r) => {
                const key =
                  r.kind === "variant" && r.variant_id != null
                    ? `v-${r.product_id}-${r.variant_id}`
                    : `p-${r.product_id}`;
                return (
                  <tr key={key}>
                    <td className="px-4 py-3">
                      <div>
                        <span className="font-semibold text-kofkan-crimson">{r.name}</span>
                        {r.kind === "variant" && r.parent_product_name ? (
                          <p className="text-[11px] text-kofkan-text-muted">
                            Under: {r.parent_product_name}
                          </p>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-3 capitalize text-[11px] text-kofkan-text-muted">
                      {r.kind}
                    </td>
                    <td className="px-4 py-3">{formatGhs(r.unit_price)}</td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          r.in_stock === 0
                            ? "bg-rose-100 text-rose-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {r.in_stock} left
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/system/products/${r.product_id}`}
                        className="text-[11px] font-semibold text-kofkan-gold hover:underline"
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
