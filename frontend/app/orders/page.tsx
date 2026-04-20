"use client";

import Link from "next/link";
import { Package } from "lucide-react";
import { useEffect, useState } from "react";

import { PaymentActions } from "@/components/PaymentActions";
import { useAppSession } from "@/components/Providers";
import { fetchOrders, type Order } from "@/lib/api/orders";

function showPaymentForStatus(status: string) {
  const s = status.toLowerCase();
  if (s === "paid" || s === "refunded" || s === "cancelled") return false;
  return true;
}

export default function OrdersPage() {
  const { token } = useAppSession();
  const [orders, setOrders] = useState<Order[]>([]);
  const [message, setMessage] = useState("");
  const [tick, setTick] = useState(0);

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
  }, [token, tick]);

  return (
    <main className="kofkan-shell py-10 pb-24 md:pb-10">
      <div className="flex flex-col gap-2 border-b border-kofkan-border pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Orders</h1>
          <p className="mt-2 text-kofkan-muted">Track shipments and complete payment for open orders.</p>
        </div>
        <Link
          href="/shop"
          className="inline-flex items-center gap-2 rounded-xl border border-kofkan-border px-4 py-2 text-sm font-semibold"
        >
          <Package className="h-4 w-4" />
          Shop more
        </Link>
      </div>
      {message ? <p className="mt-4 text-sm text-kofkan-muted">{message}</p> : null}
      <div className="mt-8 space-y-6">
        {orders.map((order) => (
          <article key={order.id} className="rounded-2xl border border-kofkan-border bg-kofkan-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Order #{order.id}</h2>
                <p className="mt-1 text-sm text-kofkan-muted">Placed {new Date(order.created_at).toLocaleString()}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-kofkan-muted">Status</p>
                <p className="font-semibold capitalize">{order.status.replace(/_/g, " ")}</p>
                <p className="mt-2 text-sm text-kofkan-muted">Total</p>
                <p className="text-lg font-bold">GH₵ {order.total_amount.toFixed(2)}</p>
              </div>
            </div>
            {token && showPaymentForStatus(order.status) ? (
              <div className="mt-4 border-t border-kofkan-border pt-4">
                <PaymentActions
                  compact
                  token={token}
                  orderId={order.id}
                  onStatusChange={() => setTick((x) => x + 1)}
                />
              </div>
            ) : null}
            <div className="mt-4 flex flex-wrap gap-3 border-t border-kofkan-border pt-4">
              <Link href={`/account/returns?order=${order.id}`} className="text-sm font-medium text-kofkan-charcoal underline">
                Request a return
              </Link>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
