"use client";

import { useEffect } from "react";
import { AccountAuthForm } from "@/components/auth/AccountAuthForm";

type Props = {
  open: boolean;
  onDismiss: () => void;
  onAuthenticated: () => void;
};

export function CartAuthModal({ open, onDismiss, onAuthenticated }: Props) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-labelledby="cart-auth-title">
      <button
        type="button"
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px] dark:bg-black/60"
        aria-label="Close"
        onClick={onDismiss}
      />
      <div className="relative z-[1] w-full max-w-mobile rounded-t-[16px] bg-kofkan-cream px-5 pb-[max(1.5rem,var(--safe-bottom))] pt-5 shadow-[0_-8px_32px_rgba(0,0,0,0.12)] ring-1 ring-black/[0.04] dark:bg-zinc-900 dark:shadow-[0_-8px_40px_rgba(0,0,0,0.5)] dark:ring-white/10 sm:mx-4 sm:max-h-[min(90vh,640px)] sm:overflow-y-auto sm:rounded-[16px] sm:pb-6">
        <div
          className="mx-auto mb-4 h-1 w-10 rounded-full bg-kofkan-gray-soft dark:bg-zinc-600 sm:hidden"
          aria-hidden
        />
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2
              id="cart-auth-title"
              className="font-display text-section-title font-semibold text-kofkan-text-primary dark:text-zinc-100"
            >
              Sign in to use your cart
            </h2>
            <p className="mt-1 text-small leading-relaxed text-kofkan-text-secondary dark:text-zinc-400">
              Create a free account or sign in to add items. Your cart stays on this device after you sign in.
            </p>
          </div>
          <button
            type="button"
            className="kofkan-tap shrink-0 rounded-full p-2 text-kofkan-text-muted hover:bg-white/80 dark:text-zinc-400 dark:hover:bg-white/10"
            aria-label="Close"
            onClick={onDismiss}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="mt-5">
          <AccountAuthForm
            defaultMode="register"
            onClearMessages={() => {}}
            onSignInSuccess={onAuthenticated}
            onRegisterSuccess={onAuthenticated}
          />
        </div>
      </div>
    </div>
  );
}
