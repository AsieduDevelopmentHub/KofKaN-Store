"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { ordersList, type OrderRow } from "@/lib/api/orders";
import { formatGhs } from "@/lib/mock-data";
import { orderStatusLabel, orderStatusPillClass } from "@/lib/order-status-ui";
import { SkeletonBlock } from "@/components/StorefrontSkeletons";

function formatWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}

function parseHiddenOrderIds(raw: string | null): number[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((v) => typeof v === "number" && Number.isFinite(v));
  } catch {
    return [];
  }
}

export function AccountOrdersPanel() {
  const { user, accessToken } = useAuth();

  const storageKey = useMemo(() => {
    const id = user?.id;
    return typeof id === "number" && Number.isFinite(id) ? `kofkan-hidden-orders:${id}` : "kofkan-hidden-orders:anon";
  }, [user?.id]);

  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [busy, setBusy] = useState(false);

  const [hiddenIds, setHiddenIds] = useState<Set<number>>(() => new Set());
  const [showHidden, setShowHidden] = useState(false);

  useEffect(() => {
    setHiddenIds(
      new Set(parseHiddenOrderIds(typeof window !== "undefined" ? window.localStorage.getItem(storageKey) : null)),
    );
  }, [storageKey]);

  useEffect(() => {
    if (!accessToken) {
      setOrders([]);
      setBusy(false);
      return;
    }

    setBusy(true);
    ordersList(accessToken)
      .then(setOrders)
      .catch(() => setOrders([]))
      .finally(() => setBusy(false));
  }, [accessToken]);

  const visibleOrders = useMemo(() => {
    return orders
      .filter((o) => !hiddenIds.has(o.id))
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }, [orders, hiddenIds]);

  const hiddenOrders = useMemo(() => {
    return orders
      .filter((o) => hiddenIds.has(o.id))
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }, [orders, hiddenIds]);

  const persistHidden = (next: Set<number>) => {
    setHiddenIds(next);
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(Array.from(next)));
    } catch {
      // Non-fatal: user can still use the UI during this session.
    }
  };

  const hideOrder = (orderId: number) => {
    const next = new Set(hiddenIds);
    next.add(orderId);
    persistHidden(next);
  };

  const restoreOrder = (orderId: number) => {
    const next = new Set(hiddenIds);
    next.delete(orderId);
    persistHidden(next);
  };

  return (
    <section className="rounded-[12px] bg-white p-5 shadow-sm ring-1 ring-black/[0.06] dark:bg-zinc-900 dark:ring-white/10">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="font-display text-section-title font-semibold text-kofkan-text-primary dark:text-zinc-100">Orders</h2>
          <p className="mt-1 text-small text-kofkan-text-secondary">
            Reviews are unlocked when your order is marked as <span className="font-semibold text-kofkan-text-primary">delivered</span>.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {hiddenIds.size > 0 ? (
            <button
              type="button"
              className="kofkan-tap rounded-[10px] border border-kofkan-gray-soft bg-white px-3 py-2 text-small font-semibold text-kofkan-text-primary dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-100"
              onClick={() => setShowHidden((v) => !v)}
            >
              {showHidden ? "Hide hidden" : `Show hidden (${hiddenIds.size})`}
            </button>
          ) : null}
          <Link
            href="/account/returns"
            className="kofkan-tap rounded-[10px] bg-white px-3 py-2 text-small font-semibold text-kofkan-text-primary shadow-sm ring-1 ring-black/[0.06] dark:bg-zinc-900 dark:ring-white/10"
          >
            View my returns
          </Link>
        </div>
      </div>

      {busy ? (
        <div className="mt-4 space-y-3" aria-hidden>
          <SkeletonBlock className="h-16 w-full rounded-[12px]" />
          <SkeletonBlock className="h-16 w-full rounded-[12px]" />
          <SkeletonBlock className="h-16 w-full rounded-[12px]" />
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {visibleOrders.length === 0 ? <p className="text-small text-kofkan-text-secondary">No orders to show.</p> : null}

          {visibleOrders.map((o) => {
            const isDelivered = (o.status ?? "").trim().toLowerCase() === "delivered";
            return (
              <article key={o.id} className="rounded-xl border border-kofkan-gray-soft bg-white p-4 dark:bg-zinc-900">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-kofkan-text-primary">Order #{o.id}</p>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${orderStatusPillClass(
                          o.status,
                        )}`}
                      >
                        {orderStatusLabel(o.status)}
                      </span>
                    </div>
                    <p className="mt-1 text-small text-kofkan-text-muted dark:text-zinc-500">
                      {formatWhen(o.created_at)} {typeof o.total_price === "number" ? `· ${formatGhs(o.total_price)}` : null}
                    </p>
                    <p className="mt-1 text-xs text-kofkan-text-muted">{isDelivered ? "Reviews unlocked for this order." : "Reviews unlock when delivered."}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => hideOrder(o.id)}
                    className="kofkan-tap rounded-[10px] border border-kofkan-gray-soft bg-white px-3 py-2 text-small font-semibold text-kofkan-text-secondary dark:border-white/10 dark:bg-zinc-900"
                    aria-label={`Hide order ${o.id} from account list`}
                  >
                    Hide
                  </button>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <Link
                    href={`/orders/${o.id}`}
                    className="kofkan-tap rounded-[10px] border border-kofkan-gray-soft bg-white px-3 py-2 text-small font-semibold text-kofkan-text-primary dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-100"
                  >
                    View order
                  </Link>
                  <Link
                    href={`/orders/${o.id}/return`}
                    className="kofkan-tap rounded-[10px] border border-kofkan-gray-soft bg-white px-3 py-2 text-small font-semibold text-kofkan-text-primary dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-100"
                  >
                    Return
                  </Link>
                </div>

                {isDelivered ? (
                  <p className="mt-3 text-xs text-kofkan-text-secondary">Open this order and review the item(s) on the product pages.</p>
                ) : null}
              </article>
            );
          })}

          {hiddenIds.size > 0 && showHidden ? (
            <>
              <p className="pt-2 text-small font-semibold text-kofkan-text-secondary">Hidden orders</p>
              {hiddenOrders.length === 0 ? <p className="text-small text-kofkan-text-secondary">Nothing hidden.</p> : null}
              {hiddenOrders.map((o) => (
                <article key={o.id} className="rounded-xl border border-kofkan-gray-soft bg-white p-4 dark:bg-zinc-900">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-kofkan-text-primary">Order #{o.id}</p>
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${orderStatusPillClass(
                            o.status,
                          )}`}
                        >
                          {orderStatusLabel(o.status)}
                        </span>
                      </div>
                      <p className="mt-1 text-small text-kofkan-text-muted dark:text-zinc-500">
                        {formatWhen(o.created_at)} {typeof o.total_price === "number" ? `· ${formatGhs(o.total_price)}` : null}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => restoreOrder(o.id)}
                      className="kofkan-tap rounded-[10px] bg-kofkan-cream px-3 py-2 text-small font-semibold text-kofkan-text-primary ring-1 ring-black/[0.06] dark:bg-zinc-800 dark:ring-white/10"
                    >
                      Restore
                    </button>
                  </div>
                </article>
              ))}
            </>
          ) : null}
        </div>
      )}
    </section>
  );
}
