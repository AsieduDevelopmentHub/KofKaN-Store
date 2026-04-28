"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ProductCardGrid } from "@/components/product/ProductCardGrid";
import { useCatalog } from "@/context/CatalogContext";
import { ProductGridSkeleton } from "@/components/StorefrontSkeletons";
import {
  filterByPriceAndRating,
  sortProducts,
  type SortKey,
} from "@/lib/search-helpers";
import { PRODUCT_GRID_CLASS } from "@/lib/storefront-layout";

type Props = { slug: string };

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "relevance", label: "Featured" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "rating", label: "Top rated" },
  { value: "name", label: "Name A–Z" },
];

export function CategoryScreen({ slug }: Props) {
  const { products, categories, loading } = useCatalog();
  const [sort, setSort] = useState<SortKey>("relevance");
  const [priceMax, setPriceMax] = useState<number | null>(null);
  const [inStockOnly, setInStockOnly] = useState(false);

  const category = categories.find((c) => c.slug === slug);
  const humanLabel = category?.label ?? slug.replace(/-/g, " ");

  const priceCeiling = useMemo(() => {
    const max = products.reduce((m, p) => Math.max(m, p.price), 0);
    return max > 0 ? max : 5000;
  }, [products]);

  const filtered = useMemo(() => {
    let list = products.filter((p) => p.category === slug);
    list = filterByPriceAndRating(list, {
      max: priceMax ?? undefined,
      inStockOnly,
    });
    return sortProducts(list, sort);
  }, [products, slug, priceMax, inStockOnly, sort]);

  return (
    <div className="bg-kofkan-cream pb-8 dark:bg-zinc-950">
      <div className="kofkan-storefront-max mx-auto px-4 pt-3">
        <nav aria-label="Breadcrumb" className="text-[11px] text-kofkan-text-muted dark:text-zinc-500">
          <ol className="flex items-center gap-1">
            <li>
              <Link href="/" className="hover:text-kofkan-gold">
                Home
              </Link>
            </li>
            <li aria-hidden>›</li>
            <li>
              <Link href="/shop" className="hover:text-kofkan-gold">
                Shop
              </Link>
            </li>
            <li aria-hidden>›</li>
            <li className="truncate text-kofkan-text-primary dark:text-zinc-200" aria-current="page">
              {humanLabel}
            </li>
          </ol>
        </nav>

        <header className="mt-3">
          <h1 className="font-display text-[1.4rem] font-semibold text-kofkan-text-primary dark:text-zinc-100">
            {humanLabel}
          </h1>
          <p className="mt-1 text-small text-kofkan-text-secondary dark:text-zinc-400">
            {filtered.length} product{filtered.length === 1 ? "" : "s"} in this category
          </p>
        </header>

        <div className="mt-4 grid grid-cols-2 gap-3 rounded-[12px] bg-white p-3 ring-1 ring-black/[0.06] dark:bg-zinc-900 md:grid-cols-4 dark:ring-white/10">
          <label className="text-[11px] font-semibold text-kofkan-text-primary dark:text-zinc-200">
            Sort
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="kofkan-select mt-1 w-full py-2 text-small"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-end text-small text-kofkan-text-primary dark:text-zinc-200">
            <span className="flex h-full items-center gap-2">
              <input
                type="checkbox"
                checked={inStockOnly}
                onChange={(e) => setInStockOnly(e.target.checked)}
                className="h-4 w-4 accent-kofkan-gold"
              />
              In stock only
            </span>
          </label>
          <label className="col-span-2 text-[11px] font-semibold text-kofkan-text-primary dark:text-zinc-200 md:col-span-4">
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
              className="mt-1 w-full accent-kofkan-gold"
            />
          </label>
        </div>

        <div className="mt-5">
          {loading && products.length === 0 ? (
            <ProductGridSkeleton />
          ) : filtered.length === 0 ? (
            <div className="rounded-[12px] bg-white p-6 text-center text-small text-kofkan-text-secondary ring-1 ring-black/[0.05] dark:bg-zinc-900 dark:text-zinc-400 dark:ring-white/10">
              <p className="font-semibold text-kofkan-text-primary dark:text-zinc-100">
                Nothing in this category yet.
              </p>
              <Link href="/shop" className="mt-3 inline-block font-semibold text-kofkan-gold">
                Browse all products
              </Link>
            </div>
          ) : (
            <ul className={PRODUCT_GRID_CLASS}>
              {filtered.map((p) => (
                <li key={p.id}>
                  <ProductCardGrid product={p} />
                </li>
              ))}
            </ul>
          )}
        </div>

        {categories.length > 1 && (
          <section className="mt-10" aria-label="Other categories">
            <h2 className="text-[11px] font-semibold uppercase tracking-wider text-kofkan-text-muted dark:text-zinc-500">
              Browse other categories
            </h2>
            <ul className="mt-3 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {categories
                .filter((c) => c.slug !== slug)
                .map((c) => (
                  <li key={c.slug} className="shrink-0">
                    <Link
                      href={`/category/${encodeURIComponent(c.slug)}`}
                      className="kofkan-tap inline-flex rounded-full bg-white px-4 py-2 text-small font-semibold text-kofkan-text-primary ring-1 ring-kofkan-gray-soft dark:bg-zinc-900 dark:text-zinc-100 dark:ring-white/10"
                    >
                      {c.label}
                    </Link>
                  </li>
                ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
