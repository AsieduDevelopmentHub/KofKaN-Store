"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  adminCreateInventoryAdjustment,
  adminFetchInventoryLogs,
  adminFetchInventoryStockLevels,
  type InventoryAdjustmentRow,
  type InventoryStockLevelRow,
} from "@/lib/api/admin";
import { AdminSearchInput } from "@/components/admin/AdminSearchInput";
import { AdminInventoryPageSkeleton } from "@/components/admin/Skeleton";

function stockOptionValue(row: InventoryStockLevelRow): string {
  if (row.kind === "variant" && row.variant_id != null) {
    return `v-${row.product_id}-${row.variant_id}`;
  }
  return `p-${row.product_id}`;
}

function parseStockSelection(val: string): { product_id: number; variant_id?: number | null } {
  const mP = /^p-(\d+)$/.exec(val);
  if (mP) return { product_id: Number(mP[1]), variant_id: null };
  const mV = /^v-(\d+)-(\d+)$/.exec(val);
  if (mV) return { product_id: Number(mV[1]), variant_id: Number(mV[2]) };
  throw new Error("Invalid stock selection");
}

export default function AdminInventoryPage() {
  const { accessToken } = useAuth();
  const [rows, setRows] = useState<InventoryStockLevelRow[]>([]);
  const [logs, setLogs] = useState<InventoryAdjustmentRow[]>([]);
  const [stockKey, setStockKey] = useState("");
  const [delta, setDelta] = useState("");
  const [reason, setReason] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [adjusting, setAdjusting] = useState(false);
  const [stockQuery, setStockQuery] = useState("");
  const [logQuery, setLogQuery] = useState("");
  const [ready, setReady] = useState(false);

  const load = useCallback(async () => {
    if (!accessToken) return;
    try {
      const [levels, changes] = await Promise.all([
        adminFetchInventoryStockLevels(accessToken, { limit_products: 300 }),
        adminFetchInventoryLogs(accessToken, { limit: 100 }),
      ]);
      setRows(levels);
      setLogs(changes);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setReady(true);
    }
  }, [accessToken]);

  useEffect(() => {
    void load();
  }, [load]);

  const logLineLabel = useCallback(
    (l: InventoryAdjustmentRow) => {
      if (l.variant_id != null) {
        const hit = rows.find((r) => r.kind === "variant" && r.variant_id === l.variant_id);
        if (hit) return hit.label;
        return `Variant #${l.variant_id} (product #${l.product_id})`;
      }
      const hit = rows.find((r) => r.kind === "product" && r.product_id === l.product_id);
      if (hit) return hit.label;
      return `Product #${l.product_id}`;
    },
    [rows]
  );

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => a.in_stock - b.in_stock);
  }, [rows]);

  const filteredStock = useMemo(() => {
    const q = stockQuery.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter((r) => {
      const hay = `${r.label} ${r.sku ?? ""} ${r.kind}`.toLowerCase();
      return hay.includes(q);
    });
  }, [sorted, stockQuery]);

  const filteredLogs = useMemo(() => {
    const q = logQuery.trim().toLowerCase();
    if (!q) return logs;
    return logs.filter((l) => {
      const label = logLineLabel(l);
      const hay = `${label} #${l.product_id} ${l.variant_id ?? ""} ${l.reason ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [logs, logQuery, logLineLabel]);

  const adjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken || adjusting || !stockKey) return;
    setErr(null);
    setAdjusting(true);
    try {
      const { product_id, variant_id } = parseStockSelection(stockKey);
      await adminCreateInventoryAdjustment(accessToken, {
        product_id,
        variant_id: variant_id ?? null,
        delta: Number(delta),
        reason: reason.trim() || undefined,
      });
      setDelta("");
      setReason("");
      await load();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Adjustment failed");
    } finally {
      setAdjusting(false);
    }
  };

  return (
    <div>
      <h1 className="font-display text-page-title font-semibold">Inventory</h1>
      <p className="text-small text-kofkan-text-secondary">
        Stock for each product and each variant SKU. Every change is recorded in the movement log.
      </p>
      {!ready && !err ? (
        <AdminInventoryPageSkeleton />
      ) : (
        <>
          <form
            onSubmit={(e) => void adjust(e)}
            className="mt-6 grid gap-3 rounded-xl bg-white p-5 shadow-sm ring-1 ring-black/[0.06] sm:grid-cols-4"
          >
            <div className="sm:col-span-2">
              <label htmlFor="stock-select" className="block text-[11px] font-semibold uppercase tracking-wider text-kofkan-text-muted mb-1">
                Product or Variant
              </label>
              <select
                id="stock-select"
                value={stockKey}
                onChange={(e) => setStockKey(e.target.value)}
                required
                className="w-full rounded-lg border border-black/[0.08] px-3 py-2 text-small"
              >
                <option value="">Select product or variant</option>
                {rows.map((r) => (
                  <option key={stockOptionValue(r)} value={stockOptionValue(r)}>
                    {r.label}
                    {r.kind === "variant" ? " · variant" : " · base product"}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="delta-input" className="block text-[11px] font-semibold uppercase tracking-wider text-kofkan-text-muted mb-1">
                Delta (+/-)
              </label>
              <input
                id="delta-input"
                required
                type="number"
                placeholder="e.g. +5 or -2"
                value={delta}
                onChange={(e) => setDelta(e.target.value)}
                className="w-full rounded-lg border border-black/[0.08] px-3 py-2 text-small"
              />
            </div>
            <div>
              <label htmlFor="reason-input" className="block text-[11px] font-semibold uppercase tracking-wider text-kofkan-text-muted mb-1">
                Reason
              </label>
              <input
                id="reason-input"
                placeholder="Optional reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full rounded-lg border border-black/[0.08] px-3 py-2 text-small"
              />
            </div>
            <div className="sm:col-span-4 flex justify-end">
              <button
                type="submit"
                disabled={adjusting}
                className="rounded-full bg-kofkan-crimson px-4 py-2 text-small font-semibold text-white disabled:opacity-60"
              >
                {adjusting ? "Saving…" : "Save adjustment"}
              </button>
            </div>
            {err ? (
              <p
                className="sm:col-span-4 rounded-lg bg-red-50 px-3 py-2 text-small text-red-800"
                role="alert"
              >
                {err}
              </p>
            ) : null}
          </form>

          <section className="mt-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="font-display text-section-title font-semibold text-kofkan-text-primary">
                Stock levels
              </h2>
              <AdminSearchInput
                value={stockQuery}
                onChange={setStockQuery}
                placeholder="Search product, variant, or SKU…"
                hint={stockQuery ? `${filteredStock.length} of ${sorted.length} shown` : undefined}
              />
            </div>
            {filteredStock.length === 0 && !err && ready ? (
              <p className="mt-3 rounded-xl bg-white px-4 py-8 text-center text-small text-kofkan-text-muted shadow-sm ring-1 ring-black/[0.06]">
                {stockQuery ? "No rows match your search." : "No stock rows."}
              </p>
            ) : (
              <>
                <ul className="mt-3 space-y-2 md:hidden">
                  {filteredStock.map((r) => (
                    <li
                      key={stockOptionValue(r)}
                      className={`rounded-xl bg-white p-3 shadow-sm ring-1 ring-black/[0.06] ${
                        r.in_stock <= 5 ? "ring-amber-200" : ""
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p
                            className="truncate font-medium text-kofkan-text-primary"
                            title={r.label}
                          >
                            {r.label}
                          </p>
                          <p className="mt-0.5 truncate font-mono text-[11px] text-kofkan-text-muted">
                            SKU: {r.sku ?? "—"} · {r.kind === "variant" ? "Variant" : "Product"}
                          </p>
                        </div>
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                            r.in_stock <= 5
                              ? "bg-amber-100 text-amber-900"
                              : "bg-kofkan-cream text-kofkan-text-secondary"
                          }`}
                        >
                          {r.in_stock} in stock
                        </span>
                      </div>
                      <div className="mt-2 flex justify-end">
                        <Link
                          href={`/system/products/${r.product_id}`}
                          className="text-[11px] font-semibold text-kofkan-gold hover:underline"
                        >
                          Update
                        </Link>
                      </div>
                    </li>
                  ))}
                </ul>

                <div className="mt-3 hidden overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-black/[0.06] md:block">
                  <table className="w-full min-w-[520px] text-left text-small">
                    <thead className="border-b border-black/[0.06] text-[11px] font-semibold uppercase tracking-wider text-kofkan-text-muted">
                      <tr>
                        <th className="px-4 py-3">Item</th>
                        <th className="px-4 py-3">Type</th>
                        <th className="px-4 py-3">SKU</th>
                        <th className="px-4 py-3">Stock</th>
                        <th className="px-4 py-3 text-right">Edit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-kofkan-gray-soft">
                      {filteredStock.map((r) => (
                        <tr
                          key={stockOptionValue(r)}
                          className={r.in_stock <= 5 ? "bg-amber-50/50" : undefined}
                        >
                          <td className="px-4 py-3 font-medium">{r.label}</td>
                          <td className="px-4 py-3 text-[11px] capitalize text-kofkan-text-muted">
                            {r.kind}
                          </td>
                          <td className="px-4 py-3 font-mono text-[11px] text-kofkan-text-muted">
                            {r.sku ?? "—"}
                          </td>
                          <td className="px-4 py-3">
                            <span className={r.in_stock <= 5 ? "font-bold text-amber-900" : ""}>
                              {r.in_stock}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Link
                              href={`/system/products/${r.product_id}`}
                              className="text-[11px] font-semibold text-kofkan-gold hover:underline"
                            >
                              Update
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>

          <section className="mt-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="font-display text-section-title font-semibold text-kofkan-text-primary">
                Movement log
              </h2>
              <AdminSearchInput
                value={logQuery}
                onChange={setLogQuery}
                placeholder="Search item or reason…"
                hint={logQuery ? `${filteredLogs.length} of ${logs.length} shown` : undefined}
              />
            </div>
            {filteredLogs.length === 0 && ready ? (
              <p className="mt-3 rounded-xl bg-white px-4 py-8 text-center text-small text-kofkan-text-muted shadow-sm ring-1 ring-black/[0.06]">
                {logQuery ? "No movements match your search." : "No inventory movement logs yet."}
              </p>
            ) : (
              <>
                <ul className="mt-3 space-y-2 md:hidden">
                  {filteredLogs.map((l) => {
                    const name = logLineLabel(l);
                    return (
                      <li
                        key={l.id}
                        className="rounded-xl bg-white p-3 shadow-sm ring-1 ring-black/[0.06]"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[11px] text-kofkan-text-muted">
                            {new Date(l.created_at).toLocaleString()}
                          </p>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                              l.delta >= 0
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-red-50 text-red-700"
                            }`}
                          >
                            {l.delta >= 0 ? `+${l.delta}` : l.delta}
                          </span>
                        </div>
                        <Link
                          href={`/system/products/${l.product_id}`}
                          className="mt-2 block truncate text-small font-medium text-kofkan-text-primary hover:underline"
                          title={name}
                        >
                          {name}
                        </Link>
                        <div className="mt-1 flex items-center justify-between gap-2 text-small">
                          <span className="text-[11px] text-kofkan-text-muted">
                            #{l.product_id}
                            {l.variant_id != null ? ` · v${l.variant_id}` : ""}
                          </span>
                          <span className="font-mono text-[11px] text-kofkan-text-muted">
                            {l.previous_stock} → {l.new_stock}
                          </span>
                        </div>
                        {l.reason && (
                          <p className="mt-1 text-[11px] text-kofkan-text-muted">{l.reason}</p>
                        )}
                      </li>
                    );
                  })}
                </ul>

                <div className="mt-3 hidden overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-black/[0.06] md:block">
                  <table className="w-full min-w-[680px] text-left text-small">
                    <thead className="border-b border-black/[0.06] text-[11px] font-semibold uppercase tracking-wider text-kofkan-text-muted">
                      <tr>
                        <th className="px-4 py-3">When</th>
                        <th className="px-4 py-3">Item</th>
                        <th className="px-4 py-3">Delta</th>
                        <th className="px-4 py-3">Before</th>
                        <th className="px-4 py-3">After</th>
                        <th className="px-4 py-3">Reason</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-kofkan-gray-soft">
                      {filteredLogs.map((l) => {
                        const name = logLineLabel(l);
                        return (
                          <tr key={l.id}>
                            <td className="px-4 py-3 text-[11px] text-kofkan-text-muted">
                              {new Date(l.created_at).toLocaleString()}
                            </td>
                            <td className="px-4 py-3">
                              <Link
                                href={`/system/products/${l.product_id}`}
                                className="font-medium text-kofkan-text-primary hover:underline"
                              >
                                {name}
                              </Link>
                              <p className="text-[11px] text-kofkan-text-muted">
                                #{l.product_id}
                                {l.variant_id != null ? ` · variant ${l.variant_id}` : ""}
                              </p>
                            </td>
                            <td
                              className={`px-4 py-3 font-semibold ${l.delta >= 0 ? "text-emerald-700" : "text-red-700"}`}
                            >
                              {l.delta >= 0 ? `+${l.delta}` : l.delta}
                            </td>
                            <td className="px-4 py-3">{l.previous_stock}</td>
                            <td className="px-4 py-3">{l.new_stock}</td>
                            <td className="px-4 py-3 text-[11px] text-kofkan-text-muted">
                              {l.reason ?? "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>
        </>
      )}
    </div>
  );
}
