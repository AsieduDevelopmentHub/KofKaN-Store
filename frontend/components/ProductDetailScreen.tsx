"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { FaBag, FaCart } from "@/components/FaIcons";
import { ProductCarouselRail } from "@/components/product/ProductCarouselRail";
import { ProductPriceLabel } from "@/components/ProductPriceLabel";
import { ProductReviewsSection } from "@/components/product/ProductReviewsSection";
import { ProductVariantsDisplay } from "@/components/product/ProductVariantsDisplay";
import { ProductWishlistButton } from "@/components/product/ProductWishlistButton";
import { StarRating } from "@/components/StarRating";
import { useCart } from "@/context/CartContext";
import { useCatalog } from "@/context/CatalogContext";
import { useRecentlyViewedProducts, trackProductView } from "@/hooks/useRecentlyViewed";
import { getBackendOrigin } from "@/lib/api/client";
import { cleanImageUrl } from "@/lib/clean-image-url";

import {
  fetchProductImages,
  fetchProductVariants,
  type ProductImagePublic,
  type ProductVariantPublic,
} from "@/lib/api/product-variants";
import type { MockProduct } from "@/lib/mock-data";
import { variantValueSummary, variantDisplayCompact } from "@/lib/variant-display";

type Props = { product: MockProduct };

function resolveImageSrc(url: string): string {
  if (!url) return url;
  if (url.startsWith("http") || url.startsWith("data:")) return url;
  const origin = getBackendOrigin();
  return origin ? `${origin}${url}` : url;
}

const RELATED_CAP = 10;

function relatedProductsFor(
  current: MockProduct,
  catalog: MockProduct[]
): { items: MockProduct[]; sameCategoryCount: number } {
  const others = catalog.filter((x) => x.id !== current.id);
  const sameCategory = others.filter((x) => x.category === current.category);
  const rest = others.filter((x) => x.category !== current.category);
  const items = [...sameCategory, ...rest].slice(0, RELATED_CAP);
  return { items, sameCategoryCount: sameCategory.length };
}

function isSizeOnlyVariantSet(variants: ProductVariantPublic[]): boolean {
  const keys = new Set<string>();
  for (const v of variants) {
    const attrs = (v.attributes ?? {}) as Record<string, unknown>;
    for (const key of Object.keys(attrs)) {
      const k = key.trim().toLowerCase();
      if (k) keys.add(k);
    }
  }
  if (keys.size !== 1) return false;
  const only = [...keys][0];
  return only === "size" || only === "sizes" || only === "size_name";
}

function RelatedProductCard({
  item,
  onAdd,
}: {
  item: MockProduct;
  onAdd: (productId: string) => void;
}) {
  const [imgLoaded, setImgLoaded] = useState(false);
  return (
    <article className="relative w-[46%] max-w-[200px] shrink-0 snap-start overflow-hidden rounded-[10px] bg-white shadow-[0_2px_12px_rgba(59,42,37,0.06)] ring-1 ring-black/[0.05] dark:bg-zinc-900 dark:ring-white/10">
      <ProductWishlistButton productId={item.id} className="absolute right-1.5 top-1.5 z-[1]" />
      <Link href={`/product/${item.id}`} className="kofkan-tap block">
        <div className="relative aspect-square w-full bg-kofkan-gray-soft dark:bg-zinc-800">
          {!imgLoaded && <div aria-hidden className="h-full w-full animate-pulse bg-kofkan-gray-soft dark:bg-zinc-800" />}
          <Image
            src={cleanImageUrl(item.image, { width: 400, format: "webp" })}
            alt=""
            fill
            className={`object-cover ${imgLoaded ? "opacity-100" : "opacity-0"}`}
            sizes="(max-width:430px) 46vw, 200px"
            onLoad={() => setImgLoaded(true)}
            unoptimized
          />
        </div>
        <div className="space-y-1 p-2.5 pb-10">
          <p className="line-clamp-2 text-[0.8125rem] font-semibold leading-snug text-kofkan-text-primary dark:text-zinc-100">
            {item.name}
          </p>
          <ProductPriceLabel product={item} size="sm" />
          <StarRating value={item.rating} className="text-[11px]" />
        </div>
      </Link>
      <button
        type="button"
        className="kofkan-tap-bounce absolute bottom-2 right-2 flex h-9 w-9 items-center justify-center rounded-full bg-kofkan-crimson text-white shadow-md"
        aria-label={`Add ${item.name} to cart`}
        onClick={() => onAdd(item.id)}
      >
        <FaBag className="!h-[1.125rem] !w-[1.125rem] text-white" />
      </button>
    </article>
  );
}

export function ProductDetailScreen({ product: p }: Props) {
  const router = useRouter();
  const { addProduct } = useCart();
  const { products } = useCatalog();
  const recentlyViewed = useRecentlyViewedProducts(p.id);
  const { items: related, sameCategoryCount } = useMemo(
    () => relatedProductsFor(p, products),
    [p, products]
  );

  const numericId = Number.parseInt(p.id, 10);
  const hasNumericId = Number.isFinite(numericId);

  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null);
  const [gallery, setGallery] = useState<ProductImagePublic[]>([]);
  const [variants, setVariants] = useState<ProductVariantPublic[]>([]);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [activeImage, setActiveImage] = useState<string>(p.image);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [showFloatingAdd, setShowFloatingAdd] = useState(false);
  const addToCartAnchorRef = useRef<HTMLButtonElement>(null);

  const selectedVariant = useMemo(
    () => variants.find((v) => v.id === selectedVariantId) ?? null,
    [variants, selectedVariantId]
  );

  // Swipe logic for hero image
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const minSwipeDistance = 50;

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  useEffect(() => {
    trackProductView(p.id);
  }, [p.id]);

  // Keep the hero image in sync when the route changes to a different product.
  useEffect(() => {
    setActiveImage(p.image);
    setSelectedVariantId(null);
  }, [p.id, p.image]);

  // Whenever the selected variant changes, swap in its image if one exists,
  // otherwise snap back to the base product photo. Tracked as an effect (not
  // inside the state setters) so clearing the variant from ANY source —
  // thumbnail click, variant-picker toggle, route change — always restores
  // the default hero.
  useEffect(() => {
    if (selectedVariant?.image_url) {
      setActiveImage(resolveImageSrc(selectedVariant.image_url));
    } else {
      setActiveImage(p.image);
    }
  }, [selectedVariant, p.image]);

  useEffect(() => {
    if (!hasNumericId) return;
    let cancelled = false;
    setMediaLoading(true);
    fetchProductImages(numericId)
      .then((rows) => {
        if (cancelled) return;
        setGallery(rows);
      })
      .catch(() => {
        if (cancelled) return;
        setGallery([]);
      });
    fetchProductVariants(numericId)
      .then((rows) => {
        if (cancelled) return;
        setVariants(rows);
        if (rows.length > 0 && isSizeOnlyVariantSet(rows)) {
          const fallback = rows.find((v) => v.in_stock > 0) ?? rows[0];
          setSelectedVariantId(fallback?.id ?? null);
        } else {
          setSelectedVariantId(null);
        }
      })
      .catch(() => {
        if (cancelled) return;
        setVariants([]);
        setSelectedVariantId(null);
      })
      .finally(() => {
        if (!cancelled) setMediaLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [hasNumericId, numericId]);

  useEffect(() => {
    if (!lightboxOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxOpen]);

  // Stable handler for the variant picker so toggling a size/colour chip only
  // flows through `selectedVariantId`; the effect above handles the image.
  const onSelectedIdChange = useCallback((id: number | null) => {
    setSelectedVariantId(id);
  }, []);

  const effectivePrice = p.price + (selectedVariant?.price_delta ?? 0);
  const effectiveDescription =
    selectedVariant?.description?.trim() || p.description;
  // Variants carry their own stock; when nothing is picked, fall back to product-level stock.
  const effectiveStock = selectedVariant
    ? selectedVariant.in_stock
    : p.in_stock ?? null;

  // A synthetic product snapshot used to render <ProductPriceLabel> with the
  // variant-adjusted price while keeping the SAME font, size, and colour as the
  // base render path. When a variant is selected we drop `compareAtPrice` because
  // variant deltas invalidate the discount comparison.
  const priceSnapshot: MockProduct = useMemo(() => {
    if (!selectedVariant) return p;
    return {
      ...p,
      price: effectivePrice,
      compareAtPrice: undefined,
    };
  }, [p, selectedVariant, effectivePrice]);
  const hasStockInfo = typeof effectiveStock === "number";
  const isOutOfStock = hasStockInfo && (effectiveStock ?? 0) <= 0;
  const isLowStock =
    hasStockInfo && !isOutOfStock && (effectiveStock ?? 0) <= 5;

  const addDisabled = isOutOfStock;
  const addLabel = isOutOfStock
    ? "Out of stock"
    : "Add to cart";

  const displayTitle = selectedVariant?.name ?? p.name;

  const thumbnails = useMemo(() => {
    const list: {
      key: string;
      src: string;
      label?: string | null;
      variantId?: number;
    }[] = [];
    list.push({ key: "hero", src: p.image, label: "Primary" });
    for (const img of gallery) {
      const src = resolveImageSrc(img.image_url);
      if (!list.some((x) => x.src === src)) {
        list.push({ key: `g-${img.id}`, src, label: img.alt_text });
      }
    }
    // Variant-specific photos appear in the same strip so shoppers can
    // eyeball every colour/size option without opening the variants panel.
    for (const v of variants) {
      if (!v.image_url) continue;
      const src = resolveImageSrc(v.image_url);
      if (!list.some((x) => x.src === src)) {
        list.push({
          key: `v-${v.id}`,
          src,
          label: variantValueSummary(v),
          variantId: v.id,
        });
      }
    }
    return list;
  }, [gallery, variants, p.image]);

  // Thumbnail click rules:
  //   - variant tile: select that variant (drives price/stock/description).
  //   - primary "hero" tile OR any plain gallery tile: clear the variant
  //     so the base product data is restored in the UI (otherwise a stale
  //     variant keeps driving the price/stock long after the user taps back
  //     to the default photo).
  const onThumbnailPick = useCallback(
    (t: (typeof thumbnails)[number]) => {
      if (t.variantId != null) {
        setSelectedVariantId(t.variantId);
      } else {
        setSelectedVariantId(null);
        setActiveImage(t.src);
      }
    },
    []
  );

  const handleTouchEnd = useCallback(() => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    if (isLeftSwipe || isRightSwipe) {
      const currentIndex = thumbnails.findIndex((t) => t.src === activeImage);
      if (currentIndex === -1) return;

      if (isLeftSwipe) {
        // Next image
        const nextIndex = (currentIndex + 1) % thumbnails.length;
        onThumbnailPick(thumbnails[nextIndex]);
      } else {
        // Prev image
        const prevIndex = (currentIndex - 1 + thumbnails.length) % thumbnails.length;
        onThumbnailPick(thumbnails[prevIndex]);
      }
    }
  }, [touchStart, touchEnd, activeImage, thumbnails, onThumbnailPick]);

  // The "add to cart" action must carry the variant context so the server
  // books the right SKU and the cart page shows "Colour / Size · +GHS X".
  const handleAddToCart = useCallback(
    (qty = 1) => {
      if (addDisabled) return;
      if (selectedVariant) {
        addProduct(p.id, qty, {
          variantId: selectedVariant.id,
          variantLabel: variantDisplayCompact(selectedVariant),
          variantImage: selectedVariant.image_url ?? null,
          priceDelta: selectedVariant.price_delta ?? 0,
        });
      } else {
        addProduct(p.id, qty);
      }
    },
    [addProduct, addDisabled, p.id, selectedVariant]
  );

  const handleBuyNow = useCallback(() => {
    if (addDisabled) return;
    if (variants.length > 0 && !selectedVariant) return;

    handleAddToCart();
    router.push("/checkout");
  }, [addDisabled, variants.length, selectedVariant, handleAddToCart, router]);

  /** Floating add-to-cart when the main CTA scrolls off-screen (sits above bottom nav like WhatsApp). */
  useLayoutEffect(() => {
    const el = addToCartAnchorRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        setShowFloatingAdd(!entry.isIntersecting);
      },
      { root: null, threshold: 0.08, rootMargin: "0px 0px -8px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [p.id, selectedVariantId, addDisabled]);

  return (
    <div className="bg-kofkan-cream px-4 pb-24 pt-4 dark:bg-zinc-950">
      <div className="mx-auto max-w-mobile">
        <div 
          className="relative aspect-square w-full overflow-hidden rounded-[12px] bg-kofkan-gray-soft shadow-sm ring-1 ring-black/[0.06] dark:bg-zinc-800 dark:ring-white/10"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="absolute inset-2 z-[1] sm:inset-3">
            <div className="relative h-full w-full">
              <Image
                key={activeImage}
                src={cleanImageUrl(activeImage, { width: 800, format: "webp" })}
                alt=""
                fill
                className="object-contain"
                sizes="(max-width:430px) 100vw, 400px"
                priority
                unoptimized
              />
            </div>
          </div>
          <button
            type="button"
            className="absolute inset-0 z-[5] cursor-zoom-in rounded-[12px]"
            aria-label="View larger image"
            onClick={() => setLightboxOpen(true)}
          />
          <ProductWishlistButton productId={p.id} size="md" className="pointer-events-auto absolute right-3 top-3 z-[15]" />
        </div>

        {thumbnails.length > 1 && (
          <div className="mt-3 -mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {mediaLoading &&
              Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={`thumb-sk-${i}`}
                  aria-hidden
                  className="h-16 w-16 shrink-0 animate-pulse rounded-lg bg-kofkan-gray-soft ring-1 ring-black/[0.08] dark:bg-zinc-800 dark:ring-white/10"
                />
              ))}
            {thumbnails.map((t) => {
              const isActive = t.src === activeImage;
              const isVariant = t.variantId != null;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => onThumbnailPick(t)}
                  className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-lg ring-1 transition ${
                    isActive
                      ? "ring-2 ring-kofkan-gold"
                      : "ring-black/[0.08] hover:ring-black/[0.2] dark:ring-white/10"
                  }`}
                  aria-label={t.label ?? "Product photo"}
                  aria-pressed={isActive}
                  title={t.label ?? undefined}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={t.src}
                    alt=""
                    className="h-full w-full bg-kofkan-gray-soft object-contain p-0.5 dark:bg-zinc-800"
                  />
                  {isVariant && (
                    <span className="pointer-events-none absolute inset-x-0 bottom-0 truncate bg-black/55 px-1 py-[1px] text-[9px] font-semibold text-white">
                      {t.label}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-kofkan-text-muted dark:text-zinc-500">
          {p.categoryLabel}
        </p>
        <h1 className="mt-1 font-display text-[1.35rem] font-semibold leading-tight text-kofkan-text-primary dark:text-zinc-100 sm:text-[1.5rem]">
          {displayTitle}
        </h1>
        {selectedVariant ? (
          <p className="mt-1 text-[11px] text-kofkan-text-muted dark:text-zinc-500">
            <span className="text-kofkan-text-muted">From </span>
            <span className="font-medium text-kofkan-text-secondary dark:text-zinc-400">{p.name}</span>
          </p>
        ) : null}
        <div className="mt-2 flex items-center gap-2">
          <StarRating value={p.rating} />
          {hasStockInfo && (
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                isOutOfStock
                  ? "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300"
                  : isLowStock
                  ? "bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300"
                  : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${
                isOutOfStock ? "bg-rose-500" : isLowStock ? "bg-amber-500" : "bg-emerald-500"
              }`} />
              {isOutOfStock
                ? "Out of stock"
                : isLowStock
                ? `Only ${effectiveStock} left`
                : `${effectiveStock} in stock`}
            </span>
          )}
        </div>

        <div className="mt-4 rounded-[10px] bg-white px-4 py-3 ring-1 ring-black/[0.06] dark:bg-zinc-900 dark:ring-white/10">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-kofkan-text-muted dark:text-zinc-500">
            Price
          </p>
          <div className="mt-1">
            <ProductPriceLabel product={priceSnapshot} size="md" />
            {selectedVariant &&
              variantValueSummary(selectedVariant) !== selectedVariant.name && (
                <p className="mt-0.5 text-[11px] font-medium text-kofkan-text-muted dark:text-zinc-500">
                  {variantValueSummary(selectedVariant)}
                </p>
              )}
          </div>
          <button
            ref={addToCartAnchorRef}
            type="button"
            className="kofkan-btn-gold kofkan-tap-bounce mt-4 flex w-full items-center justify-center gap-2 rounded-[10px] py-3 text-small font-semibold text-white shadow-md disabled:cursor-not-allowed disabled:opacity-60"
            onClick={() => handleAddToCart()}
            disabled={addDisabled}
          >
            <FaCart className="!h-4 !w-4 shrink-0" />
            {addLabel}
          </button>
          <button
            type="button"
            className="kofkan-tap mt-2 flex w-full items-center justify-center rounded-[10px] border border-kofkan-gray-soft bg-white py-2.5 text-center text-small font-semibold text-kofkan-text-primary transition hover:bg-kofkan-cream dark:border-white/15 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-white/5"
            onClick={handleBuyNow}
            disabled={addDisabled || (variants.length > 0 && !selectedVariant)}
          >
            Buy now
          </button>
        </div>

        {hasNumericId && (
          <ProductVariantsDisplay
            productId={numericId}
            basePrice={p.price}
            variants={variants}
            selectedId={selectedVariantId}
            onSelectedIdChange={onSelectedIdChange}
          />
        )}

        <div className="mt-4">
          <h2 className="text-small font-semibold text-kofkan-text-primary dark:text-zinc-100">About this product</h2>
          <p className="mt-2 text-body leading-relaxed text-kofkan-text-secondary dark:text-zinc-400">{effectiveDescription}</p>
        </div>

        {hasNumericId && (
          <ProductReviewsSection productId={numericId} />
        )}

        {recentlyViewed.length > 0 && (
          <div className="mt-10">
            <ProductCarouselRail
              title="Recently viewed"
              products={recentlyViewed}
              hideWhenEmpty
            />
          </div>
        )}

        {related.length > 0 && (
          <section className="mt-10" aria-labelledby="related-products-heading">
            <div className="flex items-end justify-between gap-3">
              <h2
                id="related-products-heading"
                className="font-display text-[1.05rem] font-semibold text-kofkan-text-primary dark:text-zinc-100"
              >
                {sameCategoryCount > 0 ? `More in ${p.categoryLabel}` : "You may also like"}
              </h2>
              {sameCategoryCount > 0 && p.category ? (
                <Link
                  href={`/shop?cat=${encodeURIComponent(p.category)}`}
                  className="shrink-0 text-small font-semibold text-kofkan-gold"
                >
                  View category
                </Link>
              ) : (
                <Link href="/shop" className="shrink-0 text-small font-semibold text-kofkan-gold">
                  Shop all
                </Link>
              )}
            </div>
            <div className="mt-3 -mx-4 flex gap-3 overflow-x-auto px-4 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden snap-x snap-mandatory">
              {related.map((item) => (
                <RelatedProductCard key={item.id} item={item} onAdd={addProduct} />
              ))}
            </div>
          </section>
        )}
      </div>

      {lightboxOpen ? (
        <div
          className="fixed inset-0 z-[90] flex flex-col items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Enlarged product image"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            type="button"
            className="absolute right-3 top-3 z-[2] flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-2xl font-light leading-none text-white ring-1 ring-white/30 backdrop-blur hover:bg-white/25"
            aria-label="Close image"
            onClick={(e) => {
              e.stopPropagation();
              setLightboxOpen(false);
            }}
          >
            ×
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={activeImage}
            alt={displayTitle}
            className="relative z-[1] max-h-[min(88vh,820px)] w-auto max-w-[min(94vw,960px)] object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <p className="mt-3 max-w-full truncate px-2 text-center text-small text-white/80">{displayTitle}</p>
        </div>
      ) : null}

      {showFloatingAdd && !lightboxOpen ? (
        <button
          type="button"
          className="kofkan-tap-bounce fixed bottom-[calc(4.75rem+var(--safe-bottom))] left-3 z-[68] flex w-[4.75rem] flex-col items-center gap-1 rounded-2xl bg-gradient-to-b from-amber-200 to-kofkan-gold px-2 py-2.5 text-center shadow-[0_6px_20px_rgba(200,169,106,0.45)] ring-2 ring-white/95 disabled:cursor-not-allowed disabled:opacity-50 dark:from-amber-300 dark:to-amber-500 dark:ring-zinc-900"
          aria-label={addLabel}
          onClick={() => handleAddToCart()}
          disabled={addDisabled}
        >
          <span className="text-[8px] font-bold uppercase leading-tight tracking-wide text-kofkan-crimson dark:text-red-950">
            Add to cart
          </span>
        </button>
      ) : null}
    </div>
  );
}
