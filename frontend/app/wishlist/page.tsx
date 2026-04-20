"use client";

import Image from "next/image";
import Link from "next/link";
import { HeartOff } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { useAppSession } from "@/components/Providers";
import { fetchWishlist, removeWishlistItem } from "@/lib/api/wishlist";
import type { Product } from "@/lib/api/products";

export default function WishlistPage() {
  const { token } = useAppSession();
  const [items, setItems] = useState<Product[]>([]);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    if (!token) {
      setItems([]);
      setMessage("Sign in to view your wishlist.");
      return;
    }
    try {
      setItems(await fetchWishlist(token));
      setMessage("");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not load wishlist");
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const remove = async (id: number) => {
    if (!token) return;
    try {
      await removeWishlistItem(token, id);
      await load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Remove failed");
    }
  };

  return (
    <main className="kofkan-shell py-10">
      <div className="border-b border-kofkan-border pb-6">
        <h1 className="text-3xl font-bold">Wishlist</h1>
        <p className="mt-2 text-kofkan-muted">Save boards and modules for your next build.</p>
      </div>
      {message ? <p className="mt-4 text-sm text-kofkan-muted">{message}</p> : null}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((p) => (
          <article key={p.id} className="flex gap-4 rounded-xl border border-kofkan-border p-4">
            <Link href={`/product/${p.id}`} className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-kofkan-bg-secondary">
              <Image
                src={
                  p.image_url ??
                  "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=400&q=80"
                }
                alt={p.name}
                fill
                className="object-cover"
              />
            </Link>
            <div className="min-w-0 flex-1">
              <Link href={`/product/${p.id}`} className="font-semibold hover:underline">
                {p.name}
              </Link>
              <p className="mt-1 text-sm font-bold">GH₵ {p.price.toFixed(2)}</p>
              <button
                type="button"
                onClick={() => void remove(p.id)}
                className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-kofkan-muted hover:text-kofkan-black"
              >
                <HeartOff className="h-3.5 w-3.5" />
                Remove
              </button>
            </div>
          </article>
        ))}
      </div>
      {token && items.length === 0 && !message ? (
        <p className="mt-8 text-sm text-kofkan-muted">Your wishlist is empty. Browse the shop and tap the heart icon.</p>
      ) : null}
    </main>
  );
}
