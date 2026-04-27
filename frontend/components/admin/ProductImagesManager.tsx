"use client";

import { ChangeEvent, useCallback, useEffect, useRef, useState } from "react";
import {
  adminDeleteProductImage,
  adminFetchProductImages,
  adminFetchVariants,
  adminReorderProductImages,
  adminSetPrimaryImage,
  adminUploadProductImage,
  type AdminProductImage,
  type AdminVariant,
} from "@/lib/api/admin";
import { getBackendOrigin } from "@/lib/api/client";
import { AdminImageGridSkeleton } from "@/components/admin/Skeleton";
import { useDialog } from "@/context/DialogContext";

type Props = {
  accessToken: string;
  productId: number;
  /** Called after primary image changes so callers can refetch the parent product. */
  onPrimaryChange?: () => void;
};

function resolveSrc(url: string, origin: string): string {
  return url.startsWith("http") ? url : `${origin}${url}`;
}

/**
 * Multi-image uploader for a product. Marketplace best practice is 4-8 photos
 * per product, so this grid supports that with:
 *   - click-to-upload / drag-drop picker for multiple files at once
 *   - primary star toggle (syncs the Product.image_url used by list pages)
 *   - reorder via move-up/move-down buttons
 *   - individual delete
 */
export function ProductImagesManager({ accessToken, productId, onPrimaryChange }: Props) {
  const { confirm: confirmDialog } = useDialog();
  const [items, setItems] = useState<AdminProductImage[]>([]);
  const [variants, setVariants] = useState<AdminVariant[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const origin = typeof window !== "undefined" ? getBackendOrigin() : "";

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      // Pull images + variants in parallel so the "variant photos" strip
      // stays in sync with edits from ProductVariantsManager.
      const [imgs, vs] = await Promise.all([
        adminFetchProductImages(accessToken, productId),
        adminFetchVariants(accessToken, { product_id: productId, limit: 100 }).catch(
          () => [] as AdminVariant[]
        ),
      ]);
      setItems(imgs);
      setVariants(vs);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load images");
    } finally {
      setLoading(false);
    }
  }, [accessToken, productId]);

  useEffect(() => {
    void load();
  }, [load]);

  const variantPhotos = variants.filter((v) => !!v.image_url);

  const handleFiles = async (files: FileList | null) => {
    if (!files || !files.length) return;
    setBusy(true);
    setErr(null);
    try {
      const hadAny = items.length > 0;
      for (let i = 0; i < files.length; i += 1) {
        const file = files[i];
        await adminUploadProductImage(accessToken, productId, file, {
          primary: !hadAny && i === 0,
        });
      }
      await load();
      if (!hadAny) onPrimaryChange?.();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const onPickChange = (e: ChangeEvent<HTMLInputElement>) =>
    void handleFiles(e.target.files);

  const onSetPrimary = async (imageId: number) => {
    setBusy(true);
    setErr(null);
    try {
      await adminSetPrimaryImage(accessToken, productId, imageId);
      await load();
      onPrimaryChange?.();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not set primary");
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async (imageId: number) => {
    const ok = await confirmDialog({
      title: "Remove image",
      message: "Remove this image from the product?",
      confirmLabel: "Remove",
      variant: "danger",
    });
    if (!ok) return;
    setBusy(true);
    setErr(null);
    try {
      const wasPrimary = !!items.find((x) => x.id === imageId)?.is_primary;
      await adminDeleteProductImage(accessToken, productId, imageId);
      await load();
      if (wasPrimary) onPrimaryChange?.();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  };

  const onMove = async (imageId: number, dir: -1 | 1) => {
    const idx = items.findIndex((x) => x.id === imageId);
    if (idx < 0) return;
    const target = idx + dir;
    if (target < 0 || target >= items.length) return;
    const next = items.slice();
    const [moved] = next.splice(idx, 1);
    next.splice(target, 0, moved);
    setItems(next);
    setBusy(true);
    setErr(null);
    try {
      await adminReorderProductImages(
        accessToken,
        productId,
        next.map((x) => x.id)
      );
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Reorder failed");
      await load();
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-black/[0.06]">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="font-serif text-section-title font-semibold">Gallery images</h2>
          <p className="text-small text-kofkan-text-secondary">
            Upload several photos so shoppers can inspect the product. The star marks
            the hero image shown on list pages.
          </p>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
          className="rounded-full bg-kofkan-crimson px-4 py-1.5 text-small font-semibold text-white disabled:opacity-60"
        >
          {busy ? "Working…" : "Upload photos"}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          onChange={onPickChange}
        />
      </header>

      {err && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-small text-red-800">{err}</p>}

      {loading ? (
        <AdminImageGridSkeleton count={6} />
      ) : items.length === 0 ? (
        <p className="mt-3 text-small text-kofkan-text-muted">
          No images yet. Upload one or more files above — the first will become the primary.
        </p>
      ) : (
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {items.map((img, idx) => (
            <li
              key={img.id}
              className="relative overflow-hidden rounded-lg border border-kofkan-gray-soft bg-kofkan-cream/40"
            >
              <div className="relative aspect-square w-full bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={resolveSrc(img.image_url, origin)}
                  alt={img.alt_text ?? "Product photo"}
                  className="h-full w-full object-cover"
                />
                {img.is_primary && (
                  <span className="absolute left-1.5 top-1.5 rounded-full bg-kofkan-gold/95 px-2 py-0.5 text-[10px] font-semibold text-white shadow">
                    Primary
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-1 p-1.5">
                <button
                  type="button"
                  disabled={busy || img.is_primary}
                  onClick={() => void onSetPrimary(img.id)}
                  className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-kofkan-text-secondary ring-1 ring-black/[0.1] disabled:opacity-40"
                  title="Make primary"
                >
                  Set primary
                </button>
                <button
                  type="button"
                  disabled={busy || idx === 0}
                  onClick={() => void onMove(img.id, -1)}
                  className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-kofkan-text-secondary ring-1 ring-black/[0.1] disabled:opacity-40"
                  title="Move earlier"
                >
                  ↑
                </button>
                <button
                  type="button"
                  disabled={busy || idx === items.length - 1}
                  onClick={() => void onMove(img.id, 1)}
                  className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-kofkan-text-secondary ring-1 ring-black/[0.1] disabled:opacity-40"
                  title="Move later"
                >
                  ↓
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void onDelete(img.id)}
                  className="ml-auto rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-rose-700 ring-1 ring-rose-200 disabled:opacity-40"
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {variantPhotos.length > 0 && (
        <div className="mt-6 border-t border-kofkan-gray-soft/70 pt-4">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="font-serif text-[0.95rem] font-semibold text-kofkan-text-primary">
              Variant photos
            </h3>
            <p className="text-[11px] text-kofkan-text-muted">
              Managed from the <span className="font-semibold">Variants</span> section below.
            </p>
          </div>
          <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {variantPhotos.map((v) => (
              <li
                key={`variant-${v.id}`}
                className="relative overflow-hidden rounded-lg border border-dashed border-kofkan-gray-soft bg-kofkan-cream/40"
                title={v.name}
              >
                <div className="relative aspect-square w-full bg-white">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={resolveSrc(v.image_url ?? "", origin)}
                    alt={v.name}
                    className="h-full w-full object-cover"
                  />
                  <span className="absolute left-1.5 top-1.5 rounded-full bg-kofkan-crimson/95 px-2 py-0.5 text-[10px] font-semibold text-white shadow">
                    Variant
                  </span>
                </div>
                <p className="truncate px-2 py-1.5 text-[11px] font-semibold text-kofkan-text-secondary">
                  {v.name}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
