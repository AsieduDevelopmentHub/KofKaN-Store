"use client";

import Image from "next/image";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { authTwoFaDisable, authTwoFaEnable, authTwoFaSetup } from "@/lib/api/auth";

export function AccountTwoFactorPanel() {
  const { accessToken, user, refreshProfile } = useAuth();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [setup, setSetup] = useState<{
    secret: string;
    qr_code: string;
    backup_codes: string[];
  } | null>(null);
  const [code, setCode] = useState("");
  const [disablePassword, setDisablePassword] = useState("");

  if (!accessToken || !user) return null;
  const token = accessToken;

  async function startSetup() {
    setErr(null);
    setMsg(null);
    setBusy(true);
    try {
      const data = await authTwoFaSetup(token);
      setSetup(data);
      setCode("");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not start 2FA setup");
    } finally {
      setBusy(false);
    }
  }

  async function confirmEnable() {
    if (!setup) return;
    setErr(null);
    setMsg(null);
    setBusy(true);
    try {
      await authTwoFaEnable(token, {
        secret: setup.secret,
        backup_codes: setup.backup_codes,
        verification_code: code.trim(),
      });
      setMsg("Two-factor authentication is on. Store your backup codes safely.");
      setSetup(null);
      setCode("");
      await refreshProfile();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Invalid code or enable failed");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setErr(null);
    setMsg(null);
    setBusy(true);
    try {
      await authTwoFaDisable(token, disablePassword);
      setMsg("2FA has been turned off.");
      setDisablePassword("");
      await refreshProfile();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not disable 2FA");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-[12px] bg-white p-5 shadow-sm ring-1 ring-black/[0.06]">
      <h2 className="font-display text-section-title font-semibold text-kofkan-text-primary">
        Two-factor authentication
      </h2>
      <p className="mt-1 text-small text-kofkan-text-secondary">
        Use an authenticator app for an extra sign-in step with a rotating code.
      </p>

      {(msg || err) && (
        <p
          className={`mt-3 rounded-[10px] px-3 py-2 text-small ${
            err ? "bg-red-50 text-red-800 ring-1 ring-red-100" : "bg-emerald-50 text-emerald-900 ring-1 ring-emerald-100"
          }`}
        >
          {err ?? msg}
        </p>
      )}

      {user.two_fa_enabled ? (
        <div className="mt-4 space-y-3">
          <p className="text-small font-medium text-kofkan-text-primary">2FA is enabled ({user.two_fa_method ?? "totp"}).</p>
          <div>
            <label htmlFor="twofa-disable-pw" className="text-small font-medium text-kofkan-text-primary">
              Password to turn off 2FA
            </label>
            <input
              id="twofa-disable-pw"
              type="password"
              value={disablePassword}
              onChange={(e) => setDisablePassword(e.target.value)}
              className="mt-1 w-full rounded-[10px] border-0 bg-kofkan-gray-soft py-2.5 px-3 text-body ring-1 ring-kofkan-gray-soft focus:ring-2 focus:ring-kofkan-gold/40"
              autoComplete="current-password"
            />
          </div>
          <button
            type="button"
            disabled={busy || !disablePassword}
            className="kofkan-tap rounded-[10px] border border-kofkan-crimson/40 py-2.5 px-4 text-small font-semibold text-kofkan-crimson disabled:opacity-50"
            onClick={() => void disable()}
          >
            {busy ? "Please wait…" : "Turn off 2FA"}
          </button>
        </div>
      ) : setup ? (
        <div className="mt-4 space-y-3">
          <p className="text-small text-kofkan-text-secondary">
            Scan this QR in your authenticator app, then enter the 6-digit code to confirm.
          </p>
          <div className="mx-auto w-44 overflow-hidden rounded-lg bg-white p-2 ring-1 ring-black/[0.08]">
            <Image
              src={setup.qr_code.startsWith("data:") ? setup.qr_code : `data:image/png;base64,${setup.qr_code}`}
              alt="Authenticator QR"
              width={176}
              height={176}
              unoptimized
              className="h-auto w-full object-contain"
            />
          </div>
          <p className="break-all font-mono text-[11px] text-kofkan-text-muted">Secret: {setup.secret}</p>
          <p className="text-[11px] text-kofkan-text-muted">
            Backup codes (save once): {setup.backup_codes.join(", ")}
          </p>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            inputMode="numeric"
            placeholder="6-digit code"
            className="w-full rounded-[10px] border-0 bg-kofkan-gray-soft py-2.5 px-3 text-body ring-1 ring-kofkan-gray-soft focus:ring-2 focus:ring-kofkan-gold/40"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy || code.length !== 6}
              className="kofkan-btn-gold kofkan-tap rounded-[10px] py-2.5 px-4 text-small font-semibold text-white disabled:opacity-50"
              onClick={() => void confirmEnable()}
            >
              Confirm & enable
            </button>
            <button
              type="button"
              className="kofkan-tap rounded-[10px] py-2.5 px-4 text-small font-semibold text-kofkan-text-secondary"
              onClick={() => {
                setSetup(null);
                setErr(null);
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={busy}
          className="mt-4 kofkan-btn-gold kofkan-tap rounded-[10px] py-2.5 px-4 text-small font-semibold text-white disabled:opacity-50"
          onClick={() => void startSetup()}
        >
          {busy ? "Please wait…" : "Set up authenticator app"}
        </button>
      )}
    </section>
  );
}
