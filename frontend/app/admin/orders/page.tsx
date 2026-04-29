"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { adminFetchOrders, adminFetchUsers, type AdminOrderListItem } from "@/lib/api/admin";
import { formatGhs } from "@/lib/mock-data";
import { AdminSearchInput } from "@/components/admin/AdminSearchInput";
import { AdminOrdersPageSkeleton } from "@/components/admin/Skeleton";

const FILTERS = ["all", "pending", "processing", "packed", "shipped", "delivered", "cancelled"] as const;

export default function AdminOrdersPage() {
  const { accessToken } = useAuth();
  const router = useRouter();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");
  const [rows, setRows] = useState<AdminOrderListItem[]>([]);
  const [userNames, setUserNames] = useState<Record<number, string>>({});
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setErr(null);
    try {
      const [data, users] = await Promise.all([
        adminFetchOrders(accessToken, {
          limit: 30,
          status: filter === "all" ? undefined : filter,
        }),
        adminFetchUsers(accessToken, { limit: 100 }),
      ]);
      const nameMap: Record<number, string> = {};
      for (const u of users) {
        nameMap[u.id] = u.name?.trim() || u.username || `User ${u.id}`;
      }
      setUserNames(nameMap);
      setRows(data);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [accessToken, filter]);

  useEffect(() => {
    void load();
  }, [load]);

  const visibleRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((o) => {
      const customer = userNames[o.user_id] ?? "";
      const hay = [
        `#${o.id}`,
        `order ${o.id}`,
        customer,
        o.status,
        o.payment_status,
        String(o.total_price),
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [rows, query, userNames]);

  return (
    <div className="w-full min-w-0 max-w-full">
      <h1 className="font-display text-page-title font-semibold">Orders</h1>
      <p className="text-small text-kofkan-text-secondary">Fulfillment, payment state, and invoices.</p>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-semibold capitalize ${
                filter === f ? "bg-kofkan-crimson text-white" : "bg-white text-kofkan-text-secondary ring-1 ring-black/[0.08]"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <AdminSearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search order # or customer…"
          hint={query ? `${visibleRows.length} of ${rows.length} shown` : undefined}
        />
      </div>
      {err && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-small text-red-800">{err}</p>}
      {loading ? (
        <AdminOrdersPageSkeleton />
      ) : visibleRows.length === 0 ? (
        <div className="mt-6 rounded-xl bg-white px-4 py-8 text-center text-small text-kofkan-text-muted shadow-sm ring-1 ring-black/[0.06]">
          {query ? "No orders match your search." : "No orders in this view."}
        </div>
      ) : (
        <>
          <ul className="mt-6 space-y-3 md:hidden">
            {visibleRows.map((o) => (
              <li
                key={o.id}
                className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-black/[0.06]"
              >
                <button
                  type="button"
                  onClick={() => router.push(`/system/orders/${o.id}`)}
                  className="block w-full text-left"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-kofkan-crimson">#{o.id}</p>
                    <span className="rounded-full bg-kofkan-cream px-2 py-0.5 text-[10px] font-semibold capitalize text-kofkan-text-secondary">
                      {o.status}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-small font-medium text-kofkan-text-primary">
                    {userNames[o.user_id] ?? `User ${o.user_id}`}
                  </p>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <p className="text-small font-semibold text-kofkan-text-primary">
                      {formatGhs(o.total_price)}
                    </p>
                    <span className="text-[10px] text-kofkan-text-muted">
                      {o.payment_status}
                    </span>
                  </div>
                  <p className="mt-1 text-[10px] text-kofkan-text-muted">
                    {new Date(o.created_at).toLocaleString()}
                  </p>
                </button>
              </li>
            ))}
          </ul>

          <div className="mt-6 hidden w-full max-w-full touch-pan-x overflow-x-auto overscroll-x-contain rounded-xl bg-white shadow-sm ring-1 ring-black/[0.06] md:block">
            <table className="w-full min-w-[720px] text-left text-small">
              <thead className="border-b border-black/[0.06] text-[11px] font-semibold uppercase tracking-wider text-kofkan-text-muted">
                <tr>
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Payment</th>
                  <th className="px-4 py-3">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-kofkan-gray-soft">
                {visibleRows.map((o) => (
                  <tr
                    key={o.id}
                    className="cursor-pointer hover:bg-kofkan-cream/80"
                    onClick={() => router.push(`/system/orders/${o.id}`)}
                  >
                    <td className="px-4 py-3">
                      <span className="font-semibold text-kofkan-crimson">#{o.id}</span>
                    </td>
                    <td className="px-4 py-3 text-kofkan-text-muted">{userNames[o.user_id] ?? `User ${o.user_id}`}</td>
                    <td className="px-4 py-3 font-medium">{formatGhs(o.total_price)}</td>
                    <td className="px-4 py-3 capitalize">{o.status}</td>
                    <td className="px-4 py-3 text-[11px]">{o.payment_status}</td>
                    <td className="px-4 py-3 text-[11px] text-kofkan-text-muted">
                      {new Date(o.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
