"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  adminFetchDashboard,
  adminFetchLowStockAlerts,
  adminFetchOrders,
  adminFetchRevenue,
  type AdminDashboardMetrics,
  type AdminOrderListItem,
  type RevenueStat,
  type StockAlertItem,
} from "@/lib/api/admin";
import { pingBackendHealth } from "@/lib/api/client";
import { formatGhs } from "@/lib/mock-data";
import { RevenueTrendChart } from "@/components/admin/charts/RevenueTrendChart";
import { OrderStatusDonut } from "@/components/admin/charts/OrderStatusDonut";
import {
  Skeleton,
  SkeletonChart,
  SkeletonDonut,
  SkeletonList,
  SkeletonStatCard,
  SkeletonTableRow,
} from "@/components/admin/Skeleton";

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-black/[0.06]">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-kofkan-text-muted">{label}</p>
      <p className="mt-1 font-display text-[1.15rem] font-semibold text-kofkan-text-primary">{value}</p>
    </div>
  );
}

export function AdminDashboardContent() {
  const { accessToken } = useAuth();
  const router = useRouter();
  const [days, setDays] = useState(30);
  const [data, setData] = useState<AdminDashboardMetrics | null>(null);
  const [revenue, setRevenue] = useState<RevenueStat[]>([]);
  const [recent, setRecent] = useState<AdminOrderListItem[]>([]);
  const [lowStock, setLowStock] = useState<StockAlertItem[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setErr(null);
    try {
      const [dRes, revRes, ordersRes, alertsRes] = await Promise.allSettled([
        adminFetchDashboard(accessToken, days),
        adminFetchRevenue(accessToken, days),
        adminFetchOrders(accessToken, { limit: 10 }),
        adminFetchLowStockAlerts(accessToken, { threshold: 5, limit: 16 }),
      ]);

      if (dRes.status === "fulfilled") setData(dRes.value);
      if (revRes.status === "fulfilled") setRevenue(revRes.value);
      if (ordersRes.status === "fulfilled") {
        setRecent(Array.isArray(ordersRes.value) ? ordersRes.value : []);
      }
      if (alertsRes.status === "fulfilled") {
        setLowStock(alertsRes.value.slice(0, 8));
      }

      const failures = [dRes, revRes, ordersRes, alertsRes].filter(
        (r): r is PromiseRejectedResult => r.status === "rejected"
      );
      const allFailed = failures.length === 4;
      if (failures.length > 0) {
        const first = failures[0].reason;
        const msg = first instanceof Error ? first.message : String(first);
        const looksNetwork =
          msg.toLowerCase().includes("failed to fetch") ||
          msg.toLowerCase().includes("networkerror") ||
          msg.toLowerCase().includes("load failed");
        if (looksNetwork && allFailed) {
          setErr("Couldn't reach the server. Check your connection and try again.");
        } else if (msg.includes("403")) {
          setErr("Some sections are hidden for your account.");
        } else {
          setErr("Some sections couldn't load. Try again.");
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not load dashboard";
      setErr(msg.includes("403") ? "You do not have access to this area." : msg);
      setData(null);
    } finally {
      setLoading(false);
      setLoaded(true);
    }
  }, [accessToken, days]);

  useEffect(() => {
    pingBackendHealth();
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-page-title font-semibold text-kofkan-text-primary">Dashboard</h1>
          <p className="mt-1 text-small text-kofkan-text-secondary">
            Snapshot of sales, orders, and catalog health.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {([7, 30, 90] as const).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDays(d)}
              className={`rounded-full px-4 py-1.5 text-small font-semibold transition-colors ${
                days === d
                  ? "bg-kofkan-crimson text-white"
                  : "bg-white text-kofkan-text-secondary ring-1 ring-black/[0.08] hover:bg-kofkan-gray-soft"
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {err && (
        <div className="mt-4 flex flex-col gap-2 rounded-xl bg-red-50 px-4 py-3 text-small text-red-800 ring-1 ring-red-100 sm:flex-row sm:items-center sm:justify-between">
          <p>{err}</p>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="self-start rounded-full border border-red-200 bg-white px-3 py-1 text-[12px] font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60 sm:self-auto"
          >
            {loading ? "Retrying…" : "Retry"}
          </button>
        </div>
      )}

      <p className="mt-4 text-small text-kofkan-text-muted">
        {data
          ? `Metrics over the last ${data.period_days} days.`
          : `Metrics over the last ${days} days.`}
      </p>
      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {data ? (
          <>
            <StatCard label="Revenue" value={formatGhs(data.total_revenue)} />
            <StatCard label="Orders" value={String(data.total_orders)} />
            <StatCard label="New customers" value={String(data.new_users)} />
            <StatCard label="Avg. order" value={formatGhs(data.avg_order_value)} />
            <StatCard label="Products live" value={String(data.total_products)} />
            <StatCard label="Active users" value={String(data.active_users)} />
            <StatCard label="Active carts" value={String(data.active_carts)} />
            <StatCard label="Users (total)" value={String(data.total_users)} />
          </>
        ) : loading && !loaded ? (
          Array.from({ length: 8 }).map((_, i) => <SkeletonStatCard key={i} />)
        ) : (
          <>
            <StatCard label="Revenue" value="—" />
            <StatCard label="Orders" value="—" />
            <StatCard label="New customers" value="—" />
            <StatCard label="Avg. order" value="—" />
            <StatCard label="Products live" value="—" />
            <StatCard label="Active users" value="—" />
            <StatCard label="Active carts" value="—" />
            <StatCard label="Users (total)" value="—" />
          </>
        )}
      </div>

      {accessToken && (
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <section className="min-w-0 rounded-xl bg-white p-5 shadow-sm ring-1 ring-black/[0.06]">
            <h2 className="font-display text-section-title font-semibold text-kofkan-text-primary">
              Revenue trend
            </h2>
            <p className="mt-1 text-[11px] text-kofkan-text-muted">
              {loading && revenue.length === 0
                ? "Loading revenue…"
                : revenue.length > 0
                ? `Daily gross revenue over the last ${Math.min(revenue.length, days)} days.`
                : `No revenue recorded in the last ${days} days.`}
            </p>
            <div className="mt-4 text-kofkan-crimson">
              {loading && !loaded && revenue.length === 0 ? (
                <SkeletonChart />
              ) : (
                <RevenueTrendChart stats={revenue} window={days} />
              )}
            </div>
          </section>

          <section className="min-w-0 rounded-xl bg-white p-5 shadow-sm ring-1 ring-black/[0.06]">
            <h2 className="font-display text-section-title font-semibold text-kofkan-text-primary">
              Orders by status
            </h2>
            <p className="mt-1 text-[11px] text-kofkan-text-muted">
              Share of orders by fulfilment state in the selected window.
            </p>
            {data ? (
              <OrderStatusDonut stats={data.order_stats} />
            ) : loading && !loaded ? (
              <SkeletonDonut />
            ) : (
              <p className="mt-4 text-small text-kofkan-text-muted">
                Status breakdown isn&apos;t available right now.
              </p>
            )}
          </section>
        </div>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="min-w-0 rounded-xl bg-white p-5 shadow-sm ring-1 ring-black/[0.06]">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-section-title font-semibold text-kofkan-text-primary">
              Recent orders
            </h2>
            <Link href="/system/orders" className="text-small font-semibold text-kofkan-gold hover:underline">
              View all
            </Link>
          </div>
          {loading && !loaded && recent.length === 0 ? (
            <div className="mt-3">
              <div className="hidden overflow-x-auto sm:block">
                <table className="w-full min-w-[360px] text-left text-small">
                  <thead className="border-b border-black/[0.06] text-[11px] font-semibold uppercase tracking-wider text-kofkan-text-muted">
                    <tr>
                      <th className="py-2 pr-2">Order</th>
                      <th className="py-2 pr-2">Status</th>
                      <th className="py-2 pr-2">Total</th>
                      <th className="py-2">Payment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <SkeletonTableRow key={i} cols={4} />
                    ))}
                  </tbody>
                </table>
              </div>
              <ul className="space-y-2 sm:hidden">
                {Array.from({ length: 4 }).map((_, i) => (
                  <li
                    key={i}
                    className="rounded-lg border border-kofkan-gray-soft bg-kofkan-cream/40 p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <Skeleton className="h-3 w-14" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                    <Skeleton className="mt-2 h-3 w-20" />
                    <Skeleton className="mt-1 h-2 w-24" />
                  </li>
                ))}
              </ul>
            </div>
          ) : recent.length === 0 ? (
            <p className="mt-3 text-small text-kofkan-text-muted">No orders yet.</p>
          ) : (
                <div className="mt-3">
                  <ul className="space-y-2 sm:hidden">
                    {recent.map((o) => (
                      <li
                        key={o.id}
                        className="rounded-lg border border-kofkan-gray-soft bg-kofkan-cream/40 p-3"
                      >
                        <button
                          type="button"
                          className="w-full text-left"
                          onClick={() => router.push(`/system/orders/${o.id}`)}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-semibold text-kofkan-crimson">#{o.id}</p>
                            <span className="text-[11px] capitalize text-kofkan-text-muted">
                              {o.status}
                            </span>
                          </div>
                          <p className="mt-1 text-small font-medium text-kofkan-text-primary">
                            {formatGhs(o.total_price)}
                          </p>
                          <p className="mt-0.5 text-[11px] text-kofkan-text-muted">
                            Payment: {o.payment_status}
                          </p>
                        </button>
                      </li>
                    ))}
                  </ul>
                  <div className="hidden overflow-x-auto sm:block">
                    <table className="w-full min-w-[360px] text-left text-small">
                    <thead className="border-b border-black/[0.06] text-[11px] font-semibold uppercase tracking-wider text-kofkan-text-muted">
                      <tr>
                        <th className="py-2 pr-2">Order</th>
                        <th className="py-2 pr-2">Status</th>
                        <th className="py-2 pr-2">Total</th>
                        <th className="py-2">Payment</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-kofkan-gray-soft">
                      {recent.map((o) => (
                        <tr
                          key={o.id}
                          className="cursor-pointer hover:bg-kofkan-cream/80"
                          onClick={() => router.push(`/system/orders/${o.id}`)}
                        >
                          <td className="py-3 pr-2 font-semibold text-kofkan-crimson">#{o.id}</td>
                          <td className="py-3 pr-2 text-kofkan-text-muted capitalize">{o.status}</td>
                          <td className="py-3 pr-2 font-medium">{formatGhs(o.total_price)}</td>
                          <td className="py-3 text-[11px] text-kofkan-text-muted">{o.payment_status}</td>
                        </tr>
                      ))}
                    </tbody>
                    </table>
                  </div>
                </div>
              )}
            </section>

        <section className="min-w-0 rounded-xl bg-white p-5 shadow-sm ring-1 ring-black/[0.06]">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-section-title font-semibold text-kofkan-text-primary">
              Low stock
            </h2>
            <Link href="/system/inventory" className="text-small font-semibold text-kofkan-gold hover:underline">
              Inventory
            </Link>
          </div>
          {loading && !loaded && lowStock.length === 0 ? (
            <SkeletonList rows={5} />
          ) : (
            <ul className="mt-3 divide-y divide-kofkan-gray-soft">
              {lowStock.length === 0 ? (
                <li className="py-3 text-small text-kofkan-text-muted">No low-stock alerts.</li>
              ) : (
                lowStock.map((p) => {
                  const key =
                    p.kind === "variant" && p.variant_id != null
                      ? `v-${p.product_id}-${p.variant_id}`
                      : `p-${p.product_id}`;
                  const title =
                    p.kind === "variant" && p.parent_product_name
                      ? `${p.parent_product_name} — ${p.name}`
                      : p.name;
                  return (
                    <li
                      key={key}
                      className="flex flex-col gap-1 py-3 text-small sm:flex-row sm:items-center sm:justify-between sm:gap-3"
                    >
                      <Link
                        href={`/system/products/${p.product_id}`}
                        className="block min-w-0 max-w-full truncate font-medium text-kofkan-text-primary hover:underline sm:flex-1"
                        title={title}
                      >
                        {p.kind === "variant" ? (
                          <>
                            <span className="text-kofkan-text-muted">{p.parent_product_name} · </span>
                            {p.name}
                          </>
                        ) : (
                          p.name
                        )}
                      </Link>
                      <span className="w-fit shrink-0 whitespace-nowrap rounded-full bg-rose-100 px-2 py-0.5 font-semibold text-kofkan-crimson">
                        {p.in_stock} left
                      </span>
                    </li>
                  );
                })
              )}
            </ul>
          )}
        </section>
      </div>

      {data && data.top_products.length > 0 && (
        <section className="mt-8 rounded-xl bg-white p-5 shadow-sm ring-1 ring-black/[0.06]">
          <h2 className="font-display text-section-title font-semibold text-kofkan-text-primary">
            Top products
          </h2>
          <ul className="mt-3 divide-y divide-kofkan-gray-soft">
            {data.top_products.map((row) => (
              <li key={row.product_id} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <Link
                    href={`/system/products/${row.product_id}`}
                    className="font-semibold text-kofkan-gold hover:underline"
                  >
                    {row.name}
                  </Link>
                  <p className="text-[11px] text-kofkan-text-muted">
                    Sold {row.quantity_sold} · {row.review_count} reviews · {formatGhs(row.price)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
