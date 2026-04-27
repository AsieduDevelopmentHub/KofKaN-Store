"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useDialog } from "@/context/DialogContext";
import {
  adminCreateCategory,
  adminDeleteCategory,
  adminFetchCategories,
  adminUploadCategoryImage,
  adminUpdateCategory,
  type AdminCategory,
} from "@/lib/api/admin";
import { AdminSearchInput } from "@/components/admin/AdminSearchInput";
import { AdminCategoryListSkeleton } from "@/components/admin/Skeleton";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export default function AdminCategoriesPage() {
  const { accessToken } = useAuth();
  const { confirm: confirmDialog, alert: alertDialog } = useDialog();
  const [rows, setRows] = useState<AdminCategory[]>([]);
  const [name, setName] = useState("");
  const [newImageFile, setNewImageFile] = useState<File | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const derivedSlug = useMemo(() => slugify(name.trim()), [name]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [uploadingImageFor, setUploadingImageFor] = useState<number | null>(null);
  const [query, setQuery] = useState("");

  const visibleRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((c) => `${c.name} ${c.slug}`.toLowerCase().includes(q));
  }, [rows, query]);

  const load = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      setRows(await adminFetchCategories(accessToken));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void load();
  }, [load]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken || creating) return;
    setErr(null);
    setCreating(true);
    try {
      const created = await adminCreateCategory(accessToken, {
        name: name.trim(),
        slug: derivedSlug || slugify(name.trim()),
        is_active: true,
        sort_order: 0,
      });
      if (newImageFile) {
        await adminUploadCategoryImage(accessToken, created.id, newImageFile);
      }
      setName("");
      setNewImageFile(null);
      await load();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("kofkan-catalog-refresh"));
      }
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Create failed");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="w-full min-w-0 max-w-full">
      <h1 className="font-serif text-page-title font-semibold">Categories</h1>
      <p className="text-small text-kofkan-text-secondary">Organize the catalog; slugs power SEO URLs.</p>

      <form
        onSubmit={(e) => void create(e)}
        className="mt-6 flex w-full max-w-xl flex-col flex-wrap gap-3 rounded-xl bg-white p-4 shadow-sm ring-1 ring-black/[0.06] sm:flex-row sm:items-end sm:p-5"
      >
        <label className="block min-w-0 flex-1 text-small font-medium text-kofkan-text-secondary sm:min-w-[140px]">
          Name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-black/[0.08] px-3 py-2 text-body outline-none ring-kofkan-gold focus:ring-2"
            required
          />
        </label>
        <div className="block min-w-0 flex-1 text-small font-medium text-kofkan-text-secondary sm:min-w-[140px]">
          <span className="block">URL slug</span>
          <input
            readOnly
            disabled
            value={derivedSlug || "—"}
            title="Generated from the category name"
            className="mt-1 w-full cursor-not-allowed rounded-lg border border-black/[0.08] bg-kofkan-gray-soft/60 px-3 py-2 font-mono text-small text-kofkan-text-secondary outline-none"
          />
          <p className="mt-1 text-[11px] font-normal text-kofkan-text-muted">Auto-generated from the name.</p>
        </div>
        <label className="block min-w-0 flex-1 text-small font-medium text-kofkan-text-secondary sm:min-w-[180px]">
          Category image (optional)
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setNewImageFile(e.target.files?.[0] ?? null)}
            className="mt-1 block w-full text-[12px] file:mr-3 file:rounded-full file:border-0 file:bg-kofkan-cream file:px-3 file:py-1.5 file:text-[12px] file:font-semibold"
          />
        </label>
        <button
          type="submit"
          disabled={creating}
          className="w-full shrink-0 rounded-full bg-kofkan-crimson px-5 py-2.5 text-small font-semibold text-white disabled:opacity-60 sm:w-auto"
        >
          {creating ? "Adding…" : "Add"}
        </button>
        {err ? (
          <p className="mt-1 w-full basis-full rounded-lg bg-red-50 px-3 py-2 text-small text-red-800" role="alert">
            {err}
          </p>
        ) : null}
      </form>

      <div className="mt-6">
        <AdminSearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search categories by name or slug…"
          hint={query ? `${visibleRows.length} of ${rows.length} shown` : undefined}
        />
      </div>
      {loading ? (
        <AdminCategoryListSkeleton />
      ) : (
        <ul className="mt-4 divide-y divide-kofkan-gray-soft rounded-xl bg-white shadow-sm ring-1 ring-black/[0.06]">
          {visibleRows.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-4">
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{c.name}</p>
                <p className="font-mono text-[11px] text-kofkan-text-muted">{c.slug}</p>
                {c.image_url ? (
                  <p className="mt-1 truncate text-[11px] text-kofkan-text-muted">{c.image_url}</p>
                ) : (
                  <p className="mt-1 text-[11px] text-kofkan-text-muted">No category image set.</p>
                )}
                <div className="mt-2 flex flex-wrap gap-2">
                  <label className="cursor-pointer rounded-full px-3 py-1 text-[11px] font-semibold ring-1 ring-black/[0.1]">
                    {uploadingImageFor === c.id ? "Uploading..." : "Upload image"}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        if (!accessToken) return;
                        const file = e.target.files?.[0];
                        e.currentTarget.value = "";
                        if (!file) return;
                        void (async () => {
                          setUploadingImageFor(c.id);
                          try {
                            await adminUploadCategoryImage(accessToken, c.id, file);
                            await load();
                            if (typeof window !== "undefined") {
                              window.dispatchEvent(new CustomEvent("kofkan-catalog-refresh"));
                            }
                          } catch (ex) {
                            await alertDialog(ex instanceof Error ? ex.message : "Image upload failed", {
                              variant: "error",
                            });
                          } finally {
                            setUploadingImageFor(null);
                          }
                        })();
                      }}
                    />
                  </label>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="rounded-full px-3 py-1 text-[11px] font-semibold ring-1 ring-black/[0.1]"
                  onClick={() => {
                    if (!accessToken) return;
                    void (async () => {
                      try {
                        await adminUpdateCategory(accessToken, c.id, { is_active: !c.is_active });
                        await load();
                        if (typeof window !== "undefined") {
                          window.dispatchEvent(new CustomEvent("kofkan-catalog-refresh"));
                        }
                      } catch (e) {
                        void alertDialog(e instanceof Error ? e.message : "Update failed", { variant: "error" });
                      }
                    })();
                  }}
                >
                  {c.is_active ? "Deactivate" : "Activate"}
                </button>
                <button
                  type="button"
                  className="text-[11px] font-semibold text-red-700 hover:underline"
                  onClick={() => {
                    void (async () => {
                      if (!accessToken) return;
                      const ok = await confirmDialog({
                        title: "Delete category",
                        message: `Delete category "${c.name}"? This cannot be undone.`,
                        confirmLabel: "Delete",
                        variant: "danger",
                      });
                      if (!ok) return;
                      try {
                        await adminDeleteCategory(accessToken, c.id);
                        await load();
                        if (typeof window !== "undefined") {
                          window.dispatchEvent(new CustomEvent("kofkan-catalog-refresh"));
                        }
                      } catch (e) {
                        await alertDialog(e instanceof Error ? e.message : "Delete failed", {
                          variant: "error",
                        });
                      }
                    })();
                  }}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
          {visibleRows.length === 0 && (
            <li className="px-4 py-8 text-center text-small text-kofkan-text-muted">
              {query ? "No categories match your search." : "No categories."}
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
