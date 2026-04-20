"use client";

import Link from "next/link";
import { useState } from "react";

import { useAppSession } from "@/components/Providers";
import { checkout } from "@/lib/api/orders";

export default function CartPage() {
  const { token, cart, cartTotal, updateItem, removeItem, refreshCart } = useAppSession();
  const [message, setMessage] = useState("");

  const runCheckout = async () => {
    if (!token) {
      setMessage("Please sign in to checkout.");
      return;
    }
    try {
      const order = await checkout(token);
      await refreshCart();
      setMessage(`Order #${order.id} created successfully.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Checkout failed");
    }
  };

  return (
    <main className="kofkan-shell py-10">
      <h1 className="text-3xl font-bold">Cart</h1>
      {!token ? (
        <p className="mt-3 text-sm text-kofkan-muted">
          Sign in first. <Link href="/auth/login" className="font-semibold text-kofkan-black">Go to login</Link>
        </p>
      ) : null}
      <div className="mt-6 space-y-3">
        {cart.map((item) => (
          <article key={item.id} className="rounded-xl border border-kofkan-border p-4">
            <h2 className="font-semibold">{item.product_name}</h2>
            <p className="text-sm text-kofkan-muted">GH₵ {item.price.toFixed(2)}</p>
            <div className="mt-2 flex items-center gap-2">
              <button onClick={() => void updateItem(item.id, Math.max(1, item.quantity - 1))} className="rounded border border-kofkan-border px-2">-</button>
              <span>{item.quantity}</span>
              <button onClick={() => void updateItem(item.id, item.quantity + 1)} className="rounded border border-kofkan-border px-2">+</button>
              <button onClick={() => void removeItem(item.id)} className="ml-2 rounded border border-kofkan-border px-2 text-sm">Remove</button>
            </div>
          </article>
        ))}
      </div>
      {cart.length === 0 ? <p className="mt-4 text-kofkan-muted">Your cart is empty.</p> : null}
      <div className="mt-8 rounded-xl border border-kofkan-border p-4">
        <p className="text-lg font-semibold">Total: GH₵ {cartTotal.toFixed(2)}</p>
        <button onClick={() => void runCheckout()} className="mt-3 rounded-lg bg-kofkan-black px-4 py-2 font-semibold text-kofkan-white">
          Checkout
        </button>
        {message ? <p className="mt-2 text-sm text-kofkan-charcoal">{message}</p> : null}
      </div>
    </main>
  );
}
