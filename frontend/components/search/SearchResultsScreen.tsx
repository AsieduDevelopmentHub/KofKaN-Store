"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { SearchAutocomplete } from "@/components/search/SearchAutocomplete";
import { ProductCardGrid } from "@/components/product/ProductCardGrid";
import { useCatalog } from "@/context/CatalogContext";
import { pingProductSearchAnalytics } from "@/lib/api/products";
import {
  TRENDING_SEARCHES,
  addRecentSearch,
  filterByPriceAndRating,
  matchesQuery,
  sortProducts,
  readRecentSearches,
  type SortKey,
} from "@/lib/search-helpers";
import { PRODUCT_GRID_CLASS } from "@/lib/storefront-layout";
import { useProducts } from "@/lib/hooks/useProducts";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "relevance", label: "Best match" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "rating", label: "Top rated" },
  { value: "name", label: "Name A–Z" },
];

export function SearchResultsScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const q = (searchParams.get("q") ?? "").trim();
  const [sort, setSort] = useState<SortKey>("relevance");
  const [minRating, setMinRating] = useState<number>(0);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [priceMax, setPriceMax] = useState<number | null>(null);

  const { categories, loading: catalogLoading } = useCatalog();
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => {
    setRecent(readRecentSearches());
    if (q) addRecentSearch(q);
  }, [q]);

  useEffect(() => {
    if (!q) return;
    pingProductSearchAnalytics(q);
  }, [q]);

  const { data: searchData, isLoading: searchLoading } = useProducts({
    search: q,
    sortBy: sort === "relevance" ? "created_at" : (sort.split("-")[0] as any),
    sortOrder: sort.endsWith("-asc") ? "asc" : "desc",
    minRating: minRating > 0 ? minRating : undefined,
    maxPrice: priceMax ?? undefined,
  });

  const products = searchData?.items || [];
  const loading = searchLoading || catalogLoading;
  const filtered = products; 

  const priceCeiling = 10000; // Simplified for now or could be calculated from catalog

  const suggestedCategories = useMemo(() => {
    if (!q) return [];
    const lower = q.toLowerCase();
    return categories.filter((c) => c.label.toLowerCase().includes(lower));
  }, [q, categories]);

  return (
    <div className="bg-kofkan-cream pb-8 dark:bg-zinc-950">
      <div className="kofkan-storefront-max mx-auto px-4 pt-3">
        <SearchAutocomplete autoFocus={!q} />

        {!q ? (
          <div className="mt-6 space-y-5">
            {recent.length > 0 && (
              <section>
                <h2 className="text-[10px] font-semibold uppercase tracking-wider text-kofkan-text-muted dark:text-zinc-500">
                  Recent searches
                </h2>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {recent.map((r) => (
                    <li key={`rs-${r}`}>
                      <Link
                        href={`/search?q=${encodeURIComponent(r)}`}
                        className="rounded-full bg-kofkan-gray-soft px-3 py-1 text-small font-semibold text-kofkan-text-secondary dark:bg-zinc-800 dark:text-zinc-300"
                      >
                        {r}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            <section>
              <h2 className="text-[10px] font-semibold uppercase tracking-wider text-kofkan-text-muted dark:text-zinc-500">
                Trending
              </h2>
              <ul className="mt-2 flex flex-wrap gap-2">
                {TRENDING_SEARCHES.map((r) => (
                  <li key={`ts-${r}`}>
                    <Link
                      href={`/search?q=${encodeURIComponent(r)}`}
                      className="rounded-full bg-kofkan-cream px-3 py-1 text-small font-semibold text-kofkan-text-primary ring-1 ring-kofkan-gray-soft dark:bg-zinc-800 dark:text-zinc-200 dark:ring-white/10"
                    >
                      {r}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
            {categories.length > 0 && (
              <section>
                <h2 className="text-[10px] font-semibold uppercase tracking-wider text-kofkan-text-muted dark:text-zinc-500">
                  Browse categories
                </h2>
                <ul className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                  {categories.map((c) => (
                    <li key={c.slug}>
                      <Link
                        href={`/category/${encodeURIComponent(c.slug)}`}
                        className="kofkan-tap block rounded-[10px] bg-white px-3 py-3 text-small font-semibold text-kofkan-text-primary ring-1 ring-black/[0.05] dark:bg-zinc-900 dark:text-zinc-100 dark:ring-white/10"
                      >
                        {c.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        ) : (
          <>
            <div className="mt-4 flex items-center justify-between gap-3">
              <p className="text-small text-kofkan-text-secondary dark:text-zinc-400">
                {catalogLoading && products.length === 0
                  ? "Searching…"
                  : `${filtered.length} ${filtered.length === 1 ? "result" : "results"} for `}
                {catalogLoading && products.length === 0 ? null : (
                  <span className="font-semibold text-kofkan-text-primary dark:text-zinc-100">“{q}”</span>
                )}
              </p>
              <button
                type="button"
                onClick={() => router.push("/search")}
                className="text-small font-semibold text-kofkan-gold"
              >
                Clear
              </button>
            </div>

            {suggestedCategories.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {suggestedCategories.map((c) => (
                  <Link
                    key={c.slug}
                    href={`/category/${encodeURIComponent(c.slug)}`}
                    className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-kofkan-text-primary ring-1 ring-kofkan-gold/50 dark:bg-zinc-900 dark:text-zinc-100"
                  >
                    See all in {c.label}
                  </Link>
                ))}
              </div>
            )}

            <div className="mt-4 space-y-3 rounded-[12px] bg-white p-3 ring-1 ring-black/[0.06] dark:bg-zinc-900 dark:ring-white/10">
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <label className="text-[11px] font-semibold text-kofkan-text-primary dark:text-zinc-200">
                  Sort
                  <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value as SortKey)}
                    className="mt-1 w-full rounded-[10px] border-0 bg-kofkan-cream py-2 px-2 text-small text-kofkan-text-primary dark:bg-zinc-800 dark:text-zinc-100"
                  >
                    {SORT_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-[11px] font-semibold text-kofkan-text-primary dark:text-zinc-200">
                  Min rating
                  <select
                    value={minRating}
                    onChange={(e) => setMinRating(Number(e.target.value))}
                    className="mt-1 w-full rounded-[10px] border-0 bg-kofkan-cream py-2 px-2 text-small text-kofkan-text-primary dark:bg-zinc-800 dark:text-zinc-100"
                  >
                    <option value={0}>Any</option>
                    <option value={3}>3★ & up</option>
                    <option value={4}>4★ & up</option>
                    <option value={4.5}>4.5★ & up</option>
                  </select>
                </label>
              </div>
              <label className="flex flex-col text-[11px] font-semibold text-kofkan-text-primary dark:text-zinc-200">
                Max price GHS {priceMax ?? priceCeiling}
                <input
                  type="range"
                  min={0}
                  max={Math.ceil(priceCeiling)}
                  step={10}
                  value={priceMax ?? Math.ceil(priceCeiling)}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setPriceMax(v >= priceCeiling ? null : v);
                  }}
                  className="mt-2 w-full accent-kofkan-gold"
                />
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-small text-kofkan-text-primary dark:text-zinc-200">
                <input
                  type="checkbox"
                  checked={inStockOnly}
                  onChange={(e) => setInStockOnly(e.target.checked)}
                  className="h-4 w-4 accent-kofkan-gold"
                />
                In stock only
              </label>
            </div>

            <div className="mt-5">
              {filtered.length === 0 ? (
                <div className="rounded-[12px] bg-white p-6 text-center text-small text-kofkan-text-secondary ring-1 ring-black/[0.05] dark:bg-zinc-900 dark:text-zinc-400 dark:ring-white/10">
                  <p className="font-semibold text-kofkan-text-primary dark:text-zinc-100">
                    No products matched “{q}”.
                  </p>
                  <p className="mt-2 leading-relaxed">Try a different term, remove filters, or browse categories.</p>
                  <Link href="/shop" className="mt-4 inline-block font-semibold text-kofkan-gold">
                    Browse all products
                  </Link>
                </div>
              ) : (
                <ul className={PRODUCT_GRID_CLASS} aria-label="Search results">
                  {filtered.map((p) => (
                    <li key={p.id}>
                      <ProductCardGrid product={p} />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
