"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ProductCardGrid } from "@/components/product/ProductCardGrid";
import { useAuth } from "@/context/AuthContext";
import { useCatalog } from "@/context/CatalogContext";
import { useWishlist } from "@/context/WishlistContext";
import { PRODUCT_GRID_CLASS } from "@/lib/storefront-layout";

export function WishlistScreen() {
  const { loading: authLoading, user } = useAuth();
  const { products, loading: catalogLoading } = useCatalog();
  const { effectiveWishIds, wishErr, clearWishErr } = useWishlist();

  const saved = useMemo(() => {
    const ids = Array.from(effectiveWishIds);
    return ids
      .map((id) => products.find((p) => p.id === id))
      .filter((p): p is (typeof products)[0] => !!p);
  }, [products, effectiveWishIds]);

  return (
    <div className="kofkan-storefront-max mx-auto bg-kofkan-cream px-4 pb-8 pt-4 dark:bg-zinc-950">
      {wishErr && (
        <button
          type="button"
          onClick={clearWishErr}
          className="mb-3 w-full rounded-[10px] bg-red-50 px-3 py-2 text-left text-small text-red-800 ring-1 ring-red-100 dark:bg-red-950/40 dark:text-red-100"
        >
          {wishErr}
        </button>
      )}

      <header className="mb-4">
        <h1 className="font-serif text-[1.4rem] font-semibold text-kofkan-text-primary dark:text-zinc-100">
          Your wishlist
        </h1>
        <p className="mt-1 text-small text-kofkan-text-secondary dark:text-zinc-400">
          {user
            ? "Saved across your devices."
            : "Sign in to sync your wishlist across devices."}
        </p>
      </header>

      {(authLoading || catalogLoading) && saved.length === 0 ? (
        <p className="py-8 text-center text-small text-kofkan-text-secondary dark:text-zinc-400">Loading…</p>
      ) : saved.length === 0 ? (
        <div className="rounded-[12px] bg-white p-6 text-center ring-1 ring-black/[0.06] dark:bg-zinc-900 dark:ring-white/10">
          <p className="font-semibold text-kofkan-text-primary dark:text-zinc-100">No saved items yet.</p>
          <p className="mt-1 text-small text-kofkan-text-secondary dark:text-zinc-400">
            Tap the heart on any product to save it here.
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Link
              href="/shop"
              className="rounded-[10px] bg-kofkan-gold px-4 py-2.5 text-small font-semibold text-white"
            >
              Browse products
            </Link>
            {!user && (
              <Link
                href="/account"
                className="rounded-[10px] border border-kofkan-gray-soft bg-white px-4 py-2.5 text-small font-semibold text-kofkan-text-primary dark:border-white/15 dark:bg-zinc-900 dark:text-zinc-100"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      ) : (
        <ul className={PRODUCT_GRID_CLASS} aria-label="Saved products">
          {saved.map((p) => (
            <li key={p.id}>
              <ProductCardGrid product={p} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
