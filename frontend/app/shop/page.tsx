import { ProductGrid } from "@/components/ProductGrid";
import { fetchProducts } from "@/lib/api/products";

export default async function ShopPage() {
  const products = await fetchProducts();
  return (
    <main>
      <section className="border-b border-kofkan-border bg-kofkan-bg-secondary">
        <div className="kofkan-shell py-10">
          <h1 className="text-3xl font-bold">Shop Electronics</h1>
          <p className="mt-2 text-kofkan-muted">Explore components, kits, and power solutions from trusted brands.</p>
        </div>
      </section>
      <ProductGrid title="All Products" products={products} />
    </main>
  );
}
