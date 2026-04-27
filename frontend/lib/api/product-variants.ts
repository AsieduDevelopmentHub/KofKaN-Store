import { apiFetchJson } from "@/lib/api/client";
import { V1 } from "@/lib/api/v1-paths";

export type ProductVariantPublic = {
  id: number;
  product_id: number;
  name: string;
  sku?: string | null;
  attributes?: Record<string, unknown> | null;
  price_delta: number;
  in_stock: number;
  image_url?: string | null;
  description?: string | null;
};

export async function fetchProductVariants(productId: number): Promise<ProductVariantPublic[]> {
  return apiFetchJson<ProductVariantPublic[]>(V1.productVariants.listForProduct(productId));
}

export type ProductImagePublic = {
  id: number;
  product_id: number;
  image_url: string;
  alt_text?: string | null;
  is_primary: boolean;
  sort_order: number;
};

export async function fetchProductImages(productId: number): Promise<ProductImagePublic[]> {
  return apiFetchJson<ProductImagePublic[]>(V1.productImages.listForProduct(productId));
}
