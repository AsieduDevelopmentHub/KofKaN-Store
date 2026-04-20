"use client";

import { useEffect, useState } from "react";

import { useAppSession } from "@/components/Providers";
import { fetchAdminSummary, type AdminSummary } from "@/lib/api/admin";

export default function AdminPage() {
  const { token, user } = useAppSession();
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      if (!token || !user?.is_admin) {
        setSummary(null);
        return;
      }
      try {
        setSummary(await fetchAdminSummary(token));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load admin summary");
      }
    };
    void load();
  }, [token, user]);

  if (!user?.is_admin) {
    return (
      <main className="kofkan-shell py-10">
        <h1 className="text-3xl font-bold">Admin</h1>
        <p className="mt-2 text-kofkan-muted">Admin access required.</p>
      </main>
    );
  }

  return (
    <main className="kofkan-shell py-10">
      <h1 className="text-3xl font-bold">Admin Dashboard</h1>
      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
      {summary ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <article className="rounded-xl border border-kofkan-border p-4"><p className="text-sm text-kofkan-muted">Users</p><p className="text-2xl font-bold">{summary.users}</p></article>
          <article className="rounded-xl border border-kofkan-border p-4"><p className="text-sm text-kofkan-muted">Products</p><p className="text-2xl font-bold">{summary.products}</p></article>
          <article className="rounded-xl border border-kofkan-border p-4"><p className="text-sm text-kofkan-muted">Open Orders</p><p className="text-2xl font-bold">{summary.open_orders}</p></article>
          <article className="rounded-xl border border-kofkan-border p-4"><p className="text-sm text-kofkan-muted">Revenue</p><p className="text-2xl font-bold">GH₵ {summary.revenue.toFixed(2)}</p></article>
        </div>
      ) : null}
    </main>
  );
}
