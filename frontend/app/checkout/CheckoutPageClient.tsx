"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ScreenHeader } from "@/components/ScreenHeader";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { ordersCreate, ordersShippingOptions, type ShippingOptions } from "@/lib/api/orders";
import { paystackInitialize } from "@/lib/api/payments";
import { cleanImageUrl } from "@/lib/clean-image-url";

import {
  DELIVERY_COURIER_OPTIONS,
  GHANA_CITY_OTHER,
  GHANA_REGIONS,
  citiesForRegion,
  deliveryFeeFor,
  splitCityForRegion,
  type ShippingMethodClient,
} from "@/lib/ghana-shipping";
import { formatGhs } from "@/lib/mock-data";
import { sanitizeMultiline, validateShippingAddress } from "@/lib/validation/input";

type Step = "address" | "shipping" | "review";

const STEPS: { id: Step; label: string }[] = [
  { id: "address", label: "Address" },
  { id: "shipping", label: "Shipping" },
  { id: "review", label: "Review & pay" },
];

function StepHeader({ current }: { current: Step }) {
  const currentIdx = STEPS.findIndex((s) => s.id === current);
  return (
    <ol className="flex items-center justify-between gap-2 px-4 pt-3">
      {STEPS.map((s, i) => {
        const active = i === currentIdx;
        const done = i < currentIdx;
        return (
          <li key={s.id} className="flex flex-1 items-center gap-2">
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                done
                  ? "bg-kofkan-gold text-white"
                  : active
                    ? "bg-kofkan-crimson text-white"
                    : "bg-kofkan-gray-soft text-kofkan-text-secondary dark:bg-zinc-800 dark:text-zinc-400"
              }`}
            >
              {done ? "✓" : i + 1}
            </span>
            <span
              className={`truncate text-[11px] font-semibold uppercase tracking-wide ${
                active
                  ? "text-kofkan-text-primary dark:text-zinc-100"
                  : "text-kofkan-text-muted dark:text-zinc-500"
              }`}
            >
              {s.label}
            </span>
            {i < STEPS.length - 1 && (
              <span className={`ml-1 h-px flex-1 ${done ? "bg-kofkan-gold" : "bg-kofkan-gray-soft dark:bg-zinc-800"}`} />
            )}
          </li>
        );
      })}
    </ol>
  );
}

export function CheckoutPageClient() {
  const router = useRouter();
  const { user, accessToken, loading: authLoading } = useAuth();
  const { lines, subtotal, cartSyncing } = useCart();

  const [step, setStep] = useState<Step>("address");
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [checkoutMsg, setCheckoutMsg] = useState<string | null>(null);

  const [shippingMethod, setShippingMethod] = useState<ShippingMethodClient>("delivery");
  const [shippingOptions, setShippingOptions] = useState<ShippingOptions | null>(null);
  const defaultRegion = GHANA_REGIONS[0]?.slug ?? "greater-accra";
  const [shippingRegion, setShippingRegion] = useState<string>(defaultRegion);
  const [shippingProvider, setShippingProvider] = useState<string>(DELIVERY_COURIER_OPTIONS[0] ?? "Station driver");
  const [cityPick, setCityPick] = useState(
    () => citiesForRegion(GHANA_REGIONS[0]?.slug ?? "greater-accra")[0] ?? GHANA_CITY_OTHER,
  );
  const [cityOther, setCityOther] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [useDefaultContact, setUseDefaultContact] = useState(true);
  const [shippingContactName, setShippingContactName] = useState("");
  const [shippingContactPhone, setShippingContactPhone] = useState("");
  const [orderNotes, setOrderNotes] = useState("");

  useEffect(() => {
    let cancelled = false;
    void ordersShippingOptions()
      .then((data) => {
        if (cancelled) return;
        setShippingOptions(data);
        if (data.regions?.[0]?.slug) setShippingRegion(data.regions[0].slug);
        if (data.couriers?.[0]?.name) setShippingProvider(data.couriers[0].name);
      })
      .catch(() => {
        if (!cancelled) setShippingOptions(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const regionRows = useMemo(() => {
    if (shippingOptions?.regions?.length) return shippingOptions.regions;
    return GHANA_REGIONS.map((r) => ({ slug: r.slug, label: r.label, base_fee: r.feeGhs, cities: [] }));
  }, [shippingOptions]);

  const courierRows = useMemo(() => {
    if (shippingOptions?.couriers?.length) return shippingOptions.couriers;
    return DELIVERY_COURIER_OPTIONS.map((name) => ({ name, fee_delta: 0 }));
  }, [shippingOptions]);

  const hasSavedShipping = useMemo(
    () =>
      !!(
        user?.shipping_region?.trim() &&
        user?.shipping_city?.trim() &&
        user?.shipping_address_line1?.trim()
      ),
    [user],
  );
  const [useSavedShipping, setUseSavedShipping] = useState(false);

  useEffect(() => {
    setUseSavedShipping(!!hasSavedShipping);
  }, [hasSavedShipping]);

  useEffect(() => {
    if (!user) return;
    const reg = user.shipping_region?.trim() || regionRows[0]?.slug || defaultRegion;
    if (user.shipping_region?.trim()) setShippingRegion(user.shipping_region.trim());
    const { pick, other } = splitCityForRegion(reg, user.shipping_city);
    if (user.shipping_city?.trim() || user.shipping_address_line1?.trim()) {
      setCityPick(pick);
      setCityOther(other);
    } else {
      const list = citiesForRegion(reg);
      setCityPick(list[0] ?? GHANA_CITY_OTHER);
      setCityOther("");
    }
    const line1 = user.shipping_address_line1?.trim() || "";
    const line2 = user.shipping_address_line2?.trim() || "";
    const landmark = user.shipping_landmark?.trim() || "";
    const merged = [line1, line2, landmark ? `Landmark: ${landmark}` : ""].filter(Boolean).join(", ");
    if (merged) setShippingAddress(merged);
    if (user.shipping_contact_name) setShippingContactName(user.shipping_contact_name);
    if (user.shipping_contact_phone) setShippingContactPhone(user.shipping_contact_phone);
  }, [user, regionRows, defaultRegion]);

  const deliveryFee = useMemo(() => {
    if (shippingMethod !== "delivery") return 0;
    const usingSaved = useSavedShipping && hasSavedShipping;
    const regionForFee = usingSaved ? user?.shipping_region ?? null : shippingRegion;
    const cityForFee = usingSaved ? user?.shipping_city ?? null : cityPick === GHANA_CITY_OTHER ? cityOther : cityPick;
    const region = regionRows.find((r) => r.slug === (regionForFee ?? ""));
    const cityMatch = region?.cities?.find((c) => c.name.toLowerCase() === (cityForFee ?? "").trim().toLowerCase());
    const base = cityMatch ? cityMatch.fee : region?.base_fee ?? deliveryFeeFor("delivery", regionForFee);
    const courierDelta =
      courierRows.find((c) => c.name.toLowerCase() === shippingProvider.trim().toLowerCase())?.fee_delta ?? 0;
    return Math.max(0, Number(base) + Number(courierDelta));
  }, [
    shippingMethod,
    useSavedShipping,
    hasSavedShipping,
    user?.shipping_region,
    user?.shipping_city,
    shippingRegion,
    cityPick,
    cityOther,
    shippingProvider,
    regionRows,
    courierRows,
  ]);

  const total = subtotal + deliveryFee;

  const onRegionChange = useCallback((slug: string) => {
    setShippingRegion(slug);
    const list = (regionRows.find((r) => r.slug === slug)?.cities ?? []).map((c) => c.name);
    const fallbackList = list.length ? list : citiesForRegion(slug);
    setCityPick(fallbackList[0] ?? GHANA_CITY_OTHER);
    setCityOther("");
  }, [regionRows]);

  const validateAddress = (): string | null => {
    if (shippingMethod !== "delivery") return null;
    const usingSaved = useSavedShipping && hasSavedShipping;
    if (usingSaved) {
      const addr = [
        user?.shipping_address_line1,
        user?.shipping_address_line2,
        user?.shipping_landmark ? `Landmark: ${user.shipping_landmark}` : "",
      ]
        .filter(Boolean)
        .join(", ");
      return validateShippingAddress(sanitizeMultiline(addr, 2000));
    }
    if (!shippingRegion.trim()) return "Choose your region for delivery.";
    const eCity = (cityPick === GHANA_CITY_OTHER ? cityOther : cityPick).trim();
    if (!eCity) return "Choose or enter your city for delivery.";
    return validateShippingAddress(sanitizeMultiline(shippingAddress, 2000));
  };

  const onNext = () => {
    setCheckoutMsg(null);
    if (step === "address") {
      const err = validateAddress();
      if (err) {
        setCheckoutMsg(err);
        return;
      }
      setStep("shipping");
      return;
    }
    if (step === "shipping") {
      if (shippingMethod === "delivery") {
        if (!shippingProvider.trim()) {
          setCheckoutMsg("Choose a courier.");
          return;
        }
        const name = useDefaultContact
          ? (user?.shipping_contact_name || user?.name || "").trim()
          : shippingContactName.trim();
        const phone = useDefaultContact
          ? (user?.shipping_contact_phone || user?.phone || "").trim()
          : shippingContactPhone.trim();
        if (!name) {
          setCheckoutMsg("Enter a delivery contact name.");
          return;
        }
        if (!phone) {
          setCheckoutMsg("Enter a delivery contact phone.");
          return;
        }
      }
      setStep("review");
      return;
    }
  };

  const onCheckout = async () => {
    if (!accessToken || !user) {
      setCheckoutMsg("Sign in to checkout.");
      return;
    }
    const notesTrim = sanitizeMultiline(orderNotes, 2000).trim();
    let addr: string | null = null;
    let effRegion = "";
    let effCity = "";

    if (shippingMethod === "delivery") {
      const usingSaved = useSavedShipping && hasSavedShipping;
      if (usingSaved) {
        effRegion = (user.shipping_region ?? "").trim();
        effCity = (user.shipping_city ?? "").trim();
        addr = [
          user.shipping_address_line1,
          user.shipping_address_line2,
          user.shipping_landmark ? `Landmark: ${user.shipping_landmark}` : "",
        ]
          .filter(Boolean)
          .join(", ");
      } else {
        effRegion = shippingRegion.trim();
        effCity = (cityPick === GHANA_CITY_OTHER ? cityOther : cityPick).trim();
        addr = sanitizeMultiline(shippingAddress, 2000);
      }
    } else {
      const t = sanitizeMultiline(shippingAddress, 2000).trim();
      addr = t.length > 0 ? t : null;
    }

    setCheckoutBusy(true);
    setCheckoutMsg(null);
    try {
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const order = await ordersCreate(accessToken, {
        shipping_method: shippingMethod,
        shipping_region: shippingMethod === "delivery" ? effRegion : null,
        shipping_city: shippingMethod === "delivery" ? effCity : null,
        shipping_provider: shippingMethod === "delivery" ? shippingProvider.trim() : null,
        shipping_contact_name:
          shippingMethod === "delivery"
            ? (
                useDefaultContact
                  ? (user.shipping_contact_name || user.name || "").trim()
                  : shippingContactName.trim()
              ) || null
            : null,
        shipping_contact_phone:
          shippingMethod === "delivery"
            ? (
                useDefaultContact
                  ? (user.shipping_contact_phone || user.phone || "").trim()
                  : shippingContactPhone.trim()
              ) || null
            : null,
        shipping_address: addr,
        notes: notesTrim.length > 0 ? notesTrim : null,
      });
      const callbackUrl = `${origin}/checkout/success?order=${order.id}`;
      const pay = await paystackInitialize(accessToken, order.id, callbackUrl);
      if (typeof window !== "undefined" && pay.authorization_url) {
        window.location.href = pay.authorization_url;
      }
    } catch (e) {
      setCheckoutMsg(e instanceof Error ? e.message : "Checkout failed");
    } finally {
      setCheckoutBusy(false);
    }
  };

  if (authLoading) {
    return (
      <main className="min-h-[40vh] bg-kofkan-cream px-4 py-16 text-center text-small text-kofkan-text-secondary dark:bg-zinc-950 dark:text-zinc-400">
        Loading…
      </main>
    );
  }

  if (!user || !accessToken) {
    return (
      <main className="bg-kofkan-cream dark:bg-zinc-950">
        <ScreenHeader variant="inner" title="Checkout" left="back" backHref="/cart" right="none" />
        <div className="mx-auto max-w-mobile px-4 py-14 text-center">
          <p className="text-body text-kofkan-text-secondary dark:text-zinc-400">Sign in to place an order.</p>
          <Link href="/account" className="mt-4 inline-block font-semibold text-kofkan-gold hover:underline">
            Go to account
          </Link>
        </div>
      </main>
    );
  }

  if (lines.length === 0) {
    return (
      <main className="bg-kofkan-cream dark:bg-zinc-950">
        <ScreenHeader variant="inner" title="Checkout" left="back" backHref="/cart" right="none" />
        <div className="mx-auto max-w-mobile px-4 py-14 text-center">
          <p className="text-body text-kofkan-text-secondary dark:text-zinc-400">Your cart is empty.</p>
          <Link href="/shop" className="mt-4 inline-block font-semibold text-kofkan-gold hover:underline">
            Browse products
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="bg-kofkan-cream pb-10 dark:bg-zinc-950">
      <ScreenHeader variant="inner" title="Checkout" left="back" backHref="/cart" right="none" />
      <div className="mx-auto max-w-mobile">
        <StepHeader current={step} />

        {checkoutMsg && (
          <button
            type="button"
            onClick={() => setCheckoutMsg(null)}
            className="mx-4 mt-3 w-[calc(100%-2rem)] rounded-[10px] bg-red-50 px-3 py-2 text-left text-small text-red-900 ring-1 ring-red-100 dark:bg-red-950/40 dark:text-red-100"
          >
            {checkoutMsg}
          </button>
        )}

        <div className="px-4 pt-4">
          {step === "address" && (
            <section className="space-y-4 rounded-[12px] bg-white p-4 shadow-sm ring-1 ring-black/[0.06] dark:bg-zinc-900 dark:ring-white/10">
              <h2 className="font-display text-section-title font-semibold text-kofkan-text-primary dark:text-zinc-100">
                Delivery address
              </h2>
              <fieldset className="space-y-2">
                <legend className="text-small font-medium text-kofkan-text-primary dark:text-zinc-200">Method</legend>
                <label className="flex cursor-pointer items-center gap-2 text-body text-kofkan-text-secondary dark:text-zinc-300">
                  <input
                    type="radio"
                    name="ship-method"
                    checked={shippingMethod === "delivery"}
                    onChange={() => setShippingMethod("delivery")}
                    className="accent-kofkan-gold"
                  />
                  Delivery to my address
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-body text-kofkan-text-secondary dark:text-zinc-300">
                  <input
                    type="radio"
                    name="ship-method"
                    checked={shippingMethod === "pickup"}
                    onChange={() => setShippingMethod("pickup")}
                    className="accent-kofkan-gold"
                  />
                  Local pickup (GH₵0)
                </label>
              </fieldset>

              {shippingMethod === "delivery" && hasSavedShipping && (
                <label className="flex cursor-pointer items-start gap-2 text-body text-kofkan-text-secondary dark:text-zinc-300">
                  <input
                    type="checkbox"
                    checked={useSavedShipping}
                    onChange={(e) => setUseSavedShipping(e.target.checked)}
                    className="mt-1 accent-kofkan-gold"
                  />
                  <span>
                    <span className="font-semibold text-kofkan-text-primary dark:text-zinc-100">
                      Use my saved address
                    </span>
                    <span className="mt-1 block text-small text-kofkan-text-muted dark:text-zinc-500">
                      {user.shipping_region} · {user.shipping_city}
                    </span>
                  </span>
                </label>
              )}

              {shippingMethod === "delivery" && (!hasSavedShipping || !useSavedShipping) && (
                <>
                  <div>
                    <label className="text-small font-medium text-kofkan-text-primary dark:text-zinc-200">
                      Region
                      <select
                        value={shippingRegion}
                        onChange={(e) => onRegionChange(e.target.value)}
                        className="mt-1 w-full rounded-[10px] border-0 bg-kofkan-cream py-2.5 px-3 text-body ring-1 ring-kofkan-gray-soft dark:bg-zinc-800 dark:text-zinc-100 dark:ring-white/10"
                      >
                        {regionRows.map((r) => (
                          <option key={r.slug} value={r.slug}>
                            {r.label} — {formatGhs(r.base_fee)}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <div>
                    <label className="text-small font-medium text-kofkan-text-primary dark:text-zinc-200">
                      City / town
                      <select
                        value={cityPick}
                        onChange={(e) => {
                          setCityPick(e.target.value);
                          if (e.target.value !== GHANA_CITY_OTHER) setCityOther("");
                        }}
                        className="mt-1 w-full rounded-[10px] border-0 bg-kofkan-cream py-2.5 px-3 text-body ring-1 ring-kofkan-gray-soft dark:bg-zinc-800 dark:text-zinc-100 dark:ring-white/10"
                      >
                        {(() => {
                          const listed = regionRows.find((r) => r.slug === shippingRegion)?.cities?.map((c) => c.name) ?? [];
                          const rows = listed.length ? listed : citiesForRegion(shippingRegion);
                          return rows.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                          ));
                        })()}
                      </select>
                    </label>
                    {cityPick === GHANA_CITY_OTHER && (
                      <input
                        value={cityOther}
                        onChange={(e) => setCityOther(e.target.value)}
                        placeholder="Enter your city or town"
                        className="mt-2 w-full rounded-[10px] border-0 bg-kofkan-cream py-2.5 px-3 text-body ring-1 ring-kofkan-gray-soft dark:bg-zinc-800 dark:text-zinc-100 dark:ring-white/10"
                      />
                    )}
                  </div>
                  <div>
                    <label className="text-small font-medium text-kofkan-text-primary dark:text-zinc-200">
                      Delivery address
                      <textarea
                        required
                        rows={4}
                        value={shippingAddress}
                        onChange={(e) => setShippingAddress(e.target.value)}
                        placeholder="Example: 22 Oxford Street Osu Accra (write naturally)"
                        className="mt-1 w-full resize-y rounded-[10px] border-0 bg-kofkan-cream py-2.5 px-3 text-body ring-1 ring-kofkan-gray-soft focus:ring-2 focus:ring-kofkan-gold/40 dark:bg-zinc-800 dark:text-zinc-100 dark:ring-white/10"
                      />
                    </label>
                  </div>
                </>
              )}
            </section>
          )}

          {step === "shipping" && (
            <section className="space-y-4 rounded-[12px] bg-white p-4 shadow-sm ring-1 ring-black/[0.06] dark:bg-zinc-900 dark:ring-white/10">
              <h2 className="font-display text-section-title font-semibold text-kofkan-text-primary dark:text-zinc-100">
                Shipping details
              </h2>

              {shippingMethod === "delivery" ? (
                <>
                  <div>
                    <label className="text-small font-medium text-kofkan-text-primary dark:text-zinc-200">
                      Courier / service
                      <select
                        value={shippingProvider}
                        onChange={(e) => setShippingProvider(e.target.value)}
                        className="mt-1 w-full rounded-[10px] border-0 bg-kofkan-cream py-2.5 px-3 text-body ring-1 ring-kofkan-gray-soft dark:bg-zinc-800 dark:text-zinc-100 dark:ring-white/10"
                      >
                        {courierRows.map((c) => (
                          <option key={c.name} value={c.name}>
                            {c.name}
                            {c.fee_delta ? ` (${c.fee_delta > 0 ? "+" : ""}${formatGhs(c.fee_delta)})` : ""}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <div>
                    <p className="text-small font-medium text-kofkan-text-primary dark:text-zinc-200">
                      Delivery contact
                    </p>
                    <label className="mt-2 flex cursor-pointer items-center gap-2 text-small text-kofkan-text-secondary dark:text-zinc-400">
                      <input
                        type="checkbox"
                        checked={useDefaultContact}
                        onChange={(e) => setUseDefaultContact(e.target.checked)}
                        className="accent-kofkan-gold"
                      />
                      Use account contact ({(user.shipping_contact_name || user.name || "No name set").trim()} ·{" "}
                      {(user.shipping_contact_phone || user.phone || "No phone set").trim()})
                    </label>
                  </div>
                  {!useDefaultContact && (
                    <div className="grid grid-cols-1 gap-3">
                      <label className="text-small font-medium text-kofkan-text-primary dark:text-zinc-200">
                        Contact name
                        <input
                          value={shippingContactName}
                          onChange={(e) => setShippingContactName(e.target.value)}
                          className="mt-1 w-full rounded-[10px] border-0 bg-kofkan-cream py-2.5 px-3 text-body ring-1 ring-kofkan-gray-soft dark:bg-zinc-800 dark:text-zinc-100 dark:ring-white/10"
                        />
                      </label>
                      <label className="text-small font-medium text-kofkan-text-primary dark:text-zinc-200">
                        Contact phone
                        <input
                          value={shippingContactPhone}
                          onChange={(e) => setShippingContactPhone(e.target.value)}
                          className="mt-1 w-full rounded-[10px] border-0 bg-kofkan-cream py-2.5 px-3 text-body ring-1 ring-kofkan-gray-soft dark:bg-zinc-800 dark:text-zinc-100 dark:ring-white/10"
                        />
                      </label>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-small text-kofkan-text-secondary dark:text-zinc-400">
                  Pickup is free. We&apos;ll notify you when your order is ready at the pickup desk.
                </p>
              )}

              <div>
                <label className="text-small font-medium text-kofkan-text-primary dark:text-zinc-200">
                  Order notes{" "}
                  <span className="font-normal text-kofkan-text-muted dark:text-zinc-500">(optional)</span>
                  <textarea
                    rows={2}
                    value={orderNotes}
                    onChange={(e) => setOrderNotes(e.target.value)}
                    placeholder="Delivery instructions, pickup name, or gift message"
                    className="mt-1 w-full resize-y rounded-[10px] border-0 bg-kofkan-cream py-2.5 px-3 text-body ring-1 ring-kofkan-gray-soft dark:bg-zinc-800 dark:text-zinc-100 dark:ring-white/10"
                  />
                </label>
              </div>
            </section>
          )}

          {step === "review" && (
            <>
              <section className="rounded-[12px] bg-white p-4 shadow-sm ring-1 ring-black/[0.06] dark:bg-zinc-900 dark:ring-white/10">
                <h2 className="font-display text-section-title font-semibold text-kofkan-text-primary dark:text-zinc-100">
                  Review items
                </h2>
                <ul className="mt-3 divide-y divide-kofkan-gray-soft/80 dark:divide-white/10">
                  {lines.map((l) => (
                    <li key={l.lineKey} className="flex gap-3 py-3 first:pt-0">
                      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-[10px] bg-kofkan-cream">
                        <Image
                          src={cleanImageUrl(l.variantImage || l.product.image)}
                          alt=""
                          fill
                          sizes="56px"
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-small font-semibold text-kofkan-text-primary dark:text-zinc-100">
                          {l.product.name}
                        </p>
                        {l.variantLabel && (
                          <p className="truncate text-[11px] font-semibold uppercase tracking-wider text-kofkan-text-muted dark:text-zinc-500">
                            {l.variantLabel}
                          </p>
                        )}
                        <p className="text-[11px] text-kofkan-text-muted dark:text-zinc-500">
                          {formatGhs(l.unitPrice)} × {l.quantity}
                        </p>
                      </div>
                      <p className="shrink-0 text-small font-semibold text-kofkan-text-primary dark:text-zinc-100">
                        {formatGhs(l.unitPrice * l.quantity)}
                      </p>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="mt-3 rounded-[12px] bg-white p-4 shadow-sm ring-1 ring-black/[0.06] dark:bg-zinc-900 dark:ring-white/10">
                <h2 className="font-display text-section-title font-semibold text-kofkan-text-primary dark:text-zinc-100">
                  Shipping to
                </h2>
                <p className="mt-2 whitespace-pre-wrap text-small text-kofkan-text-secondary dark:text-zinc-300">
                  {shippingMethod === "pickup" ? (
                    "Local pickup"
                  ) : useSavedShipping && hasSavedShipping ? (
                    [user.shipping_address_line1, user.shipping_address_line2].filter(Boolean).join(", ")
                  ) : (
                    shippingAddress.trim() || "—"
                  )}
                </p>
                {shippingMethod === "delivery" && (
                  <p className="mt-1 text-[11px] text-kofkan-text-muted dark:text-zinc-500">
                    via {shippingProvider} ·{" "}
                    {useDefaultContact
                      ? `${user.shipping_contact_name || user.name || ""} · ${user.shipping_contact_phone || user.phone || ""}`
                      : `${shippingContactName} · ${shippingContactPhone}`}
                  </p>
                )}
              </section>

              <section className="mt-3 rounded-[12px] bg-white p-4 shadow-sm ring-1 ring-black/[0.06] dark:bg-zinc-900 dark:ring-white/10">
                <h2 className="font-display text-section-title font-semibold text-kofkan-text-primary dark:text-zinc-100">
                  Payment
                </h2>
                <p className="mt-2 text-small text-kofkan-text-secondary dark:text-zinc-400">
                  You&apos;ll be redirected to Paystack to pay securely with card, Mobile Money, or bank transfer.
                </p>
              </section>
            </>
          )}

          <div className="mt-4 space-y-2 rounded-[10px] bg-white p-4 text-body shadow-sm ring-1 ring-black/[0.05] dark:bg-zinc-900 dark:ring-white/10">
            <div className="flex justify-between text-kofkan-text-secondary dark:text-zinc-400">
              <span>Subtotal</span>
              <span className="text-kofkan-text-primary dark:text-zinc-100">{formatGhs(subtotal)}</span>
            </div>
            <div className="flex justify-between text-kofkan-text-secondary dark:text-zinc-400">
              <span>Delivery</span>
              <span className="text-kofkan-text-primary dark:text-zinc-100">{formatGhs(deliveryFee)}</span>
            </div>
            <div className="flex justify-between border-t border-kofkan-gray-soft pt-3 font-bold text-kofkan-text-primary dark:border-white/10 dark:text-zinc-100">
              <span>Total</span>
              <span>{formatGhs(total)}</span>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-2">
            {step !== "review" ? (
              <button
                type="button"
                onClick={onNext}
                disabled={cartSyncing}
                className="kofkan-btn-gold kofkan-tap w-full rounded-[10px] py-3.5 text-body font-semibold text-white disabled:opacity-50"
              >
                Continue
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void onCheckout()}
                disabled={checkoutBusy || cartSyncing}
                className="kofkan-btn-gold kofkan-tap w-full rounded-[10px] py-3.5 text-body font-semibold text-white disabled:opacity-50"
              >
                {checkoutBusy ? "Redirecting to Paystack…" : `Pay ${formatGhs(total)}`}
              </button>
            )}
            {step !== "address" && (
              <button
                type="button"
                onClick={() => {
                  if (step === "review") setStep("shipping");
                  else if (step === "shipping") setStep("address");
                }}
                className="kofkan-tap rounded-[10px] border border-kofkan-gray-soft bg-white py-3 text-small font-semibold text-kofkan-text-primary dark:border-white/15 dark:bg-zinc-900 dark:text-zinc-100"
              >
                Back
              </button>
            )}
            <button
              type="button"
              onClick={() => router.push("/cart")}
              className="text-center text-[11px] font-semibold text-kofkan-text-muted hover:text-kofkan-text-primary"
            >
              Edit cart
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
