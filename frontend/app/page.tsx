import Link from "next/link";
import { ShieldCheck, Truck, Wrench } from "lucide-react";

import { ProductGrid } from "@/components/ProductGrid";
import { fetchCategories, fetchFeaturedProducts } from "@/lib/api/products";

export default async function HomePage() {
  const [featuredProducts, categories] = await Promise.all([fetchFeaturedProducts(), fetchCategories()]);

  return (
    <main>
      <section className="border-b border-kofkan-border bg-gradient-to-br from-black via-[#151515] to-[#2b2b2b] text-kofkan-white">
        <div className="kofkan-shell py-12 md:py-20">
          <p className="mb-3 text-xs uppercase tracking-[0.2em] text-zinc-300">Electronics & Mechatronics</p>
          <h1 className="max-w-3xl text-3xl font-bold leading-tight md:text-5xl">
            Build Faster with Reliable Components from KofKaN Store
          </h1>
          <p className="mt-4 max-w-2xl text-zinc-300">
            Arduino kits, sensors, power modules, and maker essentials delivered across Ghana.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/shop"
              className="rounded-lg border-2 border-kofkan-white bg-kofkan-white px-5 py-3 font-semibold text-kofkan-black transition hover:bg-transparent hover:text-kofkan-white"
            >
              Shop Now
            </Link>
            <Link
              href="/categories"
              className="rounded-lg border-2 border-kofkan-white px-5 py-3 font-semibold text-kofkan-white transition hover:bg-kofkan-white hover:text-kofkan-black"
            >
              Browse Categories
            </Link>
          </div>
        </div>
      </section>

      <section className="kofkan-shell py-10">
        <h2 className="mb-5 text-2xl font-bold">Popular Categories</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <article key={category.id} className="rounded-xl border border-kofkan-border bg-kofkan-bg-secondary p-5">
              <h3 className="font-semibold">{category.name}</h3>
              <p className="mt-2 text-sm text-kofkan-muted">{category.description ?? "Electronics category"}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="kofkan-shell pb-6">
        <div className="grid gap-3 sm:grid-cols-3">
          <article className="rounded-xl border border-kofkan-border bg-kofkan-bg-secondary p-4">
            <Truck className="h-5 w-5" />
            <h3 className="mt-2 font-semibold">Fast Delivery</h3>
            <p className="mt-1 text-sm text-kofkan-muted">Dispatch across Ghana with reliable courier partners.</p>
          </article>
          <article className="rounded-xl border border-kofkan-border bg-kofkan-bg-secondary p-4">
            <ShieldCheck className="h-5 w-5" />
            <h3 className="mt-2 font-semibold">Trusted Quality</h3>
            <p className="mt-1 text-sm text-kofkan-muted">Every component is checked before shipment.</p>
          </article>
          <article className="rounded-xl border border-kofkan-border bg-kofkan-bg-secondary p-4">
            <Wrench className="h-5 w-5" />
            <h3 className="mt-2 font-semibold">Expert Support</h3>
            <p className="mt-1 text-sm text-kofkan-muted">Get practical help for prototypes and repair projects.</p>
          </article>
        </div>
      </section>

      <ProductGrid title="Featured Electronics" products={featuredProducts} />
    </main>
  );
}
