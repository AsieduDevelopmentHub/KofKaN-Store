"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useDialog } from "@/context/DialogContext";
import {
  adminActivateUser,
  adminDeactivateUser,
  adminFetchUsers,
  type AdminUser,
} from "@/lib/api/admin";
import { AdminSearchInput } from "@/components/admin/AdminSearchInput";
import { AdminTableSkeleton } from "@/components/admin/Skeleton";

export default function AdminCustomersPage() {
  const { accessToken, user: me } = useAuth();
  const { confirm: confirmDialog, alert: alertDialog } = useDialog();
  const [rows, setRows] = useState<AdminUser[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const data = await adminFetchUsers(accessToken, { limit: 100 });
      setRows(data.filter((u) => !u.is_admin));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void load();
  }, [load]);

  const visibleRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((u) => {
      const hay = `${u.name ?? ""} ${u.username ?? ""} ${u.email ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [rows, query]);

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-page-title font-semibold">Customers</h1>
          <p className="text-small text-kofkan-text-secondary">Registered shoppers (excludes admin accounts).</p>
        </div>
        <AdminSearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search name, username, or email…"
          hint={query ? `${visibleRows.length} of ${rows.length} shown` : undefined}
        />
      </div>
      {err && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-small text-red-800">{err}</p>}
      {loading ? (
        <div className="mt-6">
          <AdminTableSkeleton minWidthClass="min-w-[560px]" columns={4} />
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="mt-6 hidden lg:block overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-black/[0.06]">
            <table className="w-full text-left text-small">
            <thead className="border-b border-black/[0.06] text-[11px] font-semibold uppercase tracking-wider text-kofkan-text-muted">
              <tr>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Joined</th>
                <th className="px-4 py-3 text-right">Account</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-kofkan-gray-soft">
              {visibleRows.map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-3">
                    <p className="font-semibold">{u.name}</p>
                    <p className="text-[11px] text-kofkan-text-muted">@{u.username}</p>
                  </td>
                  <td className="px-4 py-3 text-kofkan-text-muted">{u.email ?? "—"}</td>
                  <td className="px-4 py-3 text-[11px] text-kofkan-text-muted">
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {u.id === me?.id ? (
                      <span className="text-[11px] text-kofkan-text-muted">You</span>
                    ) : u.is_active ? (
                      <button
                        type="button"
                        className="text-[11px] font-semibold text-red-700 hover:underline"
                        onClick={() => {
                          void (async () => {
                            if (!accessToken) return;
                            const ok = await confirmDialog({
                              title: "Deactivate account",
                              message: `Deactivate ${u.username}? They will not be able to sign in.`,
                              confirmLabel: "Deactivate",
                              variant: "danger",
                            });
                            if (!ok) return;
                            try {
                              await adminDeactivateUser(accessToken, u.id);
                              await load();
                            } catch (e) {
                              await alertDialog(e instanceof Error ? e.message : "Failed", { variant: "error" });
                            }
                          })();
                        }}
                      >
                        Deactivate
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="text-[11px] font-semibold text-emerald-700 hover:underline"
                        onClick={() => {
                          if (!accessToken) return;
                          void (async () => {
                            try {
                              await adminActivateUser(accessToken, u.id);
                              await load();
                            } catch (e) {
                              await alertDialog(e instanceof Error ? e.message : "Failed", { variant: "error" });
                            }
                          })();
                        }}
                      >
                        Activate
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
            {visibleRows.length === 0 && (
              <p className="px-4 py-8 text-center text-small text-kofkan-text-muted">
                {query ? "No customers match your search." : "No customers."}
              </p>
            )}
          </div>

          {/* Mobile Card View */}
          <div className="mt-6 lg:hidden space-y-3">
            {visibleRows.length > 0 ? (
              visibleRows.map((u) => (
                <div key={u.id} className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-black/[0.06]">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-kofkan-text-primary">{u.name}</p>
                      <p className="text-[12px] text-kofkan-text-muted">@{u.username}</p>
                      <p className="text-[12px] text-kofkan-text-muted mt-1">{u.email ?? "—"}</p>
                      <p className="text-[11px] text-kofkan-text-muted mt-1">
                        Joined: {new Date(u.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    {u.id === me?.id ? (
                      <span className="text-[12px] text-kofkan-text-muted font-semibold">You (Current)</span>
                    ) : u.is_active ? (
                      <button
                        type="button"
                        className="text-[12px] font-semibold text-red-700 hover:underline"
                        onClick={() => {
                          void (async () => {
                            if (!accessToken) return;
                            const ok = await confirmDialog({
                              title: "Deactivate account",
                              message: `Deactivate ${u.username}? They will not be able to sign in.`,
                              confirmLabel: "Deactivate",
                              variant: "danger",
                            });
                            if (!ok) return;
                            try {
                              await adminDeactivateUser(accessToken, u.id);
                              await load();
                            } catch (e) {
                              await alertDialog(e instanceof Error ? e.message : "Failed", { variant: "error" });
                            }
                          })();
                        }}
                      >
                        Deactivate
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="text-[12px] font-semibold text-emerald-700 hover:underline"
                        onClick={() => {
                          if (!accessToken) return;
                          void (async () => {
                            try {
                              await adminActivateUser(accessToken, u.id);
                              await load();
                            } catch (e) {
                              await alertDialog(e instanceof Error ? e.message : "Failed", { variant: "error" });
                            }
                          })();
                        }}
                      >
                        Activate
                      </button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-small text-kofkan-text-muted py-8">
                {query ? "No customers match your search." : "No customers."}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
