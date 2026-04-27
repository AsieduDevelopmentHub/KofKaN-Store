import Link from "next/link";

import { fetchCategories } from "@/lib/api/products";

// Resolved at request time so a build-time backend outage doesn't break deploys.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function CategoriesPage() {
  const categories = await fetchCategories().catch(() => []);

  return (
    <main className="kofkan-shell py-10 pb-24 md:pb-10">
      <div className="border-b border-kofkan-border pb-6">
        <h1 className="text-3xl font-bold">Categories</h1>
        <p className="mt-2 text-kofkan-muted">Browse electronics by use case — from microcontrollers to power and sensors.</p>
        <Link href="/shop" className="mt-4 inline-block text-sm font-semibold text-kofkan-black underline">
          View all products
        </Link>
      </div>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((category) => (
          <article key={category.id} className="rounded-2xl border border-kofkan-border bg-kofkan-white p-5 shadow-sm transition hover:border-kofkan-black">
            <h2 className="font-semibold">{category.name}</h2>
            <p className="mt-2 text-sm text-kofkan-muted">{category.description ?? "Electronics category"}</p>
          </article>
        ))}
      </div>
      {categories.length === 0 ? (
        <p className="mt-6 rounded-lg border border-dashed border-kofkan-border p-4 text-sm text-kofkan-muted">
          No categories loaded yet. Start the backend API to seed and serve category data.
        </p>
      ) : null}
    </main>
  );
}
