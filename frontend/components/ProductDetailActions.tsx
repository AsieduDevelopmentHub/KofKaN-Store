"use client";

import Link from "next/link";
import { Heart, ShoppingCart } from "lucide-react";
import { useState } from "react";

import { useAppSession } from "@/components/Providers";
import { addWishlistItem } from "@/lib/api/wishlist";

type ProductDetailActionsProps = {
  productId: number;
};

export function ProductDetailActions({ productId }: ProductDetailActionsProps) {
  const { token, addItem } = useAppSession();
  const [msg, setMsg] = useState("");

  const addCart = async () => {
    if (!token) {
      setMsg("Sign in to add to cart.");
      return;
    }
    try {
      await addItem(productId);
      setMsg("Added to cart.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Could not add to cart");
    }
  };

  const addWish = async () => {
    if (!token) {
      setMsg("Sign in to save to wishlist.");
      return;
    }
    try {
      await addWishlistItem(token, productId);
      setMsg("Saved to wishlist.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Wishlist update failed");
    }
  };

  return (
    <div className="mt-8 flex flex-wrap gap-3">
      <button
        type="button"
        onClick={() => void addCart()}
        className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-kofkan-black px-5 py-3 text-sm font-semibold text-kofkan-white min-w-[160px]"
      >
        <ShoppingCart className="h-4 w-4" />
        Add to cart
      </button>
      <button
        type="button"
        onClick={() => void addWish()}
        className="inline-flex items-center justify-center gap-2 rounded-xl border border-kofkan-border px-5 py-3 text-sm font-semibold"
      >
        <Heart className="h-4 w-4" />
        Wishlist
      </button>
      {!token ? (
        <Link href="/auth/login" className="inline-flex items-center text-sm font-medium text-kofkan-charcoal underline">
          Sign in for cart & wishlist
        </Link>
      ) : null}
      {msg ? <p className="w-full text-sm text-kofkan-muted">{msg}</p> : null}
    </div>
  );
}
