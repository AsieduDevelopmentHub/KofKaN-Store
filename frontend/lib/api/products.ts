import { apiGet } from "@/lib/api/client";

export type Product = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  sku: string;
  brand: string | null;
  voltage_spec: string | null;
  price: number;
  currency: string;
  stock_quantity: number;
  image_url: string | null;
  is_featured: boolean;
};

export type Category = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
};

export async function fetchFeaturedProducts() {
  try {
    return await apiGet<Product[]>("/products?featured_only=true&limit=8");
  } catch {
    return [];
  }
}

export async function fetchProducts() {
  try {
    return await apiGet<Product[]>("/products?limit=30");
  } catch {
    return [];
  }
}

export async function fetchCategories() {
  try {
    return await apiGet<Category[]>("/categories");
  } catch {
    return [];
  }
}
