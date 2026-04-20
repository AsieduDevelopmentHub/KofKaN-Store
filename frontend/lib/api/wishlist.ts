import { apiDelete, apiGet, apiPost } from "@/lib/api/client";

import type { Product } from "@/lib/api/products";

export function fetchWishlist(token: string) {
  return apiGet<Product[]>("/wishlist", token);
}

export function addWishlistItem(token: string, productId: number) {
  return apiPost<{ message: string }>("/wishlist", { product_id: productId }, token);
}

export function removeWishlistItem(token: string, productId: number) {
  return apiDelete<{ message: string }>(`/wishlist/${productId}`, token);
}
