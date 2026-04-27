"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  adminFetchSearchSummary,
  adminFetchTopSearches,
  adminFetchZeroResultSearches,
  type SearchSummary,
  type TopSearchRow,
  type ZeroResultRow,
} from "@/lib/api/admin";
import { AdminSearchAnalyticsSkeleton } from "@/components/admin/Skeleton";

const DAY_OPTIONS = [7, 30, 90] as const;

function formatDate(d: string): string {
  try {
    return new Date(d).toLocaleString();
  } catch {
    return d;
  }
}

export default function AdminSearchAnalyticsPage() {
  const { accessToken } = useAuth();
  const [days, setDays] = useState<number>(30);
  const [summary, setSummary] = useState<SearchSummary | null>(null);
  const [top, setTop] = useState<TopSearchRow[]>([]);
  const [zero, setZero] = useState<ZeroResultRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setErr(null);
    try {
      const [s, t, z] = await Promise.all([
        adminFetchSearchSummary(accessToken, days),
        adminFetchTopSearches(accessToken, { days, limit: 25 }),
        adminFetchZeroResultSearches(accessToken, { days, limit: 25 }),
      ]);
      setSummary(s);
      setTop(t);
      setZero(z);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }, [accessToken, days]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="w-full min-w-0 max-w-full">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-page-title font-semibold">Search analytics</h1>
          <p className="text-small text-kofkan-text-secondary">
            What customers are searching, and where your catalog has gaps.
          </p>
        </div>
        <div className="flex gap-2">
          {DAY_OPTIONS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDays(d)}
              className={`rounded-full px-3 py-1.5 text-[11px] font-semibold ${
                days === d
                  ? "bg-kofkan-crimson text-white"
                  : "bg-white text-kofkan-text-secondary ring-1 ring-black/[0.08]"
              }`}
            >
              Last {d} days
            </button>
          ))}
        </div>
      </div>

      {err && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-small text-red-800">{err}</p>}

      {loading ? (
        <AdminSearchAnalyticsSkeleton />
      ) : (
        <>
          <section className="mt-6 grid gap-3 sm:grid-cols-3">
            <Stat label="Total searches" value={summary?.total_searches ?? 0} />
            <Stat label="Unique queries" value={summary?.unique_queries ?? 0} />
            <Stat
              label="Zero-result searches"
              value={summary?.zero_result_searches ?? 0}
              tone={(summary?.zero_result_searches ?? 0) > 0 ? "warn" : "ok"}
            />
          </section>

          <section className="mt-8">
            <h2 className="font-serif text-section-title font-semibold">Top searches</h2>
            <p className="text-small text-kofkan-text-secondary">
              Highest-volume queries customers ran on the storefront.
            </p>
            <AnalyticsTable
              empty="No searches logged yet in this window."
              columns={[
                { key: "query", label: "Query" },
                { key: "count", label: "Count", align: "right" },
                { key: "avg_results", label: "Avg results", align: "right" },
                { key: "last_seen_at", label: "Last seen" },
              ]}
              rows={top.map((r) => ({
                key: r.query,
                cells: {
                  query: <span className="font-medium">{r.query}</span>,
                  count: r.count,
                  avg_results: r.avg_results.toFixed(1),
                  last_seen_at: formatDate(r.last_seen_at),
                },
              }))}
            />
          </section>

          <section className="mt-8">
            <h2 className="font-serif text-section-title font-semibold">Zero-result queries</h2>
            <p className="text-small text-kofkan-text-secondary">
              Catalog gaps — consider adding products, synonyms, or redirects.
            </p>
            <AnalyticsTable
              empty="Great — no zero-result searches recorded."
              columns={[
                { key: "query", label: "Query" },
                { key: "count", label: "Count", align: "right" },
                { key: "last_seen_at", label: "Last seen" },
              ]}
              rows={zero.map((r) => ({
                key: r.query,
                cells: {
                  query: <span className="font-medium">{r.query}</span>,
                  count: r.count,
                  last_seen_at: formatDate(r.last_seen_at),
                },
              }))}
            />
          </section>
        </>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  tone = "ok",
}: {
  label: string;
  value: number | string;
  tone?: "ok" | "warn";
}) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-black/[0.06]">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-kofkan-text-muted">
        {label}
      </p>
      <p
        className={`mt-1 font-serif text-2xl font-semibold ${
          tone === "warn" ? "text-amber-700" : "text-kofkan-text-primary"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

type Column = {
  key: string;
  label: string;
  align?: "left" | "right";
};

type TableRow = {
  key: string;
  cells: Record<string, React.ReactNode>;
};

function AnalyticsTable({
  columns,
  rows,
  empty,
}: {
  columns: Column[];
  rows: TableRow[];
  empty: string;
}) {
  if (rows.length === 0) {
    return (
      <div className="mt-3 rounded-xl bg-white p-6 text-center text-small text-kofkan-text-muted shadow-sm ring-1 ring-black/[0.06]">
        {empty}
      </div>
    );
  }
  return (
    <div className="mt-3 w-full max-w-full overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-black/[0.06]">
      <table className="w-full min-w-[480px] text-left text-small">
        <thead className="border-b border-black/[0.06] text-[11px] font-semibold uppercase tracking-wider text-kofkan-text-muted">
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                className={`px-4 py-3 ${c.align === "right" ? "text-right" : ""}`}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-kofkan-gray-soft">
          {rows.map((r) => (
            <tr key={r.key}>
              {columns.map((c) => (
                <td
                  key={c.key}
                  className={`px-4 py-3 ${c.align === "right" ? "text-right" : ""}`}
                >
                  {r.cells[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
