"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  adminFetchDashboard,
  adminFetchRevenue,
  type AdminDashboardMetrics,
  type RevenueStat,
} from "@/lib/api/admin";
import { formatGhs } from "@/lib/mock-data";
import { RevenueTrendChart } from "@/components/admin/charts/RevenueTrendChart";
import { OrderStatusDonut } from "@/components/admin/charts/OrderStatusDonut";
import {
  Skeleton,
  SkeletonChart,
  SkeletonDonut,
  SkeletonStatGrid,
} from "@/components/admin/Skeleton";

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-black/[0.06]">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-kofkan-text-muted">
        {label}
      </p>
      <p className="mt-1 font-display text-[1.15rem] font-semibold text-kofkan-text-primary">
        {value}
      </p>
    </div>
  );
}

export default function AdminAnalyticsPage() {
  const { accessToken } = useAuth();
  const [days, setDays] = useState(30);
  const [dash, setDash] = useState<AdminDashboardMetrics | null>(null);
  const [rev, setRev] = useState<RevenueStat[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setErr(null);
    try {
      const [dRes, rRes] = await Promise.allSettled([
        adminFetchDashboard(accessToken, days),
        adminFetchRevenue(accessToken, days),
      ]);
      if (dRes.status === "fulfilled") setDash(dRes.value);
      if (rRes.status === "fulfilled") setRev(rRes.value);

      const failures = [dRes, rRes].filter(
        (r): r is PromiseRejectedResult => r.status === "rejected"
      );
      if (failures.length > 0) {
        const first = failures[0].reason;
        const msg = first instanceof Error ? first.message : String(first);
        setErr(
          msg.includes("403")
            ? "Some sections are hidden for your account."
            : "Some sections couldn't load. Try again."
        );
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load analytics.");
    } finally {
      setLoading(false);
      setLoaded(true);
    }
  }, [accessToken, days]);

  useEffect(() => {
    void load();
  }, [load]);

  const showSkeleton = loading && !loaded;

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-page-title font-semibold text-kofkan-text-primary">
            Analytics
          </h1>
          <p className="mt-1 text-small text-kofkan-text-secondary">
            Revenue and order velocity.
          </p>
        </div>
        <div className="flex flex-col items-stretch gap-2 sm:items-end">
          <div className="flex flex-wrap gap-2">
            {[7, 30, 90].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDays(d)}
                disabled={loading}
                className={`rounded-full px-4 py-1.5 text-small font-semibold transition-colors disabled:opacity-60 ${
                  days === d
                    ? "bg-kofkan-crimson text-white"
                    : "bg-white text-kofkan-text-secondary ring-1 ring-black/[0.08] hover:bg-kofkan-gray-soft"
                }`}
              >
                {d}d
              </button>
            ))}
          </div>
          {err ? (
            <p className="max-w-md rounded-lg bg-red-50 px-3 py-2 text-small text-red-800 ring-1 ring-red-100" role="alert">
              {err}
            </p>
          ) : null}
        </div>
      </div>

      {showSkeleton ? (
        <SkeletonStatGrid count={4} />
      ) : dash ? (
        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Revenue" value={formatGhs(dash.total_revenue)} />
          <StatCard label="Orders" value={String(dash.total_orders)} />
          <StatCard label="New customers" value={String(dash.new_users)} />
          <StatCard label="Avg. order" value={formatGhs(dash.avg_order_value)} />
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Revenue" value="—" />
          <StatCard label="Orders" value="—" />
          <StatCard label="New customers" value="—" />
          <StatCard label="Avg. order" value="—" />
        </div>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-black/[0.06]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-section-title font-semibold text-kofkan-text-primary">
                Revenue trend
              </h2>
              <div className="mt-1 text-[11px] text-kofkan-text-muted">
                {showSkeleton ? (
                  <Skeleton className="h-3 w-52" rounded="md" />
                ) : rev.length > 0 ? (
                  `Daily gross revenue over the last ${Math.min(rev.length, days)} days.`
                ) : (
                  `No revenue recorded in the last ${days} days.`
                )}
              </div>
            </div>
          </div>
          <div className="mt-4 text-kofkan-crimson">
            {showSkeleton ? <SkeletonChart /> : <RevenueTrendChart stats={rev} window={days} />}
          </div>
        </section>

        <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-black/[0.06]">
          <h2 className="font-display text-section-title font-semibold text-kofkan-text-primary">
            Orders by status
          </h2>
          <p className="mt-1 text-[11px] text-kofkan-text-muted">
            Share of orders by fulfilment state in the selected window.
          </p>
          {showSkeleton ? (
            <SkeletonDonut />
          ) : dash ? (
            <OrderStatusDonut stats={dash.order_stats} />
          ) : (
            <p className="mt-4 text-small text-kofkan-text-muted">
              Status breakdown isn&apos;t available right now.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
