"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AccountTwoFactorPanel } from "@/components/account/AccountTwoFactorPanel";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import {
  authChangePassword,
  authDeleteAccount,
  authResendEmailVerification,
  authUpdateProfile,
  authVerifyEmail,
} from "@/lib/api/auth";
import { newsletterSubscribe, newsletterUnsubscribe } from "@/lib/api/subscriptions";
import {
  GHANA_CITY_OTHER,
  GHANA_REGIONS,
  citiesForRegion,
  splitCityForRegion,
} from "@/lib/ghana-shipping";
import { formatGhs } from "@/lib/mock-data";
import {
  sanitizeDigits,
  sanitizePlainText,
  validateEmail,
  validatePassword,
  validatePhoneOptional,
} from "@/lib/validation/input";

export type AccountPanel =
  | "home"
  | "settings"
  | "address"
  | "appearance"
  | "security"
  | "notifications"
  | "verify"
  | "newsletter"
  | "danger";

type Panel = AccountPanel;

function NavRow({
  label,
  hint,
  onClick,
}: {
  label: string;
  hint?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="kofkan-tap flex w-full items-center justify-between gap-3 rounded-[12px] bg-white px-4 py-3.5 text-left shadow-sm ring-1 ring-black/[0.06] dark:bg-zinc-900 dark:ring-white/10"
    >
      <span>
        <span className="block text-small font-semibold text-kofkan-text-primary dark:text-zinc-100">{label}</span>
        {hint ? (
          <span className="mt-0.5 block text-small text-kofkan-text-muted dark:text-zinc-500">{hint}</span>
        ) : null}
      </span>
      <span className="text-kofkan-text-muted dark:text-zinc-500" aria-hidden>
        ›
      </span>
    </button>
  );
}

export function AccountSignedInHub({ initialPanel }: { initialPanel?: AccountPanel } = {}) {
  const { user, accessToken, logout, refreshProfile } = useAuth();
  const { preference, setPreference } = useTheme();
  const [panel, setPanel] = useState<Panel>(initialPanel ?? "home");
  const [banner, setBanner] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [profileBusy, setProfileBusy] = useState(false);
  const [shipRegion, setShipRegion] = useState("");
  const [cityPick, setCityPick] = useState(
    () => citiesForRegion(GHANA_REGIONS[0]?.slug ?? "greater-accra")[0] ?? GHANA_CITY_OTHER,
  );
  const [cityOther, setCityOther] = useState("");
  const [shipLine1, setShipLine1] = useState("");
  const [shipLine2, setShipLine2] = useState("");
  const [shipLandmark, setShipLandmark] = useState("");
  const [shipContactName, setShipContactName] = useState("");
  const [shipContactPhone, setShipContactPhone] = useState("");
  const [shipBusy, setShipBusy] = useState(false);
  const [addressFormOpen, setAddressFormOpen] = useState(false);
  const [showInlineEmailVerify, setShowInlineEmailVerify] = useState(false);
  const [inlineVerifyCode, setInlineVerifyCode] = useState("");
  const [inlineVerifyBusy, setInlineVerifyBusy] = useState(false);

  const [curPw, setCurPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [newPwConfirm, setNewPwConfirm] = useState("");
  const [pwBusy, setPwBusy] = useState(false);

  const [inboxEmail, setInboxEmail] = useState("");
  const [inboxCode, setInboxCode] = useState("");
  const [inboxBusy, setInboxBusy] = useState(false);
  const [resendBusy, setResendBusy] = useState(false);

  const [newsEmail, setNewsEmail] = useState("");
  const [newsBusy, setNewsBusy] = useState(false);
  const [newsMarketing, setNewsMarketing] = useState(false);

  const [delPw, setDelPw] = useState("");
  const [delBusy, setDelBusy] = useState(false);

  const token = accessToken as string;
  const u = user!;

  const hasSavedAddress = useMemo(
    () =>
      !!(u.shipping_region?.trim() && u.shipping_city?.trim() && u.shipping_address_line1?.trim()),
    [u.shipping_region, u.shipping_city, u.shipping_address_line1],
  );

  useEffect(() => {
    if (panel !== "address") return;
    setAddressFormOpen(!hasSavedAddress);
  }, [panel, hasSavedAddress]);

  useEffect(() => {
    setName(u.name ?? "");
    setUsername(u.username ?? "");
    setProfileEmail(u.email ?? "");
    setPhone(u.phone ?? "");
    const regRaw = u.shipping_region?.trim();
    const reg =
      regRaw && GHANA_REGIONS.some((r) => r.slug === regRaw)
        ? regRaw
        : GHANA_REGIONS[0]?.slug ?? "greater-accra";
    setShipRegion(reg);
    const { pick, other } = splitCityForRegion(reg, u.shipping_city);
    setCityPick(pick);
    setCityOther(other);
    setShipLine1(u.shipping_address_line1 ?? "");
    setShipLine2(u.shipping_address_line2 ?? "");
    setShipLandmark(u.shipping_landmark ?? "");
    setShipContactName(u.shipping_contact_name ?? u.name ?? "");
    setShipContactPhone(u.shipping_contact_phone ?? u.phone ?? "");
    if (!u.email_verified && u.email && !u.email_is_placeholder) setInboxEmail(u.email);
  }, [u]);

  const displayName = (u.name || "").trim() || u.username || u.email || "User";

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setBanner(null);
    const phoneErr = validatePhoneOptional(phone);
    if (phoneErr) {
      setBanner({ type: "err", text: phoneErr });
      return;
    }
    const em = profileEmail.trim();
    if (em) {
      const emailErr = validateEmail(em);
      if (emailErr) {
        setBanner({ type: "err", text: emailErr });
        return;
      }
    }
    setProfileBusy(true);
    try {
      const updated = await authUpdateProfile(token, {
        name: sanitizePlainText(name, 120) || null,
        username: sanitizePlainText(username, 50)?.toLowerCase() || null,
        phone: phone.trim() || null,
        email: em || null,
      });
      await refreshProfile();
      setBanner({ type: "ok", text: "Profile updated." });
      if (updated.email && !updated.email_verified && !updated.email_is_placeholder) {
        setShowInlineEmailVerify(true);
        setInlineVerifyCode("");
        setInboxEmail(updated.email);
      } else {
        setShowInlineEmailVerify(false);
      }
    } catch (err) {
      setBanner({ type: "err", text: err instanceof Error ? err.message : "Update failed" });
    } finally {
      setProfileBusy(false);
    }
  }

  async function changePw(e: React.FormEvent) {
    e.preventDefault();
    setBanner(null);
    const err = validatePassword(newPw, 8);
    if (err) {
      setBanner({ type: "err", text: err });
      return;
    }
    if (newPw !== newPwConfirm) {
      setBanner({ type: "err", text: "New passwords do not match." });
      return;
    }
    setPwBusy(true);
    try {
      await authChangePassword(token, curPw, newPw);
      setCurPw("");
      setNewPw("");
      setNewPwConfirm("");
      setBanner({ type: "ok", text: "Password updated." });
    } catch (err) {
      setBanner({ type: "err", text: err instanceof Error ? err.message : "Could not change password" });
    } finally {
      setPwBusy(false);
    }
  }

  async function verifySignedIn(e: React.FormEvent) {
    e.preventDefault();
    setBanner(null);
    const em = inboxEmail.trim() || u.email || "";
    const emailErr = validateEmail(em);
    if (emailErr) {
      setBanner({ type: "err", text: emailErr });
      return;
    }
    const code = sanitizeDigits(inboxCode, 12);
    if (code.length < 6) {
      setBanner({ type: "err", text: "Enter the verification code from your email." });
      return;
    }
    setInboxBusy(true);
    try {
      await authVerifyEmail(em, code);
      setInboxCode("");
      await refreshProfile();
      setBanner({ type: "ok", text: "Email verified." });
      setPanel("home");
    } catch (err) {
      setBanner({ type: "err", text: err instanceof Error ? err.message : "Verification failed" });
    } finally {
      setInboxBusy(false);
    }
  }

  async function delAccount(e: React.FormEvent) {
    e.preventDefault();
    setBanner(null);
    setDelBusy(true);
    try {
      await authDeleteAccount(token, delPw);
      setDelPw("");
      await logout();
      setBanner({ type: "ok", text: "Your account has been closed." });
    } catch (err) {
      setBanner({ type: "err", text: err instanceof Error ? err.message : "Could not delete account" });
    } finally {
      setDelBusy(false);
    }
  }

  async function saveShippingProfile(e: React.FormEvent) {
    e.preventDefault();
    setBanner(null);
    const cityEff = (cityPick === GHANA_CITY_OTHER ? cityOther : cityPick).trim();
    if (!shipRegion.trim() || !cityEff || !shipLine1.trim()) {
      setBanner({ type: "err", text: "Region, city, and address line 1 are required." });
      return;
    }
    setShipBusy(true);
    try {
      await authUpdateProfile(token, {
        shipping_region: sanitizePlainText(shipRegion, 80) || null,
        shipping_city: sanitizePlainText(cityEff, 120) || null,
        shipping_address_line1: sanitizePlainText(shipLine1, 255) || null,
        shipping_address_line2: sanitizePlainText(shipLine2, 255) || null,
        shipping_landmark: sanitizePlainText(shipLandmark, 255) || null,
        shipping_contact_name: sanitizePlainText(shipContactName, 120) || null,
        shipping_contact_phone: sanitizePlainText(shipContactPhone, 32) || null,
      });
      await refreshProfile();
      setBanner({ type: "ok", text: "Shipping profile updated." });
      setAddressFormOpen(false);
    } catch (err) {
      setBanner({ type: "err", text: err instanceof Error ? err.message : "Could not save shipping profile" });
    } finally {
      setShipBusy(false);
    }
  }

  async function clearShippingProfile() {
    setBanner(null);
    setShipBusy(true);
    try {
      await authUpdateProfile(token, {
        shipping_region: "",
        shipping_city: "",
        shipping_address_line1: "",
        shipping_address_line2: "",
        shipping_landmark: "",
        shipping_contact_name: "",
        shipping_contact_phone: "",
      });
      await refreshProfile();
      const list = citiesForRegion(GHANA_REGIONS[0]?.slug ?? "greater-accra");
      setCityPick(list[0] ?? GHANA_CITY_OTHER);
      setCityOther("");
      setAddressFormOpen(true);
      setBanner({ type: "ok", text: "Shipping profile cleared." });
    } catch (err) {
      setBanner({ type: "err", text: err instanceof Error ? err.message : "Could not clear shipping profile" });
    } finally {
      setShipBusy(false);
    }
  }

  if (!user || !accessToken) return null;

  return (
    <div className="mx-auto max-w-mobile space-y-4 px-5 py-8 text-body">
      {banner && (
        <p
          className={`rounded-[10px] px-3 py-2.5 text-small ${
            banner.type === "ok"
              ? "bg-emerald-50 text-emerald-900 ring-1 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-100 dark:ring-emerald-800"
              : "bg-red-50 text-red-800 ring-1 ring-red-100 dark:bg-red-950/40 dark:text-red-100 dark:ring-red-900"
          }`}
        >
          {banner.text}
        </p>
      )}

      {panel !== "home" && (
        <button
          type="button"
          className="kofkan-tap text-small font-semibold text-kofkan-gold"
          onClick={() => {
            setPanel("home");
            setBanner(null);
          }}
        >
          ← Back
        </button>
      )}

      {panel === "home" && (
        <>
          <section className="rounded-[12px] bg-white p-5 shadow-sm ring-1 ring-black/[0.06] dark:bg-zinc-900 dark:ring-white/10">
            <p className="text-small font-semibold uppercase tracking-wider text-kofkan-text-muted">Signed in as</p>
            <h1 className="mt-1 font-display text-page-title font-semibold text-kofkan-text-primary dark:text-zinc-100">
              {displayName}
            </h1>
            <p className="mt-0.5 text-small text-kofkan-text-secondary">
              @{u.username}
              {u.email ? ` · ${u.email}` : ""}
              {u.email_is_placeholder ? (
                <span className="ml-1 text-kofkan-text-muted">(payment-only — add a real email in Profile)</span>
              ) : null}
            </p>
            <p className="mt-2 text-small text-kofkan-text-secondary">
              Email{" "}
              <span className="font-semibold text-kofkan-text-primary dark:text-zinc-100">
                {u.email_is_placeholder
                  ? "payment-only (no inbox)"
                  : u.email_verified
                    ? "verified"
                    : "not verified yet"}
              </span>
            </p>
          </section>

          <div className="space-y-2">
            <NavRow
              label="Profile & settings"
              hint="Name, username, email, phone"
              onClick={() => setPanel("settings")}
            />
            <NavRow
              label="Address & contact"
              hint="Default shipping details for faster checkout"
              onClick={() => setPanel("address")}
            />
            <NavRow label="Appearance" hint="Light, dark, or system" onClick={() => setPanel("appearance")} />
            <NavRow label="Security" hint="Password and two-step sign-in" onClick={() => setPanel("security")} />
            <NavRow label="Notifications" hint="How we reach you" onClick={() => setPanel("notifications")} />
            {!!u.email && !u.email_verified && !u.email_is_placeholder && (
              <NavRow label="Verify email" hint="Enter the code we sent you" onClick={() => setPanel("verify")} />
            )}
            <NavRow label="Newsletter" hint="Offers and updates" onClick={() => setPanel("newsletter")} />
            <Link
              href="/help"
              className="kofkan-tap block rounded-[12px] bg-white px-4 py-3.5 text-small font-semibold text-kofkan-text-primary shadow-sm ring-1 ring-black/[0.06] dark:bg-zinc-900 dark:text-zinc-100 dark:ring-white/10"
            >
              Help center
            </Link>
            <Link
              href="/help/contact"
              className="kofkan-tap block rounded-[12px] bg-white px-4 py-3.5 text-small font-semibold text-kofkan-text-primary shadow-sm ring-1 ring-black/[0.06] dark:bg-zinc-900 dark:text-zinc-100 dark:ring-white/10"
            >
              Contact support
            </Link>
            <NavRow label="Close account" hint="Permanent" onClick={() => setPanel("danger")} />
          </div>

          {accessToken && u.is_admin === true ? (
            <Link
              href="/system"
              className="block rounded-[12px] bg-kofkan-text-primary px-5 py-4 text-center text-small font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900"
            >
              Admin dashboard
            </Link>
          ) : null}

          <button
            type="button"
            className="w-full rounded-[12px] border border-kofkan-gray-soft bg-white py-3 text-small font-semibold text-kofkan-text-primary dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-100"
            onClick={() => logout()}
          >
            Sign out
          </button>
        </>
      )}

      {panel === "settings" && (
        <section className="rounded-[12px] bg-white p-5 shadow-sm ring-1 ring-black/[0.06] dark:bg-zinc-900 dark:ring-white/10">
          <h2 className="font-display text-section-title font-semibold text-kofkan-text-primary dark:text-zinc-100">
            Profile
          </h2>
          <form onSubmit={saveProfile} className="mt-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-small font-medium text-kofkan-text-primary dark:text-zinc-200" htmlFor="hub-name">
                  Name
                </label>
                <input
                  id="hub-name"
                  value={name}
                  maxLength={80}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full rounded-[10px] border-0 bg-kofkan-cream py-2.5 px-3 text-body ring-1 ring-kofkan-gray-soft dark:bg-zinc-800 dark:text-zinc-100 dark:ring-white/10"
                />
              </div>
              <div>
                <label className="text-small font-medium text-kofkan-text-primary dark:text-zinc-200" htmlFor="hub-username">
                  Username
                </label>
                <input
                  id="hub-username"
                  value={username}
                  maxLength={80}
                  onChange={(e) => setUsername(e.target.value.toLowerCase())}
                  className="mt-1 w-full rounded-[10px] border-0 bg-kofkan-cream py-2.5 px-3 text-body ring-1 ring-kofkan-gray-soft dark:bg-zinc-800 dark:text-zinc-100 dark:ring-white/10"
                />
              </div>
            </div>
            <div>
              <label className="text-small font-medium text-kofkan-text-primary dark:text-zinc-200" htmlFor="hub-email">
                Email
              </label>
              <input
                id="hub-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                value={profileEmail}
                placeholder="you@example.com"
                onChange={(e) => setProfileEmail(e.target.value)}
                className="mt-1 w-full rounded-[10px] border-0 bg-kofkan-cream py-2.5 px-3 text-body ring-1 ring-kofkan-gray-soft dark:bg-zinc-800 dark:text-zinc-100 dark:ring-white/10"
              />
              <p className="mt-1.5 text-small text-kofkan-text-secondary dark:text-zinc-400">
                Optional for sign-in. Use a real address for order updates; payment can use an automatic placeholder if you
                leave this blank. After you add or change a real email, we send a 6-digit code — enter it below.
              </p>
            </div>
            <div>
              <label className="text-small font-medium text-kofkan-text-primary dark:text-zinc-200" htmlFor="hub-ph">
                Phone
              </label>
              <input
                id="hub-ph"
                value={phone}
                maxLength={24}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1 w-full rounded-[10px] border-0 bg-kofkan-cream py-2.5 px-3 text-body ring-1 ring-kofkan-gray-soft dark:bg-zinc-800 dark:text-zinc-100 dark:ring-white/10"
              />
            </div>
            <button
              type="submit"
              disabled={profileBusy}
              className="kofkan-btn-gold kofkan-tap w-full rounded-[10px] py-2.5 text-small font-semibold text-white disabled:opacity-50"
            >
              {profileBusy ? "Saving…" : "Save"}
            </button>
          </form>

          {showInlineEmailVerify && profileEmail.trim() && (
            <div className="mt-5 rounded-[10px] border border-kofkan-gold/40 bg-kofkan-cream/60 p-4 dark:bg-zinc-800/80">
              <p className="text-small font-semibold text-kofkan-text-primary dark:text-zinc-100">
                Verify your email
              </p>
              <p className="mt-1 text-small text-kofkan-text-secondary dark:text-zinc-400">
                We sent a 6-digit code to <span className="font-medium">{profileEmail.trim()}</span>.
              </p>
              <form
                className="mt-3 flex flex-col gap-2"
                onSubmit={async (e) => {
                  e.preventDefault();
                  setBanner(null);
                  const code = sanitizeDigits(inlineVerifyCode, 6);
                  if (code.length < 6) {
                    setBanner({ type: "err", text: "Enter the 6-digit code from your email." });
                    return;
                  }
                  setInlineVerifyBusy(true);
                  try {
                    await authVerifyEmail(profileEmail.trim(), code);
                    setInlineVerifyCode("");
                    setShowInlineEmailVerify(false);
                    await refreshProfile();
                    setBanner({ type: "ok", text: "Email verified." });
                  } catch (err) {
                    setBanner({ type: "err", text: err instanceof Error ? err.message : "Verification failed" });
                  } finally {
                    setInlineVerifyBusy(false);
                  }
                }}
              >
                <input
                  inputMode="numeric"
                  value={inlineVerifyCode}
                  onChange={(e) => setInlineVerifyCode(sanitizeDigits(e.target.value, 6))}
                  placeholder="6-digit code"
                  maxLength={6}
                  className="w-full rounded-[10px] border-0 bg-white py-2.5 px-3 text-body ring-1 ring-kofkan-gray-soft dark:bg-zinc-900 dark:text-zinc-100 dark:ring-white/10"
                />
                <button
                  type="submit"
                  disabled={inlineVerifyBusy}
                  className="rounded-[10px] border border-kofkan-gold py-2.5 text-small font-semibold text-kofkan-gold disabled:opacity-50"
                >
                  {inlineVerifyBusy ? "Verifying…" : "Confirm email"}
                </button>
              </form>
            </div>
          )}
        </section>
      )}

      {panel === "appearance" && (
        <section className="rounded-[12px] bg-white p-5 shadow-sm ring-1 ring-black/[0.06] dark:bg-zinc-900 dark:ring-white/10">
          <h2 className="font-display text-section-title font-semibold text-kofkan-text-primary dark:text-zinc-100">
            Appearance
          </h2>
          <p className="mt-1 text-small text-kofkan-text-secondary">Choose how KofKaN looks on this device.</p>
          <div className="mt-4 flex flex-col gap-2">
            {(
              [
                { id: "light" as const, label: "Light" },
                { id: "dark" as const, label: "Dark" },
                { id: "system" as const, label: "System" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setPreference(opt.id)}
                className={`kofkan-tap rounded-[10px] border py-3 text-small font-semibold ${
                  preference === opt.id
                    ? "border-kofkan-gold bg-kofkan-cream text-kofkan-text-primary dark:bg-zinc-800 dark:text-zinc-100"
                    : "border-kofkan-gray-soft text-kofkan-text-secondary dark:border-white/10"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </section>
      )}

      {panel === "address" && (
        <section className="rounded-[12px] bg-white p-5 shadow-sm ring-1 ring-black/[0.06] dark:bg-zinc-900 dark:ring-white/10">
          <h2 className="font-display text-section-title font-semibold text-kofkan-text-primary dark:text-zinc-100">
            Default shipping profile
          </h2>
          <p className="mt-1 text-small text-kofkan-text-secondary dark:text-zinc-400">
            Used to prefill checkout. You can enter a different address at checkout when needed.
          </p>

          {hasSavedAddress && !addressFormOpen && (
            <div className="mt-4 space-y-3">
              <div className="rounded-[10px] bg-kofkan-cream/80 px-3 py-3 text-small text-kofkan-text-secondary dark:bg-zinc-800 dark:text-zinc-300">
                <p className="font-semibold text-kofkan-text-primary dark:text-zinc-100">
                  {GHANA_REGIONS.find((r) => r.slug === u.shipping_region)?.label ?? u.shipping_region} ·{" "}
                  {u.shipping_city}
                </p>
                <p className="mt-2 text-kofkan-text-primary dark:text-zinc-100">{u.shipping_address_line1}</p>
                {u.shipping_address_line2?.trim() ? <p className="mt-1">{u.shipping_address_line2}</p> : null}
                {u.shipping_landmark?.trim() ? <p className="mt-1">Landmark: {u.shipping_landmark}</p> : null}
                <p className="mt-2 text-kofkan-text-muted dark:text-zinc-500">
                  Contact: {(u.shipping_contact_name || u.name || "—").trim()} ·{" "}
                  {(u.shipping_contact_phone || u.phone || "—").trim()}
                </p>
              </div>
              <button
                type="button"
                disabled={shipBusy}
                onClick={() => setAddressFormOpen(true)}
                className="kofkan-btn-gold kofkan-tap w-full rounded-[10px] py-2.5 text-small font-semibold text-white disabled:opacity-50"
              >
                Edit address
              </button>
              <button
                type="button"
                disabled={shipBusy}
                onClick={() => void clearShippingProfile()}
                className="w-full rounded-[10px] border border-kofkan-gray-soft py-2.5 text-small font-semibold text-kofkan-text-primary disabled:opacity-50 dark:border-white/10 dark:text-zinc-100"
              >
                Remove saved address
              </button>
            </div>
          )}

          {(!hasSavedAddress || addressFormOpen) && (
            <form onSubmit={saveShippingProfile} className="mt-4 space-y-3">
              {hasSavedAddress && addressFormOpen && (
                <button
                  type="button"
                  className="text-small font-semibold text-kofkan-gold"
                  onClick={() => setAddressFormOpen(false)}
                >
                  ← Back to summary
                </button>
              )}
              <div>
                <label className="text-small font-medium text-kofkan-text-primary dark:text-zinc-200" htmlFor="addr-region">
                  Region
                </label>
                <select
                  id="addr-region"
                  value={shipRegion}
                  onChange={(e) => {
                    const slug = e.target.value;
                    setShipRegion(slug);
                    const list = citiesForRegion(slug);
                    setCityPick(list[0] ?? GHANA_CITY_OTHER);
                    setCityOther("");
                  }}
                  className="mt-1 w-full rounded-[10px] border-0 bg-kofkan-cream py-2.5 px-3 text-body ring-1 ring-kofkan-gray-soft dark:bg-zinc-800 dark:text-zinc-100 dark:ring-white/10"
                >
                  {GHANA_REGIONS.map((r) => (
                    <option key={r.slug} value={r.slug}>
                      {r.label} — {formatGhs(r.feeGhs)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-small font-medium text-kofkan-text-primary dark:text-zinc-200" htmlFor="addr-city">
                  City / town
                </label>
                <select
                  id="addr-city"
                  value={cityPick}
                  onChange={(e) => {
                    setCityPick(e.target.value);
                    if (e.target.value !== GHANA_CITY_OTHER) setCityOther("");
                  }}
                  className="mt-1 w-full rounded-[10px] border-0 bg-kofkan-cream py-2.5 px-3 text-body ring-1 ring-kofkan-gray-soft dark:bg-zinc-800 dark:text-zinc-100 dark:ring-white/10"
                >
                  {citiesForRegion(shipRegion).map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                {cityPick === GHANA_CITY_OTHER && (
                  <input
                    value={cityOther}
                    onChange={(e) => setCityOther(e.target.value)}
                    placeholder="Enter your city or town"
                    className="mt-2 w-full rounded-[10px] border-0 bg-kofkan-cream py-2.5 px-3 text-body ring-1 ring-kofkan-gray-soft dark:bg-zinc-800 dark:text-zinc-100 dark:ring-white/10"
                  />
                )}
              </div>
              <input
                value={shipLine1}
                onChange={(e) => setShipLine1(e.target.value)}
                placeholder="Address line 1"
                className="w-full rounded-[10px] border-0 bg-kofkan-cream py-2.5 px-3 text-body ring-1 ring-kofkan-gray-soft dark:bg-zinc-800 dark:text-zinc-100 dark:ring-white/10"
              />
              <input
                value={shipLine2}
                onChange={(e) => setShipLine2(e.target.value)}
                placeholder="Address line 2 (optional)"
                className="w-full rounded-[10px] border-0 bg-kofkan-cream py-2.5 px-3 text-body ring-1 ring-kofkan-gray-soft dark:bg-zinc-800 dark:text-zinc-100 dark:ring-white/10"
              />
              <input
                value={shipLandmark}
                onChange={(e) => setShipLandmark(e.target.value)}
                placeholder="Landmark (optional)"
                className="w-full rounded-[10px] border-0 bg-kofkan-cream py-2.5 px-3 text-body ring-1 ring-kofkan-gray-soft dark:bg-zinc-800 dark:text-zinc-100 dark:ring-white/10"
              />
              <input
                value={shipContactName}
                onChange={(e) => setShipContactName(e.target.value)}
                placeholder="Default contact name"
                className="w-full rounded-[10px] border-0 bg-kofkan-cream py-2.5 px-3 text-body ring-1 ring-kofkan-gray-soft dark:bg-zinc-800 dark:text-zinc-100 dark:ring-white/10"
              />
              <input
                value={shipContactPhone}
                onChange={(e) => setShipContactPhone(e.target.value)}
                placeholder="Default contact phone"
                className="w-full rounded-[10px] border-0 bg-kofkan-cream py-2.5 px-3 text-body ring-1 ring-kofkan-gray-soft dark:bg-zinc-800 dark:text-zinc-100 dark:ring-white/10"
              />
              <button
                type="submit"
                disabled={shipBusy}
                className="kofkan-btn-gold kofkan-tap w-full rounded-[10px] py-2.5 text-small font-semibold text-white disabled:opacity-50"
              >
                {shipBusy ? "Saving…" : "Save shipping profile"}
              </button>
              {hasSavedAddress && (
                <button
                  type="button"
                  disabled={shipBusy}
                  onClick={() => void clearShippingProfile()}
                  className="w-full rounded-[10px] border border-kofkan-gray-soft py-2.5 text-small font-semibold text-kofkan-text-primary disabled:opacity-50 dark:border-white/10 dark:text-zinc-100"
                >
                  Clear saved address
                </button>
              )}
            </form>
          )}
        </section>
      )}

      {panel === "security" && (
        <div className="space-y-5">
          <section className="rounded-[12px] bg-white p-5 shadow-sm ring-1 ring-black/[0.06] dark:bg-zinc-900 dark:ring-white/10">
            <h2 className="font-display text-section-title font-semibold text-kofkan-text-primary dark:text-zinc-100">
              Password
            </h2>
            <form onSubmit={changePw} className="mt-4 space-y-3">
              <input
                type="password"
                value={curPw}
                onChange={(e) => setCurPw(e.target.value)}
                placeholder="Current password"
                autoComplete="current-password"
                className="w-full rounded-[10px] border-0 bg-kofkan-cream py-2.5 px-3 text-body ring-1 ring-kofkan-gray-soft dark:bg-zinc-800 dark:text-zinc-100 dark:ring-white/10"
              />
              <input
                type="password"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                placeholder="New password (min. 8)"
                autoComplete="new-password"
                minLength={8}
                className="w-full rounded-[10px] border-0 bg-kofkan-cream py-2.5 px-3 text-body ring-1 ring-kofkan-gray-soft dark:bg-zinc-800 dark:text-zinc-100 dark:ring-white/10"
              />
              <input
                type="password"
                value={newPwConfirm}
                onChange={(e) => setNewPwConfirm(e.target.value)}
                placeholder="Confirm new password"
                autoComplete="new-password"
                minLength={8}
                className="w-full rounded-[10px] border-0 bg-kofkan-cream py-2.5 px-3 text-body ring-1 ring-kofkan-gray-soft dark:bg-zinc-800 dark:text-zinc-100 dark:ring-white/10"
              />
              <button
                type="submit"
                disabled={pwBusy}
                className="w-full rounded-[10px] border border-kofkan-gray-soft py-2.5 text-small font-semibold text-kofkan-text-primary disabled:opacity-50 dark:border-white/10 dark:text-zinc-100"
              >
                {pwBusy ? "Updating…" : "Update password"}
              </button>
            </form>
          </section>
          <AccountTwoFactorPanel />
        </div>
      )}

      {panel === "notifications" && (
        <section className="rounded-[12px] bg-white p-5 shadow-sm ring-1 ring-black/[0.06] dark:bg-zinc-900 dark:ring-white/10">
          <h2 className="font-display text-section-title font-semibold text-kofkan-text-primary dark:text-zinc-100">
            Notifications
          </h2>
          <p className="mt-3 text-small leading-relaxed text-kofkan-text-secondary">
            {u.email
              ? `Order updates, delivery notes, and account security alerts are sent to your email on file (${u.email}).`
              : "No email is on this account yet. Add one to receive email notifications."}
          </p>
        </section>
      )}

      {panel === "verify" && (
        <section className="rounded-[12px] bg-white p-5 shadow-sm ring-1 ring-black/[0.06] dark:bg-zinc-900 dark:ring-white/10">
          <h2 className="font-display text-section-title font-semibold text-kofkan-text-primary dark:text-zinc-100">
            Verify email
          </h2>
          {!u.email ? (
            <p className="mt-3 text-small text-kofkan-text-secondary">
              Add an email in{" "}
              <button
                type="button"
                className="font-semibold text-kofkan-gold underline"
                onClick={() => setPanel("settings")}
              >
                Profile & settings
              </button>{" "}
              first, then open this screen again.
            </p>
          ) : (
            <form onSubmit={verifySignedIn} className="mt-4 space-y-3">
              <div>
                <label className="text-small font-medium text-kofkan-text-primary dark:text-zinc-200" htmlFor="verify-email">
                  Email
                </label>
                <input
                  id="verify-email"
                  type="email"
                  value={inboxEmail}
                  onChange={(e) => setInboxEmail(e.target.value)}
                  className="mt-1 w-full rounded-[10px] border-0 bg-kofkan-cream py-2.5 px-3 text-body ring-1 ring-kofkan-gray-soft dark:bg-zinc-800 dark:text-zinc-100 dark:ring-white/10"
                />
              </div>
              <div>
                <label className="text-small font-medium text-kofkan-text-primary dark:text-zinc-200" htmlFor="verify-code">
                  Verification code
                </label>
                <input
                  id="verify-code"
                  inputMode="numeric"
                  value={inboxCode}
                  onChange={(e) => setInboxCode(sanitizeDigits(e.target.value, 6))}
                  placeholder="6-digit code"
                  maxLength={6}
                  className="mt-1 w-full rounded-[10px] border-0 bg-kofkan-cream py-2.5 px-3 text-body ring-1 ring-kofkan-gray-soft dark:bg-zinc-800 dark:text-zinc-100 dark:ring-white/10"
                />
              </div>
              <button
                type="submit"
                disabled={inboxBusy}
                className="w-full rounded-[10px] border border-kofkan-gold py-2.5 text-small font-semibold text-kofkan-gold disabled:opacity-50"
              >
                {inboxBusy ? "Verifying…" : "Confirm"}
              </button>
              <button
                type="button"
                disabled={resendBusy || !u.email || u.email_verified || !!u.email_is_placeholder}
                onClick={async () => {
                  setBanner(null);
                  setResendBusy(true);
                  try {
                    await authResendEmailVerification(token);
                    setBanner({ type: "ok", text: "A new verification code was sent to your email." });
                  } catch (err) {
                    setBanner({ type: "err", text: err instanceof Error ? err.message : "Could not resend code" });
                  } finally {
                    setResendBusy(false);
                  }
                }}
                className="w-full rounded-[10px] border border-kofkan-gray-soft py-2.5 text-small font-semibold text-kofkan-text-primary disabled:opacity-50 dark:border-white/10 dark:text-zinc-100"
              >
                {resendBusy ? "Sending…" : "Resend verification code"}
              </button>
            </form>
          )}
        </section>
      )}

      {panel === "newsletter" && (
        <section className="rounded-[12px] bg-white p-5 shadow-sm ring-1 ring-black/[0.06] dark:bg-zinc-900 dark:ring-white/10">
          <h2 className="font-display text-section-title font-semibold text-kofkan-text-primary dark:text-zinc-100">
            Newsletter
          </h2>
          <p className="mt-1 text-small text-kofkan-text-secondary dark:text-zinc-400">
            Get launches and price drops. You can unsubscribe anytime.
          </p>
          <form
            className="mt-4 flex gap-2"
            onSubmit={async (e) => {
              e.preventDefault();
              setNewsBusy(true);
              setBanner(null);
              const em = newsEmail.trim() || u.email || "";
              const err = validateEmail(em);
              if (err) {
                setBanner({ type: "err", text: err });
                setNewsBusy(false);
                return;
              }
              if (!newsMarketing) {
                setBanner({
                  type: "err",
                  text: "Please confirm you agree to receive marketing emails (checkbox below).",
                });
                setNewsBusy(false);
                return;
              }
              try {
                await newsletterSubscribe(em, { marketingOptIn: true });
                setBanner({ type: "ok", text: "Subscribed. Check your inbox if confirmation is required." });
                setNewsMarketing(false);
              } catch (err) {
                setBanner({ type: "err", text: err instanceof Error ? err.message : "Subscribe failed" });
              } finally {
                setNewsBusy(false);
              }
            }}
          >
            <input
              type="email"
              value={newsEmail || u.email || ""}
              onChange={(e) => setNewsEmail(e.target.value)}
              className="min-w-0 flex-1 rounded-[10px] border-0 bg-kofkan-cream py-2.5 px-3 text-body ring-1 ring-kofkan-gray-soft dark:bg-zinc-800 dark:text-zinc-100 dark:ring-white/10"
            />
            <button
              type="submit"
              disabled={newsBusy}
              className="shrink-0 rounded-[10px] bg-kofkan-gold px-4 py-2.5 text-small font-semibold text-white disabled:opacity-50"
            >
              {newsBusy ? "Processing..." : "Join"}
            </button>
          </form>
          <label className="mt-3 flex cursor-pointer items-start gap-2 text-[12px] leading-snug text-kofkan-text-secondary dark:text-zinc-400">
            <input
              type="checkbox"
              checked={newsMarketing}
              onChange={(e) => setNewsMarketing(e.target.checked)}
              className="mt-0.5 shrink-0 rounded border-kofkan-gray-soft dark:border-white/20"
            />
            <span>
              I agree to receive marketing emails about products, offers, launches, and price drops. See{" "}
              <Link href="/privacy" className="font-semibold text-kofkan-gold hover:underline">
                Privacy policy
              </Link>
              .
            </span>
          </label>
          <button
            type="button"
            disabled={newsBusy}
            onClick={async () => {
              setNewsBusy(true);
              setBanner(null);
              const em = newsEmail.trim() || u.email || "";
              const err = validateEmail(em);
              if (err) {
                setBanner({ type: "err", text: err });
                setNewsBusy(false);
                return;
              }
              try {
                await newsletterUnsubscribe(em);
                setBanner({ type: "ok", text: "You have been unsubscribed from newsletter emails." });
              } catch (e) {
                setBanner({ type: "err", text: e instanceof Error ? e.message : "Unsubscribe failed" });
              } finally {
                setNewsBusy(false);
              }
            }}
            className="mt-2 w-full rounded-[10px] border border-kofkan-gray-soft py-2.5 text-small font-semibold text-kofkan-text-primary disabled:opacity-50 dark:border-white/10 dark:text-zinc-100"
          >
            {newsBusy ? "Processing..." : "Unsubscribe"}
          </button>
        </section>
      )}

      {panel === "danger" && (
        <section className="rounded-[12px] border border-kofkan-crimson/20 bg-white p-5 dark:border-red-900/40 dark:bg-zinc-900">
          <h2 className="font-display text-section-title font-semibold text-kofkan-crimson">Close account</h2>
          <p className="mt-1 text-small text-kofkan-text-secondary">This cannot be undone.</p>
          <form onSubmit={delAccount} className="mt-4 space-y-3">
            <input
              type="password"
              required
              value={delPw}
              onChange={(e) => setDelPw(e.target.value)}
              placeholder="Current password"
              autoComplete="current-password"
              className="w-full rounded-[10px] border-0 bg-kofkan-cream py-2.5 px-3 text-body ring-1 ring-kofkan-gray-soft dark:bg-zinc-800 dark:text-zinc-100 dark:ring-white/10"
            />
            <button
              type="submit"
              disabled={delBusy}
              className="w-full rounded-[10px] bg-kofkan-crimson py-2.5 text-small font-semibold text-white disabled:opacity-50"
            >
              {delBusy ? "Closing…" : "Delete account"}
            </button>
          </form>
        </section>
      )}
    </div>
  );
}
