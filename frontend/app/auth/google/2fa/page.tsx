"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ScreenHeader } from "@/components/ScreenHeader";
import { authGoogleOAuthVerify2FA } from "@/lib/api/auth";
import { writeTokens } from "@/lib/auth-storage";
import { sanitizeDigits, validateOtpCode } from "@/lib/validation/input";

export default function GoogleOAuth2FAPage() {
  const router = useRouter();
  const [pendingToken, setPendingToken] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const hash = typeof window !== "undefined" ? window.location.hash.replace(/^#/, "") : "";
    const params = new URLSearchParams(hash);
    const tok = params.get("pending_2fa_token");
    setPendingToken(tok);
    if (!tok) {
      setError("Missing Google sign-in session. Start again from Sign in with Google.");
    }
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!pendingToken) return;
    const digits = sanitizeDigits(code, 6);
    const err = validateOtpCode(digits, 6);
    if (err) {
      setError(err);
      return;
    }
    setBusy(true);
    try {
      const tokens = await authGoogleOAuthVerify2FA(pendingToken, digits);
      try {
        writeTokens(tokens.access_token, tokens.refresh_token ?? null, "local");
        window.dispatchEvent(new Event("kofkan-auth-storage-updated"));
      } catch {
        /* ignore */
      }
      router.replace("/account");
    } catch (ex) {
      setError(ex instanceof Error ? ex.message : "Verification failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="bg-kofkan-cream dark:bg-zinc-950">
      <ScreenHeader variant="inner" title="Two-factor verification" left="back" backHref="/account" right="none" />
      <div className="mx-auto max-w-mobile space-y-5 px-5 py-8">
        <p className="text-small leading-relaxed text-kofkan-text-secondary dark:text-zinc-400">
          Your account has authenticator (TOTP) protection. Enter the 6-digit code from your app to finish signing
          in with Google.
        </p>

        {error && (
          <p className="rounded-[10px] bg-red-50 px-3 py-2.5 text-small text-red-800 ring-1 ring-red-100 dark:bg-red-950/40 dark:text-red-100">
            {error}
          </p>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label htmlFor="google-oauth-totp" className="text-small font-medium text-kofkan-text-primary dark:text-zinc-200">
              Authentication code
            </label>
            <input
              id="google-oauth-totp"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              disabled={!pendingToken}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="mt-1 w-full rounded-[10px] border-0 bg-white py-3 px-3 text-body tracking-widest ring-1 ring-kofkan-gray-soft focus:ring-2 focus:ring-kofkan-gold/40 disabled:opacity-50 dark:bg-zinc-800 dark:text-zinc-100 dark:ring-white/10"
              placeholder="000000"
            />
          </div>
          <button
            type="submit"
            disabled={busy || !pendingToken}
            className="kofkan-btn-gold kofkan-tap w-full rounded-[10px] py-3 text-small font-semibold text-white disabled:opacity-60"
          >
            {busy ? "Please wait…" : "Verify and continue"}
          </button>
        </form>

        <p className="text-center text-small text-kofkan-text-muted dark:text-zinc-500">
          <Link href="/account" className="font-semibold text-kofkan-gold hover:underline">
            Back to account sign-in
          </Link>
        </p>
      </div>
    </main>
  );
}
