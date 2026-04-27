import Image from "next/image";
import Link from "next/link";
import { ProductWishlistButton } from "@/components/product/ProductWishlistButton";
import { ProductPriceLabel } from "@/components/ProductPriceLabel";
import { StarRating } from "@/components/StarRating";
import type { MockProduct } from "@/lib/mock-data";
import { cleanImageUrl } from "@/lib/clean-image-url";


type Props = { product: MockProduct };

export function HomeProductCarouselCard({ product: p }: Props) {
  return (
    <article className="relative w-[158px] shrink-0 overflow-hidden rounded-[10px] border border-black/[0.04] bg-white shadow-[0_1px_8px_rgba(59,42,37,0.05)] ring-1 ring-black/[0.04] transition-shadow hover:shadow-md dark:border-white/10 dark:bg-zinc-900 dark:ring-white/10 md:w-[180px] lg:w-[200px]">
      <ProductWishlistButton productId={p.id} className="absolute right-1.5 top-1.5 z-[1]" />
      <Link
        href={`/product/${p.id}`}
        className="kofkan-tap block transition-shadow hover:shadow-[inset_0_0_0_9999px_rgba(0,0,0,0.02)]"
      >
        <div className="relative aspect-square w-full">
          <Image src={cleanImageUrl(p.image)} alt="" fill className="object-cover" sizes="(max-width:768px) 158px, (max-width:1024px) 180px, 200px" unoptimized/>
        </div>
        <div className="space-y-1.5 p-2.5">
          <p className="line-clamp-2 text-small font-medium leading-snug text-kofkan-text-primary dark:text-zinc-100">
            {p.name}
          </p>
          <ProductPriceLabel product={p} size="sm" />
          <StarRating value={p.rating} className="text-[11px]" />
        </div>
      </Link>
    </article>
  );
}
