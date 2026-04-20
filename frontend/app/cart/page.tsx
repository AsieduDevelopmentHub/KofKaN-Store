"use client";

import Link from "next/link";
import { useState } from "react";

import { PaymentActions } from "@/components/PaymentActions";
import { useAppSession } from "@/components/Providers";
import { checkout, type Order } from "@/lib/api/orders";

export default function CartPage() {
  const { token, cart, cartTotal, updateItem, removeItem, refreshCart } = useAppSession();
  const [message, setMessage] = useState("");
  const [lastOrder, setLastOrder] = useState<Order | null>(null);

  const runCheckout = async () => {
    if (!token) {
      setMessage("Please sign in to checkout.");
      return;
    }
    try {
      const order = await checkout(token);
      await refreshCart();
      setLastOrder(order);
      setMessage(`Order #${order.id} created. Complete payment below when ready.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Checkout failed");
    }
  };

  const cartCount = cart.reduce((s, l) => s + l.quantity, 0);

  return (
    <main className="kofkan-shell py-10 pb-24 md:pb-10">
      <div className="border-b border-kofkan-border pb-6">
        <h1 className="text-3xl font-bold">Cart</h1>
        <p className="mt-2 text-kofkan-muted">
          {cartCount > 0 ? `${cartCount} item${cartCount === 1 ? "" : "s"} in your cart` : "Your cart is ready for components."}
        </p>
      </div>

      {!token ? (
        <div className="mt-6 rounded-xl border border-dashed border-kofkan-border bg-kofkan-bg-secondary p-6">
          <p className="text-sm text-kofkan-charcoal">
            Sign in to sync your cart across devices.{" "}
            <Link href="/auth/login" className="font-semibold text-kofkan-black underline">
              Go to login
            </Link>
          </p>
        </div>
      ) : null}

      <div className="mt-8 grid gap-4 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          {cart.map((item) => (
            <article
              key={item.id}
              className="flex flex-col gap-3 rounded-2xl border border-kofkan-border bg-kofkan-white p-4 shadow-sm sm:flex-row sm:items-center"
            >
              <div className="min-w-0 flex-1">
                <h2 className="font-semibold">{item.product_name}</h2>
                <p className="text-sm text-kofkan-muted">GH₵ {item.price.toFixed(2)} each</p>
                <p className="mt-1 text-sm font-bold">Line: GH₵ {item.line_total.toFixed(2)}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void updateItem(item.id, Math.max(1, item.quantity - 1))}
                  className="h-9 w-9 rounded-lg border border-kofkan-border text-lg font-medium"
                >
                  −
                </button>
                <span className="min-w-[2rem] text-center text-sm font-semibold">{item.quantity}</span>
                <button
                  type="button"
                  onClick={() => void updateItem(item.id, item.quantity + 1)}
                  className="h-9 w-9 rounded-lg border border-kofkan-border text-lg font-medium"
                >
                  +
                </button>
                <button
                  type="button"
                  onClick={() => void removeItem(item.id)}
                  className="ml-2 rounded-lg border border-kofkan-border px-3 py-2 text-sm text-kofkan-muted hover:text-kofkan-black"
                >
                  Remove
                </button>
              </div>
            </article>
          ))}
          {cart.length === 0 ? (
            <p className="rounded-xl border border-dashed border-kofkan-border p-6 text-sm text-kofkan-muted">
              Your cart is empty.{" "}
              <Link href="/shop" className="font-semibold text-kofkan-black underline">
                Continue shopping
              </Link>
            </p>
          ) : null}
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-kofkan-border bg-kofkan-bg-secondary p-6">
            <p className="text-sm font-medium text-kofkan-muted">Order summary</p>
            <p className="mt-2 text-2xl font-bold">GH₵ {cartTotal.toFixed(2)}</p>
            <button
              type="button"
              onClick={() => void runCheckout()}
              disabled={!token || cart.length === 0}
              className="mt-4 w-full rounded-xl bg-kofkan-black py-3 text-sm font-semibold text-kofkan-white disabled:opacity-50"
            >
              Checkout
            </button>
            {message ? <p className="mt-3 text-xs text-kofkan-charcoal">{message}</p> : null}
          </div>
          {lastOrder && token ? (
            <div className="mt-4">
              <PaymentActions token={token} orderId={lastOrder.id} onStatusChange={() => setMessage("Payment status refreshed.")} />
            </div>
          ) : null}
        </aside>
      </div>
    </main>
  );
}
