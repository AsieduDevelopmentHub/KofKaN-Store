"use client";

import Image from "next/image";
import Link from "next/link";
import { Heart, ShoppingCart } from "lucide-react";
import { useState } from "react";

import { useAppSession } from "@/components/Providers";
import { addWishlistItem } from "@/lib/api/wishlist";
import type { Product } from "@/lib/api/products";

type ProductGridProps = {
  title: string;
  products: Product[];
};

export function ProductGrid({ title, products }: ProductGridProps) {
  const { addItem, token } = useAppSession();
  const [message, setMessage] = useState<string>("");

  const add = async (productId: number) => {
    try {
      await addItem(productId);
      setMessage("Added to cart");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not add to cart");
    }
  };

  const wish = async (productId: number) => {
    if (!token) {
      setMessage("Sign in to use wishlist.");
      return;
    }
    try {
      await addWishlistItem(token, productId);
      setMessage("Saved to wishlist");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Wishlist failed");
    }
  };

  return (
    <section className="kofkan-shell py-10">
      <div className="mb-6">
        <h2 className="text-2xl font-bold">{title}</h2>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
        {products.map((product) => (
          <article
            key={product.id}
            className="group flex flex-col rounded-xl border border-kofkan-border bg-kofkan-white p-3 shadow-soft transition hover:-translate-y-0.5 hover:shadow-lg sm:p-4"
          >
            <Link href={`/product/${product.id}`} className="block flex-1">
              <div className="relative mb-3 aspect-[4/3] overflow-hidden rounded-lg bg-kofkan-bg-secondary">
                <Image
                  src={
                    product.image_url ??
                    "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=900&q=80"
                  }
                  alt={product.name}
                  fill
                  className="object-cover transition duration-300 group-hover:scale-[1.02]"
                />
              </div>
              <h3 className="line-clamp-2 font-semibold">{product.name}</h3>
              <p className="mt-1 text-sm text-kofkan-muted">{product.brand ?? "Electronics"}</p>
              <p className="mt-3 text-lg font-bold">GH₵ {product.price.toFixed(2)}</p>
            </Link>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => void add(product.id)}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-kofkan-black px-3 py-2 text-sm font-semibold text-kofkan-white transition hover:bg-kofkan-charcoal"
              >
                <ShoppingCart className="h-4 w-4" />
                Cart
              </button>
              <button
                type="button"
                onClick={() => void wish(product.id)}
                className="inline-flex items-center justify-center rounded-lg border border-kofkan-border px-3 py-2 text-sm font-semibold"
                aria-label="Add to wishlist"
              >
                <Heart className="h-4 w-4" />
              </button>
            </div>
          </article>
        ))}
      </div>
      {message ? <p className="mt-3 text-sm text-kofkan-charcoal">{message}</p> : null}
      {products.length === 0 ? (
        <p className="mt-6 rounded-lg border border-dashed border-kofkan-border p-4 text-sm text-kofkan-muted">
          No products available yet. Start the backend API to load inventory data.
        </p>
      ) : null}
    </section>
  );
}
