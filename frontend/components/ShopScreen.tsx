"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useCatalog } from "@/context/CatalogContext";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { FaBag } from "@/components/FaIcons";
import { ProductWishlistButton } from "@/components/product/ProductWishlistButton";
import { ProductPriceLabel } from "@/components/ProductPriceLabel";
import { StarRating } from "@/components/StarRating";
import { cleanImageUrl } from "@/lib/clean-image-url";

import {
  ProductGridSkeleton,
  ProductListSkeleton,
  SkeletonBlock,
} from "@/components/StorefrontSkeletons";
import { ProductCardGrid } from "@/components/product/ProductCardGrid";
import { PRODUCT_GRID_CLASS } from "@/lib/storefront-layout";

const SHOP_VIEW_STORAGE_KEY = "kofkan-shop-view-mode";

type ViewMode = "list" | "grid";
type SortKey = "default" | "price-asc" | "price-desc" | "name" | "random";

function ViewToggle({
  value,
  onChange,
}: {
  value: ViewMode;
  onChange: (v: ViewMode) => void;
}) {
  return (
    <div
      className="flex shrink-0 rounded-[10px] bg-white p-0.5 ring-1 ring-kofkan-gray-soft dark:bg-zinc-800 dark:ring-white/10"
      role="group"
      aria-label="Product layout"
    >
      <button
        type="button"
        aria-pressed={value === "list"}
        onClick={() => onChange("list")}
        className={`kofkan-tap rounded-[8px] px-2.5 py-2 ${
          value === "list"
            ? "bg-kofkan-gold text-white shadow-sm"
            : "text-kofkan-text-secondary dark:text-zinc-400"
        }`}
        title="List view"
      >
        <span className="sr-only">List view</span>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="mx-auto" aria-hidden>
          <path
            d="M4 6h16M4 12h16M4 18h10"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
          />
        </svg>
      </button>
      <button
        type="button"
        aria-pressed={value === "grid"}
        onClick={() => onChange("grid")}
        className={`kofkan-tap rounded-[8px] px-2.5 py-2 ${
          value === "grid"
            ? "bg-kofkan-gold text-white shadow-sm"
            : "text-kofkan-text-secondary dark:text-zinc-400"
        }`}
        title="Grid view"
      >
        <span className="sr-only">Grid view</span>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="mx-auto" aria-hidden>
          <rect x="4" y="4" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
          <rect x="13" y="4" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
          <rect x="4" y="13" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
          <rect x="13" y="13" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </button>
    </div>
  );
}

export function ShopScreen() {
  const searchParams = useSearchParams();
  const catParam = searchParams.get("cat");
  const { products, categories, source, loading: catalogLoading } = useCatalog();
  const { addProduct } = useCart();
  const { wishErr, clearWishErr } = useWishlist();

  const [view, setViewState] = useState<ViewMode>("grid");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(SHOP_VIEW_STORAGE_KEY);
      if (stored === "list" || stored === "grid") setViewState(stored);
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  const setView = useCallback((v: ViewMode) => {
    setViewState(v);
    try {
      localStorage.setItem(SHOP_VIEW_STORAGE_KEY, v);
    } catch {
      /* ignore */
    }
  }, []);

  const tabKeys = useMemo(
    () => [{ key: "all", label: "All" }, ...categories.map((c) => ({ key: c.slug, label: c.label }))],
    [categories]
  );

  const [tab, setTab] = useState<string>("all");

  useEffect(() => {
    const c = catParam?.trim();
    if (!c || c === "bestsellers") {
      setTab("all");
      return;
    }
    if (tabKeys.some((t) => t.key === c)) {
      setTab(c);
      return;
    }
    setTab("all");
  }, [catParam, tabKeys]);

  const [query, setQuery] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("default");
  const [inStockOnly, setInStockOnly] = useState(false);

  const filtered = useMemo(() => {
    let list = products;
    if (tab !== "all") list = list.filter((p) => p.category === tab);
    const q = query.trim().toLowerCase();
    if (q) list = list.filter((p) => p.name.toLowerCase().includes(q));
    if (inStockOnly) list = list.filter((p) => p.in_stock === undefined || p.in_stock > 0);
    const next = [...list];
    if (sortKey === "price-asc") next.sort((a, b) => a.price - b.price);
    else if (sortKey === "price-desc") next.sort((a, b) => b.price - a.price);
    else if (sortKey === "name") next.sort((a, b) => a.name.localeCompare(b.name));
    else if (sortKey === "random") {
      for (let i = next.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [next[i], next[j]] = [next[j], next[i]];
      }
    }
    return next;
  }, [tab, query, products, inStockOnly, sortKey]);

  function addToCartClick(e: React.MouseEvent, id: string) {
    e.preventDefault();
    e.stopPropagation();
    addProduct(id);
  }

  const effectiveView = hydrated ? view : "grid";

  if (catalogLoading && products.length === 0) {
    return (
      <div className="bg-kofkan-cream px-4 pb-6 pt-3 dark:bg-zinc-950" aria-hidden>
        <div className="flex gap-2">
          <SkeletonBlock className="h-12 flex-1 rounded-[10px]" />
          <SkeletonBlock className="h-12 w-24 rounded-[10px]" />
          <SkeletonBlock className="h-12 w-20 rounded-[10px]" />
        </div>
        <div className="mt-4 flex gap-2 overflow-hidden">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-10 w-24 shrink-0 rounded-full" />
          ))}
        </div>
        {effectiveView === "list" ? <ProductListSkeleton /> : <ProductGridSkeleton count={8} />}
      </div>
    );
  }

  return (
    <div className="bg-kofkan-cream pb-12 dark:bg-zinc-950">
      <div className="bg-kofkan-gold/5 py-8 mb-4 border-b border-kofkan-gray-soft/50 dark:bg-white/[0.02] dark:border-white/5">
        <div className="kofkan-storefront-max mx-auto px-4">
          <h1 className="font-display text-[1.6rem] font-semibold text-kofkan-text-primary dark:text-zinc-100">
            {tab === "all" ? "Discover Products" : tabKeys.find(t => t.key === tab)?.label}
          </h1>
          <p className="mt-1 text-small text-kofkan-text-secondary dark:text-zinc-400">
             Premium selection curated for you
          </p>
        </div>
      </div>

      <div className="kofkan-storefront-max mx-auto px-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-kofkan-text-muted">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.5" />
              <path d="M16 16l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </span>
          <input
            type="search"
            placeholder="Search..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-[10px] border-0 bg-kofkan-gray-soft py-3 pl-10 pr-3 text-body text-kofkan-text-primary outline-none ring-1 ring-transparent placeholder:text-kofkan-text-muted focus:ring-2 focus:ring-kofkan-gold/40 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500"
            aria-label="Search products"
          />
        </div>
        <ViewToggle value={effectiveView} onChange={setView} />
        <button
          type="button"
          className="kofkan-tap shrink-0 rounded-[10px] bg-white px-4 py-3 text-small font-semibold text-kofkan-text-primary ring-1 ring-kofkan-gray-soft dark:bg-zinc-800 dark:text-zinc-100 dark:ring-white/10"
          onClick={() => setFilterOpen((v) => !v)}
        >
          Filter
        </button>
      </div>

      {filterOpen && (
        <div className="mt-3 space-y-3 rounded-[10px] bg-white p-3 text-small ring-1 ring-black/[0.04] dark:bg-zinc-900 dark:ring-white/10">
          <p className="text-kofkan-text-secondary dark:text-zinc-400">
            {source === "api"
              ? "Sort and stock filters apply to the live catalog."
              : "Demo catalog: stock filter applies when products include stock from the API."}
          </p>
          <div>
            <label htmlFor="shop-sort" className="text-[11px] font-semibold text-kofkan-text-primary dark:text-zinc-200">
              Sort by
            </label>
            <select
              id="shop-sort"
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              className="kofkan-select mt-1 w-full text-body text-kofkan-text-primary"
            >
              <option value="default">Featured / default</option>
              <option value="price-asc">Price: low to high</option>
              <option value="price-desc">Price: high to low</option>
              <option value="name">Name A–Z</option>
              <option value="random">Discover (Random)</option>
            </select>
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-body text-kofkan-text-primary dark:text-zinc-200">
            <input
              type="checkbox"
              checked={inStockOnly}
              onChange={(e) => setInStockOnly(e.target.checked)}
              className="h-4 w-4 accent-kofkan-gold"
            />
            In stock only
          </label>
        </div>
      )}
      {wishErr && (
        <button
          type="button"
          className="mt-2 w-full rounded-[10px] bg-red-50 px-3 py-2 text-left text-small text-red-800 ring-1 ring-red-100 dark:bg-red-950/40 dark:text-red-100"
          onClick={clearWishErr}
        >
          {wishErr}
        </button>
      )}

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {tabKeys.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              className={`kofkan-tap shrink-0 rounded-full px-5 py-2.5 text-small font-semibold transition-colors ${
                active
                  ? "bg-kofkan-gold text-white shadow-sm ring-1 ring-kofkan-gold-hover"
                  : "bg-kofkan-gray-soft text-kofkan-text-secondary dark:bg-zinc-800 dark:text-zinc-300"
              }`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {effectiveView === "list" ? (
        <ul className="mt-5 space-y-4" aria-label="Products">
          {filtered.map((p) => (
            <li
              key={p.id}
              className="flex min-h-[168px] overflow-hidden rounded-[10px] bg-white shadow-[0_2px_14px_rgba(59,42,37,0.06)] ring-1 ring-black/[0.05] dark:bg-zinc-900 dark:ring-white/10"
            >
              <Link
                href={`/product/${p.id}`}
                className="kofkan-tap flex min-h-[168px] min-w-0 flex-1"
              >
                <div className="relative w-[40%] min-h-[168px] shrink-0 sm:w-[38%]">
                  <Image
                    src={cleanImageUrl(p.image)}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="(max-width:430px) 40vw, 180px"
                    unoptimized
                  />
                </div>
                <div className="flex min-w-0 flex-1 flex-col justify-center gap-2 px-3 py-3 sm:px-4">
                  <p className="font-sans text-[0.9375rem] font-semibold leading-snug text-kofkan-text-primary dark:text-zinc-100">
                    {p.name}
                  </p>
                  <StarRating value={p.rating} />
                  <ProductPriceLabel product={p} size="sm" />
                </div>
              </Link>
              <div className="flex w-[3.25rem] shrink-0 flex-col items-center justify-between gap-2 border-l border-kofkan-gray-soft py-3 pl-2 pr-2 dark:border-white/10 sm:w-14 sm:pr-3">
                <ProductWishlistButton
                  productId={p.id}
                  size="md"
                  className="!bg-transparent !shadow-none !ring-0 dark:!bg-transparent"
                />
                <button
                  type="button"
                  className="kofkan-tap-bounce flex h-10 w-10 items-center justify-center rounded-full text-kofkan-crimson"
                  aria-label={`Add ${p.name} to cart`}
                  onClick={(e) => addToCartClick(e, p.id)}
                >
                  <FaBag className="!h-[1.125rem] !w-[1.125rem]" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <ul className={`mt-5 ${PRODUCT_GRID_CLASS}`} aria-label="Products">
          {filtered.map((p) => (
            <li key={p.id}>
              <ProductCardGrid product={p} />
            </li>
          ))}
        </ul>
      )}
      </div>
    </div>
  );
}
