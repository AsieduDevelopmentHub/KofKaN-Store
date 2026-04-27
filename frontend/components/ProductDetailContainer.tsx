"use client";

import { useEffect, useMemo, useState } from "react";
import { useCatalog } from "@/context/CatalogContext";
import { getProductById, type MockProduct } from "@/lib/mock-data";
import { ProductDetailScreen } from "@/components/ProductDetailScreen";
import { ProductDetailSkeleton } from "@/components/StorefrontSkeletons";

export function ProductDetailContainer({ id }: { id: string }) {
  const { loading, getProduct, refreshProduct } = useCatalog();
  const fromCatalog = useMemo(() => getProduct(id), [getProduct, id]);
  const [resolved, setResolved] = useState<MockProduct | undefined>(() => fromCatalog ?? getProductById(id));

  useEffect(() => {
    setResolved(fromCatalog ?? getProductById(id));
  }, [fromCatalog, id]);

  useEffect(() => {
    if (loading) return;
    if (resolved) return;
    const num = parseInt(id, 10);
    if (Number.isNaN(num)) return;
    refreshProduct(id).then((p) => {
      if (p) setResolved(p);
    });
  }, [id, loading, resolved, refreshProduct]);

  if (!resolved) {
    if (loading) return <ProductDetailSkeleton />;
    return (
      <div className="bg-kofkan-cream px-4 py-10 text-center text-small text-kofkan-text-secondary dark:bg-zinc-950 dark:text-zinc-400">
        Product not found.
      </div>
    );
  }

  return <ProductDetailScreen product={resolved} />;
}
