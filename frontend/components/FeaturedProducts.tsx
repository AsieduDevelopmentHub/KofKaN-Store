"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useCatalog } from "@/context/CatalogContext";
import { HomeBannerSlideshow } from "@/components/home/HomeBannerSlideshow";
import { HomeProductCarouselCard } from "@/components/home/HomeProductCarouselCard";
import { SkeletonBlock } from "@/components/StorefrontSkeletons";

export function FeaturedProducts() {
  const { products, loading } = useCatalog();
  const featured = useMemo(() => products.slice(0, Math.min(products.length, 8)), [products]);

  if (loading && products.length === 0) {
    return (
      <section
        id="featured"
        className="scroll-mt-20 bg-kofkan-cream py-4 pb-6 dark:bg-zinc-950"
        aria-labelledby="featured-title"
      >
        <HomeBannerSlideshow variant="featured" />
        <div className="mt-3 px-4 md:px-6 lg:px-8">
          <h2
            id="featured-title"
            className="font-serif text-section-title font-semibold text-kofkan-text-primary dark:text-zinc-100"
          >
            Featured
          </h2>
          <div className="mt-3 flex gap-3 overflow-hidden pb-1" aria-hidden>
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="w-[45%] shrink-0 overflow-hidden rounded-[12px] bg-white p-2 ring-1 ring-black/[0.05] dark:bg-zinc-900 dark:ring-white/10"
              >
                <SkeletonBlock className="aspect-square w-full rounded-[10px]" />
                <SkeletonBlock className="mt-2 h-3 w-5/6 rounded" />
                <SkeletonBlock className="mt-1 h-3 w-2/3 rounded" />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      id="featured"
      className="scroll-mt-20 bg-kofkan-cream py-4 pb-6 dark:bg-zinc-950"
      aria-labelledby="featured-title"
    >
      <HomeBannerSlideshow variant="featured" />
      <div className="mb-3 mt-3 flex items-center justify-between px-4 md:px-6 lg:px-8">
        <h2
          id="featured-title"
          className="font-serif text-section-title font-semibold text-kofkan-text-primary dark:text-zinc-100"
        >
          Featured
        </h2>
        <Link
          href="/shop"
          className="text-small font-medium text-kofkan-crimson underline-offset-2 hover:underline"
        >
          See all
        </Link>
      </div>
      <div className="flex gap-3 overflow-x-auto px-4 pb-2 md:px-6 lg:px-8 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {featured.map((p) => (
          <HomeProductCarouselCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  );
}
