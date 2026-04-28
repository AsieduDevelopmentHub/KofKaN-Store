"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import {
  adminFetchOrderDetail,
  adminFetchReturns,
  adminFetchUsers,
  adminUpdateReturnStatus,
  type AdminOrderDetail,
  type AdminReturn,
} from "@/lib/api/admin";
import { sanitizeMultiline } from "@/lib/validation/input";
import { AdminSearchInput } from "@/components/admin/AdminSearchInput";
import { AdminReturnsPageSkeleton } from "@/components/admin/Skeleton";

const STATUS_FILTERS = [
  "all",
  "pending",
  "approved",
  "rejected",
  "received",
  "refunded",
  "cancelled",
] as const;

type Filter = (typeof STATUS_FILTERS)[number];

const NEXT_STATUSES: Record<AdminReturn["status"], AdminReturn["status"][]> = {
  pending: ["approved", "rejected", "cancelled"],
  approved: ["received", "rejected", "cancelled"],
  rejected: ["pending"],
  received: ["refunded", "rejected"],
  refunded: [],
  cancelled: ["pending"],
};

function statusBadgeClass(status: AdminReturn["status"]): string {
  switch (status) {
    case "pending":
      return "bg-amber-100 text-amber-800";
    case "approved":
      return "bg-blue-100 text-blue-800";
    case "received":
      return "bg-indigo-100 text-indigo-800";
    case "refunded":
      return "bg-emerald-100 text-emerald-800";
    case "rejected":
      return "bg-rose-100 text-rose-800";
    case "cancelled":
      return "bg-zinc-200 text-zinc-700";
    default:
      return "bg-zinc-200 text-zinc-700";
  }
}

type ItemLabel = { product_name: string; quantity: number };

export default function AdminReturnsPage() {
  const { accessToken } = useAuth();
  const [filter, setFilter] = useState<Filter>("all");
  const [rows, setRows] = useState<AdminReturn[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [notesById, setNotesById] = useState<Record<number, string>>({});
  const [query, setQuery] = useState("");
  const [userNameById, setUserNameById] = useState<Record<number, string>>({});
  // Map order_item_id -> product_name (resolved from order details).
  const [itemNameById, setItemNameById] = useState<Record<number, string>>({});

  const load = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setErr(null);
    try {
      const [data, users] = await Promise.all([
        adminFetchReturns(accessToken, {
          status: filter === "all" ? undefined : filter,
          limit: 100,
        }),
        adminFetchUsers(accessToken, { limit: 100 }),
      ]);
      setRows(data);
      const initial: Record<number, string> = {};
      data.forEach((r) => {
        initial[r.id] = r.admin_notes ?? "";
      });
      setNotesById(initial);
      const names: Record<number, string> = {};
      for (const u of users) {
        names[u.id] = u.name?.trim() || u.username || `User ${u.id}`;
      }
      setUserNameById(names);

      // Resolve order-item -> product names for every unique order present in
      // the returns list. One fetch per order; small N in practice.
      const uniqueOrderIds = Array.from(new Set(data.map((r) => r.order_id)));
      const orderDetails = await Promise.allSettled(
        uniqueOrderIds.map((id) => adminFetchOrderDetail(accessToken, id))
      );
      const nextItemMap: Record<number, string> = {};
      orderDetails.forEach((res) => {
        if (res.status === "fulfilled") {
          const detail = res.value as AdminOrderDetail;
          for (const line of detail.items) {
            nextItemMap[line.id] =
              line.product_name ?? `Item #${line.id}`;
          }
        }
      });
      setItemNameById(nextItemMap);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load returns");
    } finally {
      setLoading(false);
    }
  }, [accessToken, filter]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleStatusChange = async (ret: AdminReturn, next: AdminReturn["status"]) => {
    if (!accessToken) return;
    setSavingId(ret.id);
    setErr(null);
    try {
      const notes = sanitizeMultiline(notesById[ret.id] ?? "", 4000).trim();
      const updated = await adminUpdateReturnStatus(accessToken, ret.id, {
        status: next,
        admin_notes: notes || null,
      });
      setRows((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to update return");
    } finally {
      setSavingId(null);
    }
  };

  const totalPending = useMemo(() => rows.filter((r) => r.status === "pending").length, [rows]);

  const visibleRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const userName = userNameById[r.user_id] ?? "";
      const itemNames = r.items
        .map((it) => itemNameById[it.order_item_id] ?? "")
        .join(" ");
      const hay = [
        `#${r.id}`,
        `order ${r.order_id}`,
        `#${r.order_id}`,
        userName,
        r.reason,
        r.details ?? "",
        r.preferred_outcome,
        r.status,
        itemNames,
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [rows, query, userNameById, itemNameById]);

  const buildItemLabels = (ret: AdminReturn): ItemLabel[] =>
    ret.items.map((it) => ({
      product_name:
        itemNameById[it.order_item_id] ?? `Item #${it.order_item_id}`,
      quantity: it.quantity,
    }));

  return (
    <div className="w-full min-w-0 max-w-full">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-page-title font-semibold">Returns</h1>
          <p className="text-small text-kofkan-text-secondary">
            Customer return and refund requests. {totalPending > 0 && (
              <span className="ml-1 font-semibold text-amber-700">{totalPending} awaiting review.</span>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-full border border-kofkan-gray-soft bg-white px-4 py-1.5 text-small font-semibold text-kofkan-text-primary hover:bg-kofkan-cream"
        >
          Refresh
        </button>
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-semibold capitalize ${
                filter === f
                  ? "bg-kofkan-crimson text-white"
                  : "bg-white text-kofkan-text-secondary ring-1 ring-black/[0.08]"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <AdminSearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search customer, order, product…"
          hint={query ? `${visibleRows.length} of ${rows.length} shown` : undefined}
        />
      </div>

      {err && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-small text-red-800">{err}</p>}

      {loading ? (
        <AdminReturnsPageSkeleton />
      ) : visibleRows.length === 0 ? (
        <div className="mt-6 rounded-xl bg-white p-8 text-center text-small text-kofkan-text-muted shadow-sm ring-1 ring-black/[0.06]">
          {query
            ? "No returns match your search."
            : "No return requests match this filter yet."}
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {visibleRows.map((r) => {
            const allowed = NEXT_STATUSES[r.status] ?? [];
            const notes = notesById[r.id] ?? "";
            const userLabel = userNameById[r.user_id] ?? `User #${r.user_id}`;
            const itemLabels = buildItemLabels(r);
            return (
              <article
                key={r.id}
                className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-black/[0.06]"
              >
                <header className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="font-display text-section-title font-semibold text-kofkan-crimson">
                      Return #{r.id}
                    </span>
                    <Link
                      href={`/system/orders/${r.order_id}`}
                      className="text-small font-semibold text-kofkan-gold hover:underline"
                    >
                      Order #{r.order_id}
                    </Link>
                    <span className="text-[11px] text-kofkan-text-muted">
                      {userLabel} · {new Date(r.created_at).toLocaleString()}
                    </span>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase ${statusBadgeClass(r.status)}`}
                  >
                    {r.status}
                  </span>
                </header>

                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-kofkan-text-muted">
                      Reason
                    </p>
                    <p className="text-small text-kofkan-text-primary">{r.reason}</p>
                    {r.details && (
                      <p className="mt-1 whitespace-pre-wrap text-small text-kofkan-text-secondary">
                        {r.details}
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-kofkan-text-muted">
                      Preferred outcome
                    </p>
                    <p className="text-small capitalize text-kofkan-text-primary">
                      {r.preferred_outcome}
                    </p>
                    <p className="mt-2 text-[11px] font-semibold uppercase tracking-wider text-kofkan-text-muted">
                      Items
                    </p>
                    <ul className="mt-1 space-y-0.5 text-small text-kofkan-text-secondary">
                      {itemLabels.map((lbl, idx) => (
                        <li key={`${r.id}-${idx}`} className="flex items-baseline gap-2">
                          <span className="min-w-0 truncate" title={lbl.product_name}>
                            {lbl.product_name}
                          </span>
                          <span className="shrink-0 text-[11px] text-kofkan-text-muted">
                            × {lbl.quantity}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="mt-3">
                  <label
                    htmlFor={`notes-${r.id}`}
                    className="block text-[11px] font-semibold uppercase tracking-wider text-kofkan-text-muted"
                  >
                    Internal notes
                  </label>
                  <textarea
                    id={`notes-${r.id}`}
                    value={notes}
                    onChange={(e) =>
                      setNotesById((prev) => ({ ...prev, [r.id]: e.target.value }))
                    }
                    rows={2}
                    maxLength={4000}
                    placeholder="Visible only to admins — track decisions, refund refs, etc."
                    className="mt-1 w-full rounded-lg border border-kofkan-gray-soft bg-white px-3 py-2 text-small text-kofkan-text-primary focus:border-kofkan-gold focus:outline-none"
                  />
                </div>

                {allowed.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {allowed.map((next) => (
                      <button
                        key={next}
                        type="button"
                        disabled={savingId === r.id}
                        onClick={() => void handleStatusChange(r, next)}
                        className="rounded-full bg-kofkan-crimson px-3 py-1.5 text-[11px] font-semibold capitalize text-white disabled:opacity-60"
                      >
                        Mark {next}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-[11px] text-kofkan-text-muted">
                    This return is in a terminal state.
                  </p>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
