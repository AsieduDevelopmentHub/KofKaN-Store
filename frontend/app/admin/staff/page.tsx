"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useDialog } from "@/context/DialogContext";
import {
  adminFetchUsers,
  adminSetStaffRole,
  adminPromoteUser,
  adminRevokeAdmin,
  adminFetchPermissionCatalog,
  adminCreateStaffAccount,
  type AdminUser,
} from "@/lib/api/admin";
import type { AdminPermissionDef } from "@/lib/admin-permissions";
import {
  ADMIN_PERMISSION_PRESETS,
  STATIC_ADMIN_PERMISSION_CATALOG,
  parsePermissionString,
} from "@/lib/admin-permissions";
import { AdminSearchInput } from "@/components/admin/AdminSearchInput";
import { AdminStaffListSkeleton } from "@/components/admin/Skeleton";

function PermissionsCheckboxes({
  catalog,
  selected,
  disabled,
  onToggle,
}: {
  catalog: AdminPermissionDef[];
  selected: Set<string>;
  disabled: boolean;
  onToggle: (key: string) => void;
}) {
  return (
    <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {catalog.map(({ key, label }) => (
        <li key={key}>
          <label
            className={`flex cursor-pointer items-start gap-2 rounded-lg border border-kofkan-gray-soft px-2.5 py-2 text-[11px] dark:border-white/15 ${
              disabled ? "opacity-50" : ""
            }`}
          >
            <input
              type="checkbox"
              className="mt-0.5 accent-kofkan-gold"
              checked={selected.has(key)}
              disabled={disabled}
              onChange={() => onToggle(key)}
            />
            <span className="leading-snug text-kofkan-text-primary dark:text-zinc-100">{label}</span>
          </label>
        </li>
      ))}
    </ul>
  );
}

export default function AdminStaffPage() {
  const { accessToken, user: me } = useAuth();
  const { confirm: confirmDialog, alert: alertDialog } = useDialog();
  const [rows, setRows] = useState<AdminUser[]>([]);
  const [allUsers, setAllUsers] = useState<AdminUser[]>([]);
  const [candidateId, setCandidateId] = useState<number | "">("");
  const [candidateRole, setCandidateRole] = useState<"admin" | "staff">("staff");
  const [err, setErr] = useState<string | null>(null);
  const [candidateQuery, setCandidateQuery] = useState("");
  const [staffQuery, setStaffQuery] = useState("");
  const [ready, setReady] = useState(false);
  const [catalog, setCatalog] = useState<AdminPermissionDef[]>(STATIC_ADMIN_PERMISSION_CATALOG);

  const [permDrafts, setPermDrafts] = useState<Record<number, string[]>>({});

  const [createUsername, setCreateUsername] = useState("");
  const [createName, setCreateName] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createRole, setCreateRole] = useState<"super_admin" | "admin" | "staff">("staff");
  const [createPerms, setCreatePerms] = useState<string[]>(ADMIN_PERMISSION_PRESETS.staff);
  const [createBusy, setCreateBusy] = useState(false);
  const [promoteBusy, setPromoteBusy] = useState(false);
  const [savingPermFor, setSavingPermFor] = useState<number | null>(null);

  const isSuperViewer = (me?.admin_role ?? "").toLowerCase() === "super_admin";

  const load = useCallback(async () => {
    if (!accessToken) return;
    try {
      const data = await adminFetchUsers(accessToken, { limit: 100 });
      setAllUsers(data);
      setRows(data.filter((u) => u.is_admin));
      try {
        const defs = await adminFetchPermissionCatalog(accessToken);
        if (defs?.length) setCatalog(defs);
      } catch {
        /* keep static catalog */
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setReady(true);
    }
  }, [accessToken]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setPermDrafts((prev) => {
      const next = { ...prev };
      for (const u of rows) {
        if (next[u.id] === undefined) {
          next[u.id] = parsePermissionString(u.admin_permissions);
        }
      }
      return next;
    });
  }, [rows]);

  useEffect(() => {
    if (createRole === "super_admin") return;
    setCreatePerms([...ADMIN_PERMISSION_PRESETS[createRole]]);
  }, [createRole]);

  const candidates = useMemo(() => {
    const base = allUsers.filter((u) => !u.is_admin);
    const q = candidateQuery.trim().toLowerCase();
    if (!q) return base;
    return base.filter((u) =>
      `${u.name ?? ""} ${u.username ?? ""} ${u.email ?? ""}`.toLowerCase().includes(q)
    );
  }, [allUsers, candidateQuery]);

  const visibleStaff = useMemo(() => {
    const q = staffQuery.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((u) =>
      `${u.name ?? ""} ${u.username ?? ""} ${u.email ?? ""} ${u.admin_role ?? ""} ${
        u.admin_permissions ?? ""
      }`
        .toLowerCase()
        .includes(q)
    );
  }, [rows, staffQuery]);

  const toggleDraft = useCallback((userId: number, key: string) => {
    setPermDrafts((prev) => {
      const cur = prev[userId] ?? [];
      const set = new Set(cur);
      if (set.has(key)) set.delete(key);
      else set.add(key);
      return { ...prev, [userId]: Array.from(set) };
    });
  }, []);

  const toggleCreatePerm = useCallback((key: string) => {
    setCreatePerms((cur) => {
      const set = new Set(cur);
      if (set.has(key)) set.delete(key);
      else set.add(key);
      return Array.from(set);
    });
  }, []);

  return (
    <div className="w-full min-w-0 max-w-full">
      <h1 className="font-serif text-page-title font-semibold">Staff & admins</h1>
      <p className="text-small text-kofkan-text-secondary">
        Create accounts for staff, assign roles, and fine-tune permission scopes.
      </p>

      <div className="mt-4 rounded-xl bg-white p-4 shadow-sm ring-1 ring-black/[0.06] sm:p-5">
        <p className="text-small font-semibold text-kofkan-text-primary">Create staff / admin account</p>
        <p className="mt-1 text-[11px] text-kofkan-text-muted">Share the initial password securely.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="block text-[11px] font-semibold text-kofkan-text-primary">
            Username
            <input
              value={createUsername}
              onChange={(e) => setCreateUsername(e.target.value)}
              autoComplete="off"
              className="mt-1 w-full rounded-[10px] border border-kofkan-gray-soft bg-white px-3 py-2 text-small outline-none ring-1 ring-transparent focus:ring-kofkan-gold/40 dark:border-white/15 dark:bg-zinc-900 dark:text-zinc-100"
              placeholder="jdoe"
            />
          </label>
          <label className="block text-[11px] font-semibold text-kofkan-text-primary">
            Full name
            <input
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              className="mt-1 w-full rounded-[10px] border border-kofkan-gray-soft bg-white px-3 py-2 text-small outline-none ring-1 ring-transparent focus:ring-kofkan-gold/40 dark:border-white/15 dark:bg-zinc-900 dark:text-zinc-100"
              placeholder="Jane Doe"
            />
          </label>
          <label className="block text-[11px] font-semibold text-kofkan-text-primary">
            Email
            <input
              type="email"
              value={createEmail}
              onChange={(e) => setCreateEmail(e.target.value)}
              autoComplete="off"
              className="mt-1 w-full rounded-[10px] border border-kofkan-gray-soft bg-white px-3 py-2 text-small outline-none ring-1 ring-transparent focus:ring-kofkan-gold/40 dark:border-white/15 dark:bg-zinc-900 dark:text-zinc-100"
              placeholder="jane@company.com"
            />
          </label>
          <label className="block text-[11px] font-semibold text-kofkan-text-primary sm:col-span-2 lg:col-span-1">
            Initial password (min 8 characters)
            <input
              type="password"
              value={createPassword}
              onChange={(e) => setCreatePassword(e.target.value)}
              autoComplete="new-password"
              className="mt-1 w-full rounded-[10px] border border-kofkan-gray-soft bg-white px-3 py-2 text-small outline-none ring-1 ring-transparent focus:ring-kofkan-gold/40 dark:border-white/15 dark:bg-zinc-900 dark:text-zinc-100"
            />
          </label>
          <label className="block text-[11px] font-semibold text-kofkan-text-primary">
            Role
            <select
              value={createRole}
              onChange={(e) =>
                setCreateRole(e.target.value as "super_admin" | "admin" | "staff")
              }
              className="kofkan-select mt-1 w-full py-2 text-small"
            >
              <option value="staff">Staff</option>
              <option value="admin">Admin</option>
              {isSuperViewer ? <option value="super_admin">Super admin</option> : null}
            </select>
          </label>
        </div>
        {createRole !== "super_admin" ? (
          <div className="mt-4">
            <p className="text-[11px] font-semibold text-kofkan-text-primary">Permissions for this account</p>
            <div className="mt-2">
              <PermissionsCheckboxes
                catalog={catalog}
                selected={new Set(createPerms)}
                disabled={createBusy}
                onToggle={toggleCreatePerm}
              />
            </div>
          </div>
        ) : (
          <p className="mt-3 text-[11px] text-kofkan-text-muted">
            Super admins have full access to the admin panel.
          </p>
        )}
        <button
          type="button"
          disabled={createBusy || !accessToken}
          className="mt-4 rounded-full bg-kofkan-gold px-5 py-2.5 text-small font-semibold text-white disabled:opacity-50"
          onClick={() => {
            if (!accessToken) return;
            if (createPassword.length < 8) {
              void alertDialog("Password must be at least 8 characters.", { variant: "error" });
              return;
            }
            void (async () => {
              setCreateBusy(true);
              try {
                await adminCreateStaffAccount(accessToken, {
                  username: createUsername.trim(),
                  name: createName.trim(),
                  email: createEmail.trim(),
                  password: createPassword,
                  role: createRole,
                  permissions: createRole === "super_admin" ? [] : createPerms,
                });
                setCreateUsername("");
                setCreateName("");
                setCreateEmail("");
                setCreatePassword("");
                setCreateRole("staff");
                setCreatePerms([...ADMIN_PERMISSION_PRESETS.staff]);
                await load();
              } catch (e) {
                await alertDialog(e instanceof Error ? e.message : "Failed to create account", {
                  variant: "error",
                });
              } finally {
                setCreateBusy(false);
              }
            })();
          }}
        >
          {createBusy ? "Creating…" : "Create account"}
        </button>
      </div>

      <div className="mt-6">
        <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-black/[0.06] sm:p-5">
          <p className="text-small font-semibold text-kofkan-text-primary">Promote existing customer account</p>
          <div className="mt-3">
            <AdminSearchInput
              value={candidateQuery}
              onChange={setCandidateQuery}
              placeholder="Filter users by name, username, or email…"
              hint={
                candidateQuery
                  ? `${candidates.length} user${candidates.length === 1 ? "" : "s"} match`
                  : undefined
              }
              maxWidthClassName="sm:max-w-md"
            />
          </div>
          <div className="mt-3 flex w-full min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <select
              value={candidateId}
              onChange={(e) => setCandidateId(e.target.value ? Number(e.target.value) : "")}
              className="kofkan-select w-full min-w-0 text-small sm:min-w-[200px] sm:flex-1 sm:max-w-md"
            >
              <option value="">Select user…</option>
              {candidates.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name || "No name"} (@{u.username})
                </option>
              ))}
            </select>
            <select
              value={candidateRole}
              onChange={(e) => setCandidateRole(e.target.value as "admin" | "staff")}
              className="kofkan-select w-full text-small sm:w-auto sm:shrink-0"
            >
              <option value="staff">staff</option>
              <option value="admin">admin</option>
            </select>
            <button
              type="button"
              disabled={promoteBusy || !accessToken}
              className="w-full rounded-full bg-kofkan-crimson px-4 py-2 text-small font-semibold text-white disabled:opacity-60 sm:w-auto sm:shrink-0"
              onClick={() => {
                if (!accessToken || !candidateId || promoteBusy) return;
                const pick = candidates.find((u) => u.id === candidateId);
                if (!pick) return;
                void (async () => {
                  setPromoteBusy(true);
                  try {
                    await adminPromoteUser(accessToken, pick.id);
                    await adminSetStaffRole(accessToken, pick.id, {
                      role: candidateRole,
                      permissions: ADMIN_PERMISSION_PRESETS[candidateRole],
                    });
                    setCandidateId("");
                    await load();
                  } catch (e) {
                    void alertDialog(e instanceof Error ? e.message : "Failed", { variant: "error" });
                  } finally {
                    setPromoteBusy(false);
                  }
                })();
              }}
            >
              {promoteBusy ? "Adding…" : "Add to staff"}
            </button>
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="font-serif text-section-title font-semibold text-kofkan-text-primary">
          Current staff & admins
        </h2>
        <AdminSearchInput
          value={staffQuery}
          onChange={setStaffQuery}
          placeholder="Search staff…"
          hint={staffQuery ? `${visibleStaff.length} of ${rows.length} shown` : undefined}
        />
      </div>
      {err ? (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-small text-red-800" role="alert">
          {err}
        </p>
      ) : null}
      {!ready && !err ? (
        <AdminStaffListSkeleton />
      ) : (
        <ul className="mt-3 divide-y divide-kofkan-gray-soft rounded-xl bg-white shadow-sm ring-1 ring-black/[0.06]">
          {visibleStaff.map((u) => {
            const role = (u.admin_role ?? "admin").toLowerCase() as "super_admin" | "admin" | "staff";
            const isSuperRow = role === "super_admin";
            const draft = permDrafts[u.id] ?? parsePermissionString(u.admin_permissions);

            return (
              <li key={u.id} className="px-4 py-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="break-words font-semibold">{u.name}</p>
                    <p className="break-words text-[11px] text-kofkan-text-muted">
                      @{u.username} · {u.email ?? "no email"} · role: {u.admin_role ?? "admin"}
                    </p>
                  </div>
                  <div className="flex w-full min-w-0 flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
                    {u.id !== me?.id ? (
                      <>
                        {isSuperRow && !isSuperViewer ? (
                          <span className="rounded-full bg-kofkan-gray-soft px-3 py-1.5 text-[11px] font-semibold text-kofkan-text-primary dark:bg-zinc-800">
                            super_admin
                          </span>
                        ) : (
                          <select
                            className="kofkan-select min-w-0 max-w-full flex-1 py-1.5 pl-2 pr-8 text-[11px] sm:max-w-[10rem]"
                            value={role}
                            onChange={(e) => {
                              if (!accessToken) return;
                              const next = e.target.value as "super_admin" | "admin" | "staff";
                              if (next === "super_admin" && !isSuperViewer) {
                                void alertDialog("Only a super admin can assign the super_admin role.", {
                                  variant: "error",
                                });
                                return;
                              }
                              void (async () => {
                                try {
                                  const perms =
                                    next === "super_admin" ? [] : ADMIN_PERMISSION_PRESETS[next];
                                  await adminSetStaffRole(accessToken, u.id, {
                                    role: next,
                                    permissions: perms,
                                  });
                                  setPermDrafts((prev) => ({ ...prev, [u.id]: perms }));
                                  await load();
                                } catch (er) {
                                  await alertDialog(er instanceof Error ? er.message : "Failed", {
                                    variant: "error",
                                  });
                                }
                              })();
                            }}
                          >
                            {isSuperViewer ? <option value="super_admin">super_admin</option> : null}
                            <option value="admin">admin</option>
                            <option value="staff">staff</option>
                          </select>
                        )}
                        {isSuperRow && !isSuperViewer ? null : (
                          <button
                            type="button"
                            className="text-[11px] font-semibold text-red-700 hover:underline"
                            onClick={() => {
                              void (async () => {
                                if (!accessToken) return;
                                const ok = await confirmDialog({
                                  title: "Revoke admin access",
                                  message: `Revoke admin from @${u.username}?`,
                                  confirmLabel: "Revoke",
                                  variant: "danger",
                                });
                                if (!ok) return;
                                try {
                                  await adminRevokeAdmin(accessToken, u.id);
                                  await load();
                                } catch (e) {
                                  await alertDialog(e instanceof Error ? e.message : "Failed", {
                                    variant: "error",
                                  });
                                }
                              })();
                            }}
                          >
                            Revoke admin
                          </button>
                        )}
                      </>
                    ) : (
                      <span className="text-[11px] text-kofkan-text-muted">You</span>
                    )}
                  </div>
                </div>

                <div className="mt-3">
                  {isSuperRow ? (
                    <p className="text-[11px] text-kofkan-text-muted">Full access (super admin).</p>
                  ) : (
                    <>
                      <p className="text-[11px] font-semibold text-kofkan-text-primary">Permissions</p>
                      <div className="mt-2">
                        <PermissionsCheckboxes
                          catalog={catalog}
                          selected={new Set(draft)}
                          disabled={u.id === me?.id || !accessToken}
                          onToggle={(key) => toggleDraft(u.id, key)}
                        />
                      </div>
                      {u.id !== me?.id ? (
                        <button
                          type="button"
                          disabled={savingPermFor === u.id || !accessToken}
                          className="mt-3 rounded-full border border-kofkan-gold/50 bg-kofkan-cream/60 px-4 py-1.5 text-[11px] font-semibold text-kofkan-text-primary disabled:opacity-60 dark:bg-zinc-800"
                          onClick={() => {
                            if (!accessToken) return;
                            void (async () => {
                              setSavingPermFor(u.id);
                              try {
                                await adminSetStaffRole(accessToken, u.id, {
                                  role,
                                  permissions: permDrafts[u.id] ?? draft,
                                });
                                await load();
                              } catch (er) {
                                await alertDialog(er instanceof Error ? er.message : "Failed", {
                                  variant: "error",
                                });
                              } finally {
                                setSavingPermFor(null);
                              }
                            })();
                          }}
                        >
                          {savingPermFor === u.id ? "Saving…" : "Save permissions"}
                        </button>
                      ) : null}
                    </>
                  )}
                </div>
              </li>
            );
          })}
          {visibleStaff.length === 0 && !err && ready && (
            <li className="px-4 py-8 text-center text-small text-kofkan-text-muted">
              {staffQuery ? "No staff match your search." : "No admins."}
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
