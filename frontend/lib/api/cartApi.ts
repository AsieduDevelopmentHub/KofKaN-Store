import { apiFetchJsonAuth } from "@/lib/api/client";
import { V1 } from "@/lib/api/v1-paths";
import type { WishlistItemRead } from "@/lib/api/wishlist";

export type CartItemRow = {
  id: number;
  user_id: number;
  product_id: number;
  /** Optional variant SKU — null for products without options picked. */
  variant_id?: number | null;
  /** Inlined variant details so cart/checkout UIs don't need a second hop. */
  variant_name?: string | null;
  variant_price_delta?: number | null;
  variant_image_url?: string | null;
  quantity: number;
  created_at: string;
  updated_at: string;
};

export async function cartList(accessToken: string): Promise<CartItemRow[]> {
  return apiFetchJsonAuth<CartItemRow[]>(accessToken, V1.cart.list);
}

export async function cartAddItem(
  accessToken: string,
  body: { product_id: number; quantity: number; variant_id?: number | null }
): Promise<CartItemRow> {
  return apiFetchJsonAuth<CartItemRow>(accessToken, V1.cart.addItem, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function cartUpdateItem(
  accessToken: string,
  itemId: number,
  quantity: number
): Promise<CartItemRow> {
  return apiFetchJsonAuth<CartItemRow>(accessToken, V1.cart.updateItem(itemId), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ quantity }),
  });
}

export async function cartDeleteItem(accessToken: string, itemId: number): Promise<void> {
  await apiFetchJsonAuth<undefined>(accessToken, V1.cart.deleteItem(itemId), {
    method: "DELETE",
  });
}

export async function cartClear(accessToken: string): Promise<void> {
  await apiFetchJsonAuth<undefined>(accessToken, V1.cart.clear, {
    method: "DELETE",
  });
}

export type CartWithWishlist = {
  cart: CartItemRow[];
  wishlist: WishlistItemRead[];
};

export async function cartWithWishlist(accessToken: string): Promise<CartWithWishlist> {
  return apiFetchJsonAuth<CartWithWishlist>(accessToken, V1.cart.withWishlist);
}
