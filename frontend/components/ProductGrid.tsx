import Image from "next/image";

import type { Product } from "@/lib/api/products";

type ProductGridProps = {
  title: string;
  products: Product[];
};

export function ProductGrid({ title, products }: ProductGridProps) {
  return (
    <section className="kofkan-shell py-10">
      <div className="mb-6">
        <h2 className="text-2xl font-bold">{title}</h2>
      </div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {products.map((product) => (
          <article key={product.id} className="rounded-xl border border-kofkan-border bg-kofkan-white p-4 shadow-soft">
            <div className="relative mb-3 h-44 overflow-hidden rounded-lg bg-kofkan-bg-secondary">
              <Image
                src={product.image_url ?? "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=900&q=80"}
                alt={product.name}
                fill
                className="object-cover"
              />
            </div>
            <h3 className="line-clamp-2 font-semibold">{product.name}</h3>
            <p className="mt-1 text-sm text-kofkan-muted">{product.brand ?? "Electronics"}</p>
            <p className="mt-3 text-lg font-bold">GH₵ {product.price.toFixed(2)}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
