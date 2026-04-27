"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  adminFetchOrders,
  adminFetchTransactions,
  adminFetchUsers,
  type PaystackTransactionRow,
} from "@/lib/api/admin";
import { formatGhs } from "@/lib/mock-data";
import { AdminSearchInput } from "@/components/admin/AdminSearchInput";
import { AdminPaymentsPageSkeleton } from "@/components/admin/Skeleton";

export default function AdminPaymentsPage() {
  const { accessToken } = useAuth();
  const router = useRouter();
  const [rows, setRows] = useState<PaystackTransactionRow[]>([]);
  const [customerByOrder, setCustomerByOrder] = useState<Record<number, string>>({});
  const [err, setErr] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [ready, setReady] = useState(false);

  const load = useCallback(async () => {
    if (!accessToken) return;
    try {
      const [transactions, orders, users] = await Promise.all([
        adminFetchTransactions(accessToken, { limit: 100 }),
        adminFetchOrders(accessToken, { limit: 100 }),
        adminFetchUsers(accessToken, { limit: 100 }),
      ]);
      setRows(transactions);
      const userNameById: Record<number, string> = {};
      for (const u of users) {
        userNameById[u.id] = u.name?.trim() || u.username || `User ${u.id}`;
      }
      const nameByOrder: Record<number, string> = {};
      for (const o of orders) {
        const n = userNameById[o.user_id];
        if (n) nameByOrder[o.id] = n;
      }
      setCustomerByOrder(nameByOrder);
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
    return rows.filter((t) => {
      const customer = customerByOrder[t.order_id] ?? "";
      const hay = [
        t.reference,
        `#${t.order_id}`,
        `order ${t.order_id}`,
        customer,
        t.status,
        t.channel ?? "",
        t.currency,
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [rows, query, customerByOrder]);

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-serif text-page-title font-semibold">Payments</h1>
          <p className="text-small text-kofkan-text-secondary">Paystack transaction log linked to orders.</p>
        </div>
        <AdminSearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search reference, order, customer…"
          hint={query ? `${visibleRows.length} of ${rows.length} shown` : undefined}
        />
      </div>
      {err && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-small text-red-800">{err}</p>}
      {!ready && !err && <AdminPaymentsPageSkeleton />}
      {ready && !err && visibleRows.length === 0 && (
        <div className="mt-6 rounded-xl bg-white px-4 py-8 text-center text-small text-kofkan-text-muted shadow-sm ring-1 ring-black/[0.06]">
          {query ? "No transactions match your search." : "No transactions recorded."}
        </div>
      )}
      {ready && !err && visibleRows.length > 0 && (
        <>
          <ul className="mt-6 space-y-3 md:hidden">
            {visibleRows.map((t) => (
              <li
                key={t.id}
                className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-black/[0.06]"
              >
                <button
                  type="button"
                  onClick={() => router.push(`/system/orders/${t.order_id}`)}
                  className="block w-full text-left"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate font-mono text-[11px] text-kofkan-text-muted" title={t.reference}>
                      {t.reference}
                    </p>
                    <span className="shrink-0 rounded-full bg-kofkan-cream px-2 py-0.5 text-[10px] font-semibold capitalize text-kofkan-text-secondary">
                      {t.status}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-small font-semibold text-kofkan-text-primary">
                    {customerByOrder[t.order_id] ?? `Order #${t.order_id}`}
                  </p>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <p className="text-small font-semibold text-kofkan-crimson">
                      {formatGhs(t.amount_subunit / 100)} {t.currency}
                    </p>
                    <span className="text-[10px] text-kofkan-text-muted">
                      Order #{t.order_id}
                    </span>
                  </div>
                  <p className="mt-1 text-[10px] text-kofkan-text-muted">
                    {new Date(t.created_at).toLocaleString()} · {t.channel ?? "—"}
                  </p>
                </button>
              </li>
            ))}
          </ul>

          <div className="mt-6 hidden overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-black/[0.06] md:block">
            <table className="w-full min-w-[860px] text-left text-small">
              <thead className="border-b border-black/[0.06] text-[11px] font-semibold uppercase tracking-wider text-kofkan-text-muted">
                <tr>
                  <th className="px-4 py-3">Reference</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Channel</th>
                  <th className="px-4 py-3">When</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-kofkan-gray-soft">
                {visibleRows.map((t) => (
                  <tr
                    key={t.id}
                    className="cursor-pointer hover:bg-kofkan-cream/80"
                    onClick={() => router.push(`/system/orders/${t.order_id}`)}
                  >
                    <td className="px-4 py-3 font-mono text-[11px]">{t.reference}</td>
                    <td className="px-4 py-3 text-kofkan-text-secondary">
                      {customerByOrder[t.order_id] ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-kofkan-crimson">#{t.order_id}</span>
                    </td>
                    <td className="px-4 py-3">
                      {formatGhs(t.amount_subunit / 100)} {t.currency}
                    </td>
                    <td className="px-4 py-3 capitalize">{t.status}</td>
                    <td className="px-4 py-3 text-[11px] text-kofkan-text-muted">{t.channel ?? "—"}</td>
                    <td className="px-4 py-3 text-[11px] text-kofkan-text-muted">
                      {new Date(t.created_at).toLocaleString()}
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
