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
  return apiGet<Product[]>("/products?featured_only=true&limit=8");
}

export async function fetchProducts() {
  return apiGet<Product[]>("/products?limit=30");
}

export async function fetchCategories() {
  return apiGet<Category[]>("/categories");
}
