"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { SkeletonBlock } from "@/components/StorefrontSkeletons";

import { useAppSession } from "@/components/Providers";
import { createReturn, fetchMyReturns, type OrderReturn } from "@/lib/api/returns";

function formatWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}

function ReturnsContent() {
  const { token } = useAppSession();
  const searchParams = useSearchParams();
  const presetOrder = searchParams.get("order");
  const [returns, setReturns] = useState<OrderReturn[]>([]);
  const [orderId, setOrderId] = useState(presetOrder ?? "");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const load = async () => {
      if (!token) {
        setReturns([]);
        return;
      }
      try {
        setReturns(await fetchMyReturns(token));
      } catch {
        setReturns([]);
      }
    };
    void load();
  }, [token]);

  const submit = async () => {
    if (!token) {
      setMessage("Sign in first.");
      return;
    }
    const id = Number(orderId);
    if (!Number.isFinite(id) || id <= 0) {
      setMessage("Enter a valid order number.");
      return;
    }
    if (reason.trim().length < 3) {
      setMessage("Describe the reason (at least 3 characters).");
      return;
    }
    try {
      await createReturn(token, id, reason.trim());
      setReason("");
      setMessage("Return request submitted.");
      setReturns(await fetchMyReturns(token));
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Request failed");
    }
  };

  if (!token) {
    return (
      <main className="kofkan-shell py-10">
        <p className="text-kofkan-muted">Sign in to manage returns.</p>
        <Link href="/auth/login" className="mt-4 inline-block font-semibold underline">
          Login
        </Link>
      </main>
    );
  }

  return (
    <main className="kofkan-shell py-10">
      <Link href="/account" className="text-sm text-kofkan-muted hover:underline">
        ← Account
      </Link>
      <h1 className="mt-4 text-3xl font-bold">Returns</h1>
      <p className="mt-2 text-kofkan-muted">Open a return for a recent order. Our team will follow up by email.</p>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <div className="rounded-2xl border border-kofkan-border p-5">
          <h2 className="font-semibold">New request</h2>
          <label className="mt-4 block text-xs font-medium text-kofkan-muted">
            Order ID
            <input
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-kofkan-border px-3 py-2"
              placeholder="e.g. 12"
            />
          </label>
          <label className="mt-3 block text-xs font-medium text-kofkan-muted">
            Reason
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-1 min-h-[100px] w-full rounded-lg border border-kofkan-border px-3 py-2"
              placeholder="Wrong item, defective, etc."
            />
          </label>
          <button
            type="button"
            onClick={() => void submit()}
            className="mt-4 rounded-xl bg-kofkan-black px-4 py-2.5 text-sm font-semibold text-kofkan-white"
          >
            Submit request
          </button>
          {message ? <p className="mt-3 text-sm text-kofkan-muted">{message}</p> : null}
        </div>
        <div>
          <h2 className="font-semibold">Your requests</h2>
          <ul className="mt-4 space-y-3">
            {returns.map((r) => (
              <li key={r.id} className="rounded-xl border border-kofkan-border bg-kofkan-bg-secondary p-4 text-sm">
                <p className="font-medium">Order #{r.order_id}</p>
                <p className="mt-1 text-kofkan-muted">{r.reason}</p>
                    <div className="mt-2 space-y-1">
                      <p className="text-xs capitalize text-kofkan-charcoal">Status: {r.status}</p>
                      <p className="text-xs text-kofkan-muted">
                        Outcome: <span className="font-medium text-kofkan-text-primary">{r.preferred_outcome}</span>
                      </p>
                      {r.resolved_at ? (
                        <p className="text-xs text-kofkan-muted">
                          Resolved: <span className="font-medium text-kofkan-text-primary">{formatWhen(r.resolved_at)}</span>
                        </p>
                      ) : null}
                      {r.admin_notes ? (
                        <p className="text-xs text-kofkan-muted">
                          Update: <span className="font-medium text-kofkan-text-primary">{r.admin_notes}</span>
                        </p>
                      ) : null}
                    </div>
              </li>
            ))}
          </ul>
          {returns.length === 0 ? <p className="mt-4 text-sm text-kofkan-muted">No return requests yet.</p> : null}
        </div>
      </div>
    </main>
  );
}

export default function ReturnsPage() {
  return (
    <Suspense
      fallback={
        <main className="kofkan-shell py-10" aria-hidden>
          <div className="space-y-3">
            <SkeletonBlock className="h-6 w-28 rounded" />
            <SkeletonBlock className="h-24 w-full rounded-[12px]" />
            <SkeletonBlock className="h-24 w-full rounded-[12px]" />
          </div>
        </main>
      }
    >
      <ReturnsContent />
    </Suspense>
  );
}
