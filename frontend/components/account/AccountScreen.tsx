"use client";

import { useEffect, useState } from "react";
import { SkeletonBlock } from "@/components/StorefrontSkeletons";
import { AccountAuthForm } from "@/components/auth/AccountAuthForm";
import { AccountSignedInHub, type AccountPanel } from "@/components/account/AccountSignedInHub";
import { useAuth } from "@/context/AuthContext";
import { authPasswordResetRequest } from "@/lib/api/auth";
import { formatOAuthErrorParam } from "@/lib/oauth";
import { validateEmail } from "@/lib/validation/input";

export function AccountScreen({ initialPanel }: { initialPanel?: AccountPanel } = {}) {
  const { user, loading, accessToken } = useAuth();
  const [banner, setBanner] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [showPasswordRecovery, setShowPasswordRecovery] = useState(false);

  const [resetEmail, setResetEmail] = useState("");
  const [resetBusy, setResetBusy] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const msg = formatOAuthErrorParam(params.get("oauth_error"));
    if (!msg) return;
    setBanner({ type: "err", text: msg });
    const u = new URL(window.location.href);
    u.searchParams.delete("oauth_error");
    window.history.replaceState({}, "", `${u.pathname}${u.search}${u.hash}`);
  }, []);

  if (loading && !user) {
    return (
      <div className="mx-auto max-w-mobile space-y-4 px-5 py-8" aria-hidden>
        <SkeletonBlock className="h-6 w-32 rounded" />
        <SkeletonBlock className="h-4 w-3/4 rounded" />
        <div className="rounded-[12px] bg-white p-5 ring-1 ring-black/[0.06] dark:bg-zinc-900 dark:ring-white/10">
          <SkeletonBlock className="h-10 w-full rounded-[10px]" />
          <SkeletonBlock className="mt-3 h-10 w-full rounded-[10px]" />
          <SkeletonBlock className="mt-3 h-10 w-1/2 rounded-[10px]" />
        </div>
      </div>
    );
  }

  if (user && accessToken) {
    return <AccountSignedInHub initialPanel={initialPanel} />;
  }

  async function requestReset(e: React.FormEvent) {
    e.preventDefault();
    setResetBusy(true);
    setBanner(null);
    const err = validateEmail(resetEmail);
    if (err) {
      setBanner({ type: "err", text: err });
      setResetBusy(false);
      return;
    }
    try {
      await authPasswordResetRequest(resetEmail.trim());
      setBanner({
        type: "ok",
        text: "If an account exists for that email, you will receive a link to reset your password.",
      });
    } catch (err) {
      setBanner({ type: "err", text: err instanceof Error ? err.message : "Request failed" });
    } finally {
      setResetBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-mobile space-y-6 px-5 py-8">
      <div>
        <h1 className="font-display text-[1.35rem] font-semibold text-kofkan-text-primary dark:text-zinc-100">
          Account
        </h1>
        <p className="mt-1 text-small leading-relaxed text-kofkan-text-secondary dark:text-zinc-400">
          Sign in to shop, pay securely, and manage your profile.
        </p>
      </div>

      {banner && (
        <p
          className={`rounded-[10px] px-3 py-2.5 text-small ${
            banner.type === "ok"
              ? "bg-emerald-50 text-emerald-900 ring-1 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-100"
              : "bg-red-50 text-red-800 ring-1 ring-red-100 dark:bg-red-950/40 dark:text-red-100"
          }`}
        >
          {banner.text}
        </p>
      )}

      <section className="rounded-[12px] bg-white p-5 shadow-sm ring-1 ring-black/[0.06] dark:bg-zinc-900 dark:ring-white/10">
        <AccountAuthForm
          defaultMode="signin"
          onClearMessages={() => setBanner(null)}
          onForgotPassword={() => {
            setShowPasswordRecovery(true);
            setBanner(null);
          }}
          onSignInSuccess={() => setBanner({ type: "ok", text: "Signed in." })}
          onRegisterSuccess={() =>
            setBanner({
              type: "ok",
              text: "Account created. Sign in complete.",
            })
          }
        />
      </section>

      {showPasswordRecovery ? (
        <section className="space-y-4 rounded-[12px] bg-white p-5 shadow-sm ring-1 ring-black/[0.06] dark:bg-zinc-900 dark:ring-white/10">
          <div className="flex items-start justify-between gap-3">
            <h2 className="font-display text-section-title font-semibold text-kofkan-text-primary dark:text-zinc-100">
              Password recovery
            </h2>
            <button
              type="button"
              className="shrink-0 text-[11px] font-semibold text-kofkan-text-muted hover:text-kofkan-text-primary dark:text-zinc-500 dark:hover:text-zinc-300"
              onClick={() => {
                setShowPasswordRecovery(false);
                setBanner(null);
              }}
            >
              Close
            </button>
          </div>
          <p className="text-small leading-relaxed text-kofkan-text-secondary dark:text-zinc-400">
            We will email you a secure link (for example{" "}
            <span className="whitespace-nowrap text-kofkan-text-primary dark:text-zinc-200">
              …/reset-password/your-token
            </span>
            ). Open it on this device to choose a new password.
          </p>
          <form onSubmit={requestReset} className="space-y-3">
            <input
              type="email"
              required
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              placeholder="Your email"
              className="w-full rounded-[10px] border-0 bg-kofkan-cream py-2.5 px-3 text-body ring-1 ring-kofkan-gray-soft dark:bg-zinc-800 dark:text-zinc-100 dark:ring-white/10"
            />
            <button
              type="submit"
              disabled={resetBusy}
              className="w-full rounded-[10px] bg-kofkan-text-primary py-2.5 text-small font-semibold text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
            >
              {resetBusy ? "Sending…" : "Send reset link"}
            </button>
          </form>
        </section>
      ) : null}
    </div>
  );
}
