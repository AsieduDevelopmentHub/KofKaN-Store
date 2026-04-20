import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ProductDetailActions } from "@/components/ProductDetailActions";
import { ProductReviews } from "@/components/ProductReviews";
import { fetchProductById } from "@/lib/api/products";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ProductPage({ params }: PageProps) {
  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isFinite(numericId)) {
    notFound();
  }
  const product = await fetchProductById(numericId);
  if (!product) {
    notFound();
  }

  const img =
    product.image_url ??
    "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=900&q=80";

  return (
    <main>
      <section className="border-b border-kofkan-border bg-kofkan-bg-secondary">
        <div className="kofkan-shell py-6 text-sm text-kofkan-muted">
          <Link href="/shop" className="font-medium text-kofkan-black hover:underline">
            ← Back to shop
          </Link>
        </div>
      </section>
      <div className="kofkan-shell py-10">
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="relative aspect-square overflow-hidden rounded-2xl border border-kofkan-border bg-kofkan-bg-secondary lg:aspect-[4/3]">
            <Image src={img} alt={product.name} fill className="object-cover" priority />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-kofkan-muted">{product.brand ?? "Electronics"}</p>
            <h1 className="mt-2 text-3xl font-bold leading-tight md:text-4xl">{product.name}</h1>
            <p className="mt-2 text-sm text-kofkan-muted">SKU {product.sku}</p>
            {product.voltage_spec ? (
              <p className="mt-1 text-sm text-kofkan-charcoal">Spec: {product.voltage_spec}</p>
            ) : null}
            <p className="mt-6 text-3xl font-bold">GH₵ {product.price.toFixed(2)}</p>
            <p className="mt-2 text-sm text-kofkan-muted">
              {product.stock_quantity > 0 ? `${product.stock_quantity} in stock` : "Out of stock"}
            </p>
            {product.description ? (
              <p className="mt-6 text-sm leading-relaxed text-kofkan-charcoal">{product.description}</p>
            ) : null}
            <ProductDetailActions productId={product.id} />
          </div>
        </div>
        <ProductReviews productId={product.id} />
      </div>
    </main>
  );
}
