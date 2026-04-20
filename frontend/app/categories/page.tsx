import { fetchCategories } from "@/lib/api/products";

export default async function CategoriesPage() {
  const categories = await fetchCategories();

  return (
    <main className="kofkan-shell py-10">
      <h1 className="text-3xl font-bold">Categories</h1>
      <p className="mt-2 text-kofkan-muted">Curated electronics categories inspired by the Sikapa section layout.</p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((category) => (
          <article key={category.id} className="rounded-xl border border-kofkan-border p-5">
            <h2 className="font-semibold">{category.name}</h2>
            <p className="mt-2 text-sm text-kofkan-muted">{category.description}</p>
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
