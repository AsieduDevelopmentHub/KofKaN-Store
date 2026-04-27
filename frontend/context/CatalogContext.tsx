"use client";

import { useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import type { MockProduct } from "@/lib/mock-data";
import { productsForHomeCategory } from "@/lib/mock-data";
import {
  fetchCategories,
  fetchProductById,
  fetchProducts,
  homeRailKeys,
  mapApiCategoriesToDisplay,
  mapApiProductToMock,
  mockCatalogDisplay,
  type CatalogCategory,
} from "@/lib/api/products";
import { useCategories, useProducts } from "@/lib/hooks/useProducts";

type Source = "api" | "mock";

type CatalogContextValue = {
  products: MockProduct[];
  categories: CatalogCategory[];
  homeRailCategoryKeys: string[];
  loading: boolean;
  source: Source;
  error: string | null;
  getProduct: (id: string) => MockProduct | undefined;
  getProductsForHomeRail: (key: string) => MockProduct[];
  refreshProduct: (id: string) => Promise<MockProduct | null>;
};

const CatalogContext = createContext<CatalogContextValue | null>(null);

export function CatalogProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  /** Start empty so we never flash demo products while the API request is in flight. */
  const { data: catData, isLoading: catLoading } = useCategories();
  const { data: prodData, isLoading: prodLoading, error: prodError } = useProducts({ limit: 100 });

  const categories = useMemo(() => {
    if (!catData) return [];
    return mapApiCategoriesToDisplay(catData);
  }, [catData]);

  const products = useMemo(() => {
    if (!prodData?.items) return [];
    // We pass catData or empty array to the product mapper so it can resolve category labels
    return prodData.items.map((row) => mapApiProductToMock(row, catData || []));
  }, [prodData, catData]);

  const loading = catLoading || prodLoading;
  const error = prodError ? (prodError as Error).message : null;
  const source = "api"; 

  const getProduct = useCallback(
    (id: string) => products.find((p) => p.id === id),
    [products]
  );

  const getProductsForHomeRail = useCallback(
    (key: string) => productsForHomeCategory(key, products),
    [products]
  );

  const refreshProduct = useCallback(
    async (id: string) => {
      const num = parseInt(id, 10);
      if (Number.isNaN(num)) return null;
      try {
        const row = await fetchProductById(num);
        const cats = await fetchCategories();
        const p = mapApiProductToMock(row, cats);
        
        // Update the query cache
        await queryClient.invalidateQueries({ queryKey: ["products"] });
        
        return p;
      } catch {
        return null;
      }
    },
    [queryClient]
  );

  const homeRailCategoryKeys = useMemo(
    () => homeRailKeys(categories, source),
    [categories, source]
  );

  const value = useMemo<CatalogContextValue>(
    () => ({
      products,
      categories,
      homeRailCategoryKeys,
      loading,
      source,
      error,
      getProduct,
      getProductsForHomeRail,
      refreshProduct,
    }),
    [
      products,
      categories,
      homeRailCategoryKeys,
      loading,
      source,
      error,
      getProduct,
      getProductsForHomeRail,
      refreshProduct,
    ]
  );

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export function useCatalog() {
  const ctx = useContext(CatalogContext);
  if (!ctx) throw new Error("useCatalog must be used within CatalogProvider");
  return ctx;
}
