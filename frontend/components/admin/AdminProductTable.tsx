"use client";

import { useRouter } from "next/navigation";
import { type AdminProduct } from "@/lib/api/admin";
import { formatGhs } from "@/lib/mock-data";

interface AdminProductTableProps {
  products: AdminProduct[];
  isLoading?: boolean;
  query?: string;
  onDelete?: (productId: number) => void;
  onConfirm?: (title: string, message: string, variant?: "default" | "danger") => Promise<boolean>;
  onAlert?: (message: string, options?: { variant?: "default" | "error" }) => Promise<void>;
  accessToken?: string;
  origin: string;
}

export function AdminProductTable({
  products,
  isLoading = false,
  query = "",
  onDelete,
  onConfirm,
  onAlert,
  accessToken,
  origin,
}: AdminProductTableProps) {
  const router = useRouter();

  if (isLoading) {
    return <div className="mt-4 animate-pulse rounded-lg bg-gray-200 h-40" />;
  }

  if (products.length === 0) {
    return (
      <p className="mt-8 text-center text-small text-kofkan-text-muted">
        {query ? "No products match your search." : "No products yet."}
      </p>
    );
  }

  return (
    <>
      {/* Desktop Table View */}
      <div className="mt-4 hidden lg:block overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-black/[0.06]">
        <table className="w-full text-left text-small">
          <thead className="border-b border-black/[0.06] text-[11px] font-semibold uppercase tracking-wider text-kofkan-text-muted">
            <tr>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Stock</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-kofkan-gray-soft">
            {products.map((p) => {
              const img = p.image_url
                ? p.image_url.startsWith("http")
                  ? p.image_url
                  : `${origin}${p.image_url}`
                : null;
              return (
                <tr
                  key={p.id}
                  className="cursor-pointer hover:bg-kofkan-cream/80"
                  onClick={() => router.push(`/system/products/${p.id}`)}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-kofkan-gray-soft">
                        {img ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={img} alt="" className="h-full w-full object-cover" />
                        ) : null}
                      </div>
                      <div>
                        <span className="font-semibold text-kofkan-crimson">{p.name}</span>
                        <p className="text-[11px] text-kofkan-text-muted">{p.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">{formatGhs(p.price)}</td>
                  <td className="px-4 py-3">{p.in_stock}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        p.is_active ? "bg-emerald-50 text-emerald-800" : "bg-neutral-100 text-neutral-600"
                      }`}
                    >
                      {p.is_active ? "Live" : "Hidden"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      className="text-[11px] font-semibold text-red-700 hover:underline"
                      onClick={(event) => {
                        event.stopPropagation();
                        void (async () => {
                          if (!accessToken || !onConfirm || !onDelete || !onAlert) return;
                          const ok = await onConfirm(
                            "Delete product",
                            `Delete "${p.name}"? This cannot be undone.`,
                            "danger"
                          );
                          if (!ok) return;
                          try {
                            onDelete(p.id);
                          } catch (e) {
                            await onAlert(e instanceof Error ? e.message : "Delete failed", {
                              variant: "error",
                            });
                          }
                        })();
                      }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="mt-4 lg:hidden space-y-3">
        {products.map((p) => {
          const img = p.image_url
            ? p.image_url.startsWith("http")
              ? p.image_url
              : `${origin}${p.image_url}`
            : null;
          return (
            <div
              key={p.id}
              className="cursor-pointer rounded-lg bg-white p-4 shadow-sm ring-1 ring-black/[0.06] hover:shadow-md transition-shadow"
              onClick={() => router.push(`/system/products/${p.id}`)}
            >
              <div className="flex items-start gap-3">
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-kofkan-gray-soft">
                  {img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={img} alt="" className="h-full w-full object-cover" />
                  ) : null}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-kofkan-crimson truncate">{p.name}</p>
                  <p className="text-[12px] text-kofkan-text-muted truncate">{p.slug}</p>
                  <div className="mt-2 flex items-center gap-3 flex-wrap">
                    <span className="text-sm font-semibold text-kofkan-text-primary">{formatGhs(p.price)}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        p.is_active ? "bg-emerald-50 text-emerald-800" : "bg-neutral-100 text-neutral-600"
                      }`}
                    >
                      {p.is_active ? "Live" : "Hidden"}
                    </span>
                    <span className="text-[12px] text-kofkan-text-muted">Stock: {p.in_stock}</span>
                  </div>
                </div>
              </div>
              <div className="mt-3 flex gap-2 justify-end">
                <button
                  type="button"
                  className="text-[12px] font-semibold text-red-700 hover:underline"
                  onClick={(event) => {
                    event.stopPropagation();
                    void (async () => {
                      if (!accessToken || !onConfirm || !onDelete || !onAlert) return;
                      const ok = await onConfirm(
                        "Delete product",
                        `Delete "${p.name}"? This cannot be undone.`,
                        "danger"
                      );
                      if (!ok) return;
                      try {
                        onDelete(p.id);
                      } catch (e) {
                        await onAlert(e instanceof Error ? e.message : "Delete failed", {
                          variant: "error",
                        });
                      }
                    })();
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
