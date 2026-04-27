"use client";

import Link from "next/link";
import { useState } from "react";
import { authPasswordResetConfirm } from "@/lib/api/auth";
import { validatePassword } from "@/lib/validation/input";

function PasswordInputWithToggle({
  id,
  label,
  value,
  onChange,
  autoComplete,
  minLength,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: string;
  minLength: number;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div>
      <label htmlFor={id} className="text-small font-medium text-kofkan-text-primary dark:text-zinc-200">
        {label}
      </label>
      <div className="relative mt-1">
        <input
          id={id}
          type={visible ? "text" : "password"}
          required
          minLength={minLength}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          className="w-full rounded-[10px] border-0 bg-white py-3 pl-3 pr-12 text-body ring-1 ring-kofkan-gray-soft focus:ring-2 focus:ring-kofkan-gold/40 dark:bg-zinc-800 dark:text-zinc-100 dark:ring-white/10"
        />
        <button
          type="button"
          className="kofkan-tap-static absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg text-kofkan-text-muted hover:bg-black/[0.04] active:bg-black/[0.06] dark:text-zinc-500 dark:hover:bg-white/10 dark:hover:text-zinc-200 dark:active:bg-white/15"
          aria-label={visible ? "Hide password" : "Show password"}
          onClick={() => setVisible((v) => !v)}
        >
          {visible ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 10-4.24-4.24"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path d="M1 1l22 22" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinejoin="round"
              />
              <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.75" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const pwErr = validatePassword(password, 8);
    if (pwErr) {
      setMsg({ ok: false, text: pwErr });
      return;
    }
    if (password !== confirm) {
      setMsg({ ok: false, text: "Passwords do not match." });
      return;
    }
    const t = token.trim();
    if (!t) {
      setMsg({ ok: false, text: "Invalid reset link." });
      return;
    }
    setBusy(true);
    try {
      await authPasswordResetConfirm(t, password);
      setMsg({ ok: true, text: "Your password was updated. You can sign in now." });
      setPassword("");
      setConfirm("");
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : "Reset failed" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <p className="text-small leading-relaxed text-kofkan-text-secondary dark:text-zinc-400">
        Choose a new password for your account. This link expires after a short time.
      </p>
      {msg && (
        <p
          className={`rounded-[10px] px-3 py-2.5 text-small ${
            msg.ok
              ? "bg-emerald-50 text-emerald-900 ring-1 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-100"
              : "bg-red-50 text-red-800 ring-1 ring-red-100 dark:bg-red-950/40 dark:text-red-100"
          }`}
        >
          {msg.text}
        </p>
      )}
      {msg?.ok ? (
        <Link
          href="/account"
          className="kofkan-btn-gold kofkan-tap inline-flex w-full items-center justify-center rounded-[10px] py-3 text-center text-small font-semibold text-white"
        >
          Go to sign in
        </Link>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <PasswordInputWithToggle
            id="reset-pw"
            label="New password"
            value={password}
            onChange={setPassword}
            autoComplete="new-password"
            minLength={8}
          />
          <PasswordInputWithToggle
            id="reset-pw2"
            label="Confirm new password"
            value={confirm}
            onChange={setConfirm}
            autoComplete="new-password"
            minLength={8}
          />
          <button
            type="submit"
            disabled={busy}
            className="kofkan-btn-gold kofkan-tap w-full rounded-[10px] py-3 text-small font-semibold text-white disabled:opacity-60"
          >
            {busy ? "Saving…" : "Update password"}
          </button>
        </form>
      )}
    </div>
  );
}
