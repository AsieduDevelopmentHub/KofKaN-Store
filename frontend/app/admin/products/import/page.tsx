"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useDialog } from "@/context/DialogContext";
import {
  adminBulkImportProducts,
  type BulkImportResult,
} from "@/lib/api/admin";

const TEMPLATE_HEADERS = [
  "name",
  "slug",
  "description",
  "price",
  "in_stock",
  "category",
  "sku",
  "image_url",
  "is_active",
];

const TEMPLATE_EXAMPLE = [
  `"Kente Wrap","kente-wrap","Hand-woven kente wrap",499.00,12,kente,KEN-001,https://...,true`,
];

function actionBadgeClass(action: string): string {
  switch (action) {
    case "create":
      return "bg-emerald-100 text-emerald-800";
    case "update":
      return "bg-blue-100 text-blue-800";
    case "skip":
      return "bg-zinc-200 text-zinc-700";
    case "error":
      return "bg-rose-100 text-rose-800";
    default:
      return "bg-zinc-200 text-zinc-700";
  }
}

function downloadTemplate() {
  const csv = [TEMPLATE_HEADERS.join(","), ...TEMPLATE_EXAMPLE].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "kofkan-products-template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export default function AdminProductsImportPage() {
  const { accessToken } = useAuth();
  const { confirm: confirmDialog } = useDialog();
  const [file, setFile] = useState<File | null>(null);
  const [updateExisting, setUpdateExisting] = useState(true);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<BulkImportResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const run = async (commit: boolean) => {
    if (!accessToken) {
      setErr("Sign in again.");
      return;
    }
    if (!file) {
      setErr("Choose a CSV file first.");
      return;
    }
    setLoading(true);
    setErr(null);
    try {
      const res = await adminBulkImportProducts(accessToken, file, {
        commit,
        updateExisting,
      });
      setResult(res);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Import failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full min-w-0 max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-page-title font-semibold">Bulk import</h1>
          <p className="text-small text-kofkan-text-secondary">
            Upload a CSV to create or update products in one go.
          </p>
        </div>
        <Link
          href="/system/products"
          className="text-small font-semibold text-kofkan-gold hover:underline"
        >
          ← Back to products
        </Link>
      </div>

      <section className="mt-6 rounded-xl bg-white p-5 shadow-sm ring-1 ring-black/[0.06]">
        <h2 className="font-serif text-section-title font-semibold">1. Prepare your file</h2>
        <p className="mt-1 text-small text-kofkan-text-secondary">
          The import expects a UTF-8 CSV. The first row must be the header row. Supported columns:
        </p>
        <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-kofkan-text-muted sm:grid-cols-3">
          {TEMPLATE_HEADERS.map((h) => (
            <li key={h} className="font-mono">
              {h}
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={downloadTemplate}
          className="mt-3 inline-flex rounded-full border border-kofkan-gray-soft bg-white px-3 py-1.5 text-[11px] font-semibold text-kofkan-text-primary hover:bg-kofkan-cream"
        >
          Download template
        </button>
      </section>

      <section className="mt-4 rounded-xl bg-white p-5 shadow-sm ring-1 ring-black/[0.06]">
        <h2 className="font-serif text-section-title font-semibold">2. Upload</h2>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setResult(null);
            }}
            className="block w-full max-w-md text-small"
          />
          <label className="inline-flex items-center gap-2 text-small text-kofkan-text-secondary">
            <input
              type="checkbox"
              checked={updateExisting}
              onChange={(e) => setUpdateExisting(e.target.checked)}
            />
            Update existing products (matched by slug)
          </label>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={loading || !file}
            onClick={() => void run(false)}
            className="rounded-full border border-kofkan-gray-soft bg-white px-4 py-2 text-small font-semibold text-kofkan-text-primary hover:bg-kofkan-cream disabled:opacity-60"
          >
            Dry run
          </button>
          <button
            type="button"
            disabled={loading || !file}
            onClick={() => {
              void (async () => {
                const ok = await confirmDialog({
                  title: "Commit import",
                  message: "Commit this import? Products will be created or updated.",
                  confirmLabel: "Commit import",
                });
                if (ok) void run(true);
              })();
            }}
            className="rounded-full bg-kofkan-crimson px-4 py-2 text-small font-semibold text-white disabled:opacity-60"
          >
            {loading ? "Importing…" : "Commit import"}
          </button>
        </div>
        {err && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-small text-red-800">{err}</p>}
      </section>

      {result && (
        <section className="mt-4 rounded-xl bg-white p-5 shadow-sm ring-1 ring-black/[0.06]">
          <h2 className="font-serif text-section-title font-semibold">
            3. Result{" "}
            <span className="text-[11px] uppercase tracking-wider text-kofkan-text-muted">
              ({result.mode === "commit" ? "committed" : "dry run"})
            </span>
          </h2>
          <div className="mt-2 grid gap-2 sm:grid-cols-4">
            <Summary label="Total" value={result.total_rows} />
            <Summary label="Created" value={result.created} />
            <Summary label="Updated" value={result.updated} />
            <Summary label="Errors" value={result.errors} tone={result.errors > 0 ? "warn" : "ok"} />
          </div>
          <div className="mt-4 overflow-x-auto rounded-xl border border-kofkan-gray-soft">
            <table className="w-full min-w-[560px] text-left text-small">
              <thead className="border-b border-kofkan-gray-soft text-[11px] font-semibold uppercase tracking-wider text-kofkan-text-muted">
                <tr>
                  <th className="px-3 py-2">Row</th>
                  <th className="px-3 py-2">Slug</th>
                  <th className="px-3 py-2">Action</th>
                  <th className="px-3 py-2">Message</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-kofkan-gray-soft">
                {result.results.map((r) => (
                  <tr key={`${r.row_index}-${r.slug ?? ""}`}>
                    <td className="px-3 py-2 text-[11px] text-kofkan-text-muted">{r.row_index}</td>
                    <td className="px-3 py-2 font-mono text-[11px]">{r.slug ?? "—"}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase ${actionBadgeClass(r.action)}`}
                      >
                        {r.action}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-[11px] text-kofkan-text-muted">
                      {r.message ?? ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

function Summary({
  label,
  value,
  tone = "ok",
}: {
  label: string;
  value: number;
  tone?: "ok" | "warn";
}) {
  return (
    <div className="rounded-lg bg-kofkan-cream/50 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-kofkan-text-muted">
        {label}
      </p>
      <p
        className={`mt-1 font-serif text-xl font-semibold ${
          tone === "warn" ? "text-amber-700" : "text-kofkan-text-primary"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
