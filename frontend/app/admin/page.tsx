"use client";

import { useCallback, useEffect, useState } from "react";

import { useAppSession } from "@/components/Providers";
import {
  fetchAdminInventory,
  fetchAdminOrders,
  fetchAdminPayments,
  fetchAdminSecuritySettings,
  fetchAdminSummary,
  fetchAdminUsers,
  patchAdminOrderStatus,
  patchAdminPaymentStatus,
  patchAdminProductStock,
  patchAdminUser,
  type AdminInventoryResponse,
  type AdminOrderRow,
  type AdminPaymentRow,
  type AdminSecuritySettings,
  type AdminSummary,
  type AdminUserRow
} from "@/lib/api/admin";
import { listNewsletterSubscriptions, type NewsletterRow } from "@/lib/api/subscriptions";

type TabId = "overview" | "users" | "orders" | "inventory" | "payments" | "newsletter" | "settings";

export default function AdminPage() {
  const { token, user } = useAppSession();
  const [tab, setTab] = useState<TabId>("overview");
  const [error, setError] = useState("");

  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [orders, setOrders] = useState<AdminOrderRow[]>([]);
  const [inventory, setInventory] = useState<AdminInventoryResponse | null>(null);
  const [payments, setPayments] = useState<AdminPaymentRow[]>([]);
  const [newsletter, setNewsletter] = useState<NewsletterRow[]>([]);
  const [settings, setSettings] = useState<AdminSecuritySettings | null>(null);

  const [orderStatusEdits, setOrderStatusEdits] = useState<Record<number, string>>({});
  const [stockEdits, setStockEdits] = useState<Record<number, string>>({});
  const [paymentStatusEdits, setPaymentStatusEdits] = useState<Record<string, string>>({});

  const loadTab = useCallback(async () => {
    if (!token || !user?.is_admin) return;
    setError("");
    try {
      if (tab === "overview") {
        setSummary(await fetchAdminSummary(token));
      } else if (tab === "users") {
        setUsers(await fetchAdminUsers(token));
      } else if (tab === "orders") {
        setOrders(await fetchAdminOrders(token));
      } else if (tab === "inventory") {
        setInventory(await fetchAdminInventory(token));
      } else if (tab === "payments") {
        setPayments(await fetchAdminPayments(token));
      } else if (tab === "newsletter") {
        setNewsletter(await listNewsletterSubscriptions(token));
      } else if (tab === "settings") {
        setSettings(await fetchAdminSecuritySettings(token));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    }
  }, [token, user?.is_admin, tab]);

  useEffect(() => {
    void loadTab();
  }, [loadTab]);

  if (!user?.is_admin) {
    return (
      <main className="kofkan-shell py-16">
        <h1 className="text-2xl font-bold">Admin</h1>
        <p className="mt-2 text-kofkan-muted">Administrator access is required.</p>
      </main>
    );
  }

  const tabs: { id: TabId; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "users", label: "Users" },
    { id: "orders", label: "Orders" },
    { id: "inventory", label: "Inventory" },
    { id: "payments", label: "Payments" },
    { id: "newsletter", label: "Newsletter" },
    { id: "settings", label: "Security" }
  ];

  return (
    <main className="kofkan-shell py-10 pb-24 md:pb-10">
      <h1 className="text-3xl font-bold">Admin</h1>
      <p className="mt-2 text-kofkan-muted">Operations dashboard for KofKaN Store.</p>

      <div className="mt-6 flex flex-wrap gap-2 border-b border-kofkan-border pb-3">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${
              tab === t.id ? "bg-kofkan-black text-kofkan-white" : "bg-kofkan-bg-secondary text-kofkan-charcoal"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

      {tab === "overview" && summary ? (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <article className="rounded-2xl border border-kofkan-border p-5">
            <p className="text-sm text-kofkan-muted">Users</p>
            <p className="mt-1 text-3xl font-bold">{summary.users}</p>
          </article>
          <article className="rounded-2xl border border-kofkan-border p-5">
            <p className="text-sm text-kofkan-muted">Products</p>
            <p className="mt-1 text-3xl font-bold">{summary.products}</p>
          </article>
          <article className="rounded-2xl border border-kofkan-border p-5">
            <p className="text-sm text-kofkan-muted">Open orders</p>
            <p className="mt-1 text-3xl font-bold">{summary.open_orders}</p>
          </article>
          <article className="rounded-2xl border border-kofkan-border p-5">
            <p className="text-sm text-kofkan-muted">Revenue</p>
            <p className="mt-1 text-3xl font-bold">GH₵ {summary.revenue.toFixed(2)}</p>
          </article>
        </div>
      ) : null}

      {tab === "users" ? (
        <div className="mt-8 overflow-x-auto rounded-2xl border border-kofkan-border">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-kofkan-bg-secondary">
              <tr>
                <th className="p-3 font-semibold">ID</th>
                <th className="p-3 font-semibold">Email</th>
                <th className="p-3 font-semibold">Name</th>
                <th className="p-3 font-semibold">Active</th>
                <th className="p-3 font-semibold">Admin</th>
                <th className="p-3 font-semibold">Role</th>
                <th className="p-3 font-semibold">Save</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <UserRow key={u.id} u={u} token={token!} onSaved={() => void loadTab()} />
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {tab === "orders" ? (
        <div className="mt-8 space-y-4">
          {orders.map((o) => (
            <article key={o.id} className="rounded-2xl border border-kofkan-border p-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-semibold">#{o.id}</span>
                <span className="text-sm text-kofkan-muted">User {o.user_id}</span>
                <span className="text-sm">GH₵ {o.total_amount.toFixed(2)}</span>
                <input
                  className="rounded-lg border border-kofkan-border px-2 py-1 text-sm"
                  value={orderStatusEdits[o.id] ?? o.status}
                  onChange={(e) => setOrderStatusEdits((s) => ({ ...s, [o.id]: e.target.value }))}
                />
                <button
                  type="button"
                  className="rounded-lg bg-kofkan-black px-3 py-1.5 text-xs font-semibold text-kofkan-white"
                  onClick={() =>
                    void (async () => {
                      const st = orderStatusEdits[o.id] ?? o.status;
                      await patchAdminOrderStatus(token!, o.id, st);
                      void loadTab();
                    })()
                  }
                >
                  Update
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : null}

      {tab === "inventory" && inventory ? (
        <div className="mt-8 space-y-6">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm">
            <p className="font-semibold text-amber-900">Low stock (below {inventory.threshold})</p>
            <ul className="mt-2 list-inside list-disc text-amber-800">
              {inventory.low_stock.map((p) => (
                <li key={p.id}>
                  {p.name} — {p.stock_quantity} left
                </li>
              ))}
            </ul>
            {inventory.low_stock.length === 0 ? <p className="text-amber-800">All clear.</p> : null}
          </div>
          <div className="overflow-x-auto rounded-2xl border border-kofkan-border">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-kofkan-bg-secondary">
                <tr>
                  <th className="p-3">Product</th>
                  <th className="p-3">SKU</th>
                  <th className="p-3">Stock</th>
                  <th className="p-3">Set</th>
                </tr>
              </thead>
              <tbody>
                {inventory.items.map((p) => (
                  <tr key={p.id} className="border-t border-kofkan-border">
                    <td className="p-3">{p.name}</td>
                    <td className="p-3 text-kofkan-muted">{p.sku}</td>
                    <td className="p-3">{p.stock_quantity}</td>
                    <td className="p-3">
                      <input
                        className="w-20 rounded border border-kofkan-border px-2 py-1"
                        value={stockEdits[p.id ?? 0] ?? String(p.stock_quantity)}
                        onChange={(e) => setStockEdits((s) => ({ ...s, [p.id ?? 0]: e.target.value }))}
                      />
                      <button
                        type="button"
                        className="ml-2 rounded bg-kofkan-black px-2 py-1 text-xs text-white"
                        onClick={() =>
                          void (async () => {
                            const q = Number(stockEdits[p.id ?? 0] ?? p.stock_quantity);
                            if (p.id) await patchAdminProductStock(token!, p.id, q);
                            void loadTab();
                          })()
                        }
                      >
                        Save
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {tab === "payments" ? (
        <div className="mt-8 space-y-3">
          {payments.map((p) => (
            <article key={p.reference} className="rounded-2xl border border-kofkan-border p-4 text-sm">
              <div className="flex flex-wrap gap-2">
                <span className="font-mono font-semibold">{p.reference}</span>
                <span>{p.status}</span>
                <span>
                  {p.currency} {p.amount.toFixed(2)}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <input
                  className="rounded border border-kofkan-border px-2 py-1"
                  value={paymentStatusEdits[p.reference] ?? p.status}
                  onChange={(e) => setPaymentStatusEdits((s) => ({ ...s, [p.reference]: e.target.value }))}
                />
                <button
                  type="button"
                  className="rounded bg-kofkan-black px-3 py-1 text-xs text-white"
                  onClick={() =>
                    void (async () => {
                      const st = paymentStatusEdits[p.reference] ?? p.status;
                      await patchAdminPaymentStatus(token!, p.reference, st);
                      void loadTab();
                    })()
                  }
                >
                  Update
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : null}

      {tab === "newsletter" ? (
        <div className="mt-8 overflow-x-auto rounded-2xl border border-kofkan-border">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-kofkan-bg-secondary">
              <tr>
                <th className="p-3">Email</th>
                <th className="p-3">Subscribed</th>
                <th className="p-3">Since</th>
              </tr>
            </thead>
            <tbody>
              {newsletter.map((n) => (
                <tr key={n.email} className="border-t border-kofkan-border">
                  <td className="p-3">{n.email}</td>
                  <td className="p-3">{n.is_subscribed ? "Yes" : "No"}</td>
                  <td className="p-3 text-kofkan-muted">{new Date(n.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {tab === "settings" && settings ? (
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <article className="rounded-2xl border border-kofkan-border p-5 text-sm">
            <p className="font-semibold">{settings.app_name}</p>
            <p className="text-kofkan-muted">v{settings.app_version}</p>
            <ul className="mt-3 space-y-1 text-kofkan-charcoal">
              <li>HTTPS: {settings.https_enabled ? "on" : "off"}</li>
              <li>Debug: {settings.debug ? "on" : "off"}</li>
              <li>OpenAPI docs: {settings.disable_openapi ? "disabled" : "enabled"}</li>
              <li>CORS credentials: {settings.cors_allow_credentials ? "yes" : "no"}</li>
              <li>Google OAuth configured: {settings.has_google_client_id ? "yes" : "no"}</li>
              <li>Paystack webhook secret: {settings.has_paystack_webhook_secret ? "set" : "missing"}</li>
            </ul>
          </article>
        </div>
      ) : null}
    </main>
  );
}

function UserRow({ u, token, onSaved }: { u: AdminUserRow; token: string; onSaved: () => void }) {
  const [active, setActive] = useState(u.is_active);
  const [isAdmin, setIsAdmin] = useState(u.is_admin);
  const [role, setRole] = useState(u.admin_role);

  return (
    <tr className="border-t border-kofkan-border">
      <td className="p-3">{u.id}</td>
      <td className="p-3">{u.email}</td>
      <td className="p-3">{u.full_name}</td>
      <td className="p-3">
        <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
      </td>
      <td className="p-3">
        <input type="checkbox" checked={isAdmin} onChange={(e) => setIsAdmin(e.target.checked)} />
      </td>
      <td className="p-3">
        <input className="w-28 rounded border border-kofkan-border px-2 py-1 text-xs" value={role} onChange={(e) => setRole(e.target.value)} />
      </td>
      <td className="p-3">
        <button
          type="button"
          className="rounded bg-kofkan-black px-2 py-1 text-xs text-white"
          onClick={() =>
            void (async () => {
              await patchAdminUser(token, u.id, {
                is_active: active,
                is_admin: isAdmin,
                admin_role: role
              });
              onSaved();
            })()
          }
        >
          Save
        </button>
      </td>
    </tr>
  );
}
