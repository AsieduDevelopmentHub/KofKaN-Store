"use client";

import { useEffect, useState } from "react";

import { useAppSession } from "@/components/Providers";
import { fetchOrders, type Order } from "@/lib/api/orders";

export default function OrdersPage() {
  const { token } = useAppSession();
  const [orders, setOrders] = useState<Order[]>([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const load = async () => {
      if (!token) {
        setOrders([]);
        setMessage("Please sign in to view orders.");
        return;
      }
      try {
        const data = await fetchOrders(token);
        setOrders(data);
        setMessage("");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Could not load orders");
      }
    };
    void load();
  }, [token]);

  return (
    <main className="kofkan-shell py-10">
      <h1 className="text-3xl font-bold">Orders</h1>
      {message ? <p className="mt-3 text-sm text-kofkan-muted">{message}</p> : null}
      <div className="mt-6 space-y-3">
        {orders.map((order) => (
          <article key={order.id} className="rounded-xl border border-kofkan-border p-4">
            <h2 className="font-semibold">Order #{order.id}</h2>
            <p className="text-sm text-kofkan-muted">Status: {order.status}</p>
            <p className="text-sm text-kofkan-muted">Total: GH₵ {order.total_amount.toFixed(2)}</p>
          </article>
        ))}
      </div>
    </main>
  );
}
