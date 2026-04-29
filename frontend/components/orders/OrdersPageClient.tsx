"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ScreenHeader } from "@/components/ScreenHeader";
import { FaFilterIcon } from "@/components/FaIcons";
import { useAuth } from "@/context/AuthContext";
import { ordersList, type OrderRow } from "@/lib/api/orders";
import { paystackInitialize } from "@/lib/api/payments";
import { OrderProductThumb } from "@/components/orders/OrderProductThumb";
import { formatGhs } from "@/lib/mock-data";
import { orderStatusLabel, orderStatusPillClass } from "@/lib/order-status-ui";
import { OrderListSkeleton, SkeletonBlock } from "@/components/StorefrontSkeletons";

const STATUS_FILTERS = ["all", "pending", "processing", "packed", "shipped", "delivered", "cancelled"] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

function formatOrderDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return iso;
  }
}

export function OrdersPageClient() {
  const { user, accessToken, loading: authLoading } = useAuth();
  const [rows, setRows] = useState<OrderRow[]>([]);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [payingOrderId, setPayingOrderId] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setLoadErr(null);
    try {
      const list = await ordersList(accessToken);
      setRows(list);
    } catch (e) {
      setLoadErr(e instanceof Error ? e.message : "Could not load orders");
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    if (authLoading) return;
    if (!user || !accessToken) {
      setRows([]);
      return;
    }
    void load();
  }, [authLoading, user, accessToken, load]);

  const filtered = useMemo(() => {
    if (statusFilter === "all") return rows;
    return rows.filter((r) => r.status.toLowerCase() === statusFilter);
  }, [rows, statusFilter]);

  async function onPayNow(orderId: number) {
    if (!accessToken) return;
    setPayingOrderId(orderId);
    setLoadErr(null);
    try {
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const callbackUrl = `${origin}/orders/${orderId}`;
      const pay = await paystackInitialize(accessToken, orderId, callbackUrl);
      if (typeof window !== "undefined" && pay.authorization_url) {
        window.location.href = pay.authorization_url;
      }
    } catch (e) {
      setLoadErr(e instanceof Error ? e.message : "Could not start payment");
    } finally {
      setPayingOrderId(null);
    }
  }

  if (authLoading) {
    return (
      <main className="bg-kofkan-cream pb-4 dark:bg-zinc-950">
        <ScreenHeader variant="inner" title="My Orders" left="menu" right="profile" />
        <div className="mx-auto max-w-mobile px-4 pb-2 pt-3">
          <SkeletonBlock className="h-11 w-28 rounded-[10px]" />
        </div>
        <OrderListSkeleton />
      </main>
    );
  }

  if (!user || !accessToken) {
    return (
      <main className="bg-kofkan-cream dark:bg-zinc-950">
        <ScreenHeader variant="inner" title="My Orders" left="menu" right="profile" />
        <div className="mx-auto max-w-mobile px-4 py-14 text-center">
          <p className="text-body text-kofkan-text-secondary dark:text-zinc-400">Sign in to see your orders.</p>
          <Link href="/account" className="mt-4 inline-block font-semibold text-kofkan-gold hover:underline">
            Account
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="bg-kofkan-cream dark:bg-zinc-950">
      <ScreenHeader variant="inner" title="My Orders" left="menu" right="profile" />
      <div className="mx-auto max-w-mobile px-4 pb-2 pt-3">
        <button
          type="button"
          className="kofkan-tap flex items-center gap-2 rounded-[10px] bg-white px-4 py-2.5 text-small font-semibold text-kofkan-text-primary ring-1 ring-kofkan-gray-soft dark:bg-zinc-900 dark:text-zinc-100 dark:ring-white/10"
          aria-expanded={filterOpen}
          onClick={() => setFilterOpen((v) => !v)}
        >
          <FaFilterIcon />
          Filter
        </button>
        {filterOpen && (
          <div className="mt-3 flex flex-wrap gap-2 rounded-[10px] bg-white p-3 ring-1 ring-black/[0.06] dark:bg-zinc-900 dark:ring-white/10">
            {STATUS_FILTERS.map((s) => {
              const active = statusFilter === s;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatusFilter(s)}
                  className={`rounded-full px-3 py-1.5 text-[11px] font-semibold capitalize ring-1 ${
                    active
                      ? "bg-kofkan-gold text-white ring-kofkan-gold-hover"
                      : "bg-kofkan-gray-soft text-kofkan-text-secondary ring-transparent dark:bg-zinc-800 dark:text-zinc-300"
                  }`}
                >
                  {s}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {loadErr && (
        <p className="mx-4 rounded-[10px] bg-red-50 px-3 py-2 text-small text-red-800 ring-1 ring-red-100 dark:bg-red-950/40 dark:text-red-100">
          {loadErr}
        </p>
      )}

      {loading ? (
        <OrderListSkeleton />
      ) : filtered.length === 0 ? (
        <div className="mx-auto max-w-mobile px-4 py-10 text-center text-small text-kofkan-text-secondary dark:text-zinc-400">
          {rows.length === 0 ? "No orders yet." : "No orders match this filter."}
          {rows.length === 0 ? (
            <Link href="/shop" className="mt-3 block font-semibold text-kofkan-gold hover:underline">
              Browse shop
            </Link>
          ) : null}
        </div>
      ) : (
        <ul className="mx-auto max-w-mobile space-y-3 px-4 pb-6">
          {filtered.map((order) => {
            const name = order.preview_product_name?.trim() || "Order summary";
            const nLines = order.line_count ?? 0;
            const pay = (order.payment_status ?? "pending").toLowerCase();
            return (
              <li key={order.id}>
                <div className="overflow-hidden rounded-[10px] bg-white p-4 shadow-[0_2px_14px_rgba(59,42,37,0.06)] ring-1 ring-black/[0.05] dark:bg-zinc-900 dark:ring-white/10">
                  <Link href={`/orders/${order.id}`} className="kofkan-tap block">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-small font-semibold text-kofkan-text-primary dark:text-zinc-100">
                        Order #{order.id}
                      </span>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ring-1 ${orderStatusPillClass(
                          order.status
                        )}`}
                      >
                        {orderStatusLabel(order.status)}
                      </span>
                    </div>
                    <div className="mt-3 flex gap-3">
                      <div className="relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-[10px] bg-kofkan-gray-soft dark:bg-zinc-800">
                        <OrderProductThumb
                          src={order.preview_image_url}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col gap-1">
                        <p className="text-[11px] font-medium uppercase tracking-wide text-kofkan-text-muted dark:text-zinc-500">
                          Summary
                        </p>
                        <p className="line-clamp-2 text-small font-medium leading-snug text-kofkan-text-primary dark:text-zinc-100">
                          {name}
                          {nLines > 1 ? ` +${nLines - 1} more` : ""}
                        </p>
                        <p className="text-small text-kofkan-text-secondary dark:text-zinc-400">
                          {formatOrderDate(order.created_at)} · Payment: {pay}
                        </p>
                        <p className="text-body font-semibold text-kofkan-gold">{formatGhs(order.total_price)}</p>
                        <p className="text-[11px] font-semibold text-kofkan-gold">View order details →</p>
                      </div>
                    </div>
                  </Link>
                  {pay === "pending" && (
                    <button
                      type="button"
                      onClick={() => void onPayNow(order.id)}
                      disabled={payingOrderId === order.id}
                      className="kofkan-btn-gold kofkan-tap mt-3 w-full rounded-[10px] py-2.5 text-small font-semibold text-white disabled:opacity-60"
                    >
                      {payingOrderId === order.id ? "Redirecting…" : "Pay now"}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
