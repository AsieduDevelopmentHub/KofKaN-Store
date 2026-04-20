"use client";

import { CreditCard, ExternalLink, RefreshCw } from "lucide-react";
import { useState } from "react";

import { initializePayment, verifyPayment } from "@/lib/api/payments";

type PaymentActionsProps = {
  token: string;
  orderId: number;
  compact?: boolean;
  onStatusChange?: () => void;
};

export function PaymentActions({ token, orderId, compact = false, onStatusChange }: PaymentActionsProps) {
  const [reference, setReference] = useState<string | null>(null);
  const [authUrl, setAuthUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const runInit = async () => {
    setBusy(true);
    setMessage("");
    try {
      const res = await initializePayment(token, orderId);
      setReference(res.reference);
      setAuthUrl(res.authorization_url);
      setStatus(res.status);
      setMessage("Payment initialized. Open the checkout link or verify after paying.");
      onStatusChange?.();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not start payment");
    } finally {
      setBusy(false);
    }
  };

  const runVerify = async () => {
    if (!reference) {
      setMessage("Initialize payment first.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const res = await verifyPayment(token, reference);
      setStatus(res.status);
      setMessage(`Verified: ${res.status}`);
      onStatusChange?.();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Verification failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={compact ? "space-y-2" : "space-y-3 rounded-xl border border-kofkan-border bg-kofkan-white p-4"}>
      {!compact ? <p className="text-sm font-semibold text-kofkan-black">Payment</p> : null}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void runInit()}
          className="inline-flex items-center gap-2 rounded-lg bg-kofkan-black px-3 py-2 text-sm font-semibold text-kofkan-white disabled:opacity-60"
        >
          <CreditCard className="h-4 w-4" />
          {busy ? "Working…" : "Initialize payment"}
        </button>
        <button
          type="button"
          disabled={busy || !reference}
          onClick={() => void runVerify()}
          className="inline-flex items-center gap-2 rounded-lg border border-kofkan-border px-3 py-2 text-sm font-semibold disabled:opacity-60"
        >
          <RefreshCw className="h-4 w-4" />
          Verify status
        </button>
      </div>
      {authUrl ? (
        <a
          href={authUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm font-medium text-kofkan-charcoal underline"
        >
          Open checkout <ExternalLink className="h-3.5 w-3.5" />
        </a>
      ) : null}
      {reference ? <p className="text-xs text-kofkan-muted">Reference: {reference}</p> : null}
      {status ? <p className="text-xs font-medium text-kofkan-charcoal">Status: {status}</p> : null}
      {message ? <p className="text-xs text-kofkan-muted">{message}</p> : null}
    </div>
  );
}
