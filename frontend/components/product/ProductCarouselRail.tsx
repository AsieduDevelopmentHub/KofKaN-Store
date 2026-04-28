"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import type { MockProduct } from "@/lib/mock-data";
import { ProductCardGrid } from "@/components/product/ProductCardGrid";

type Props = {
  title: string;
  products: MockProduct[];
  /** Optional "See all" link. */
  seeAllHref?: string;
  seeAllLabel?: string;
  /** Optional slot shown to the right of the heading (e.g. "Clear"). */
  rightSlot?: ReactNode;
  /** Hide when empty. Defaults to true. */
  hideWhenEmpty?: boolean;
};

/**
 * Horizontal rail of product cards. Used by "Recently viewed", "Related
 * products", and the home "For you" sections.
 */
export function ProductCarouselRail({
  title,
  products,
  seeAllHref,
  seeAllLabel = "See all",
  rightSlot,
  hideWhenEmpty = true,
}: Props) {
  if (hideWhenEmpty && products.length === 0) return null;

  return (
    <section className="mt-8" aria-label={title}>
      <div className="flex items-end justify-between gap-3 px-4 md:px-6 lg:px-8">
        <h2 className="font-display text-[1.05rem] font-semibold text-kofkan-text-primary dark:text-zinc-100">
          {title}
        </h2>
        {rightSlot ??
          (seeAllHref ? (
            <Link href={seeAllHref} className="shrink-0 text-small font-semibold text-kofkan-gold">
              {seeAllLabel}
            </Link>
          ) : null)}
      </div>
      <div className="mt-3 flex gap-3 overflow-x-auto px-4 pb-1 md:px-6 lg:px-8 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden snap-x snap-mandatory">
        {products.map((p) => (
          <div key={p.id} className="w-[46%] max-w-[200px] shrink-0 snap-start">
            <ProductCardGrid product={p} sizesHint="(max-width:430px) 46vw, 200px" />
          </div>
        ))}
      </div>
    </section>
  );
}
