import { apiFetchJsonAuth } from "@/lib/api/client";
import { V1 } from "@/lib/api/v1-paths";

export type WishlistItemRead = {
  id: number;
  user_id: number;
  product_id: number;
  created_at: string;
  product: {
    id: number;
    name: string;
    slug: string;
    price: number;
    image_url?: string | null;
  };
};

export async function wishlistList(accessToken: string): Promise<WishlistItemRead[]> {
  return apiFetchJsonAuth<WishlistItemRead[]>(accessToken, V1.wishlist.list);
}

export async function wishlistAdd(accessToken: string, productId: number): Promise<WishlistItemRead> {
  return apiFetchJsonAuth<WishlistItemRead>(accessToken, V1.wishlist.add, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ product_id: productId }),
  });
}

export async function wishlistRemove(accessToken: string, itemId: number): Promise<void> {
  await apiFetchJsonAuth<undefined>(accessToken, V1.wishlist.remove(itemId), {
    method: "DELETE",
  });
}

export async function wishlistRemoveByProduct(accessToken: string, productId: number): Promise<void> {
  await apiFetchJsonAuth<undefined>(accessToken, V1.wishlist.byProduct(productId), {
    method: "DELETE",
  });
}
