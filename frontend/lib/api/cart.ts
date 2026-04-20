import { apiDelete, apiGet, apiPost, apiPut } from "@/lib/api/client";

export type CartLine = {
  id: number;
  product_id: number;
  product_name: string;
  price: number;
  image_url: string | null;
  quantity: number;
  line_total: number;
};

export function fetchCart(token: string) {
  return apiGet<CartLine[]>("/cart", token);
}

export function addToCart(token: string, payload: { product_id: number; quantity: number }) {
  return apiPost<CartLine[]>("/cart", payload, token);
}

export function updateCartItem(token: string, cartItemId: number, quantity: number) {
  return apiPut<CartLine[]>(`/cart/${cartItemId}`, { quantity }, token);
}

export function removeCartItem(token: string, cartItemId: number) {
  return apiDelete<CartLine[]>(`/cart/${cartItemId}`, token);
}
