"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { adminFetchSettings, adminUpsertSetting, type BusinessSettingRow } from "@/lib/api/admin";
import { AdminSettingsPageSkeleton } from "@/components/admin/Skeleton";
import { GHANA_REGIONS } from "@/lib/ghana-shipping";

type ShippingCity = { name: string; fee: number };
type ShippingRegion = { slug: string; label: string; base_fee: number; cities: ShippingCity[] };
type ShippingCourier = { name: string; fee_delta: number };
type ShippingMatrix = { regions: ShippingRegion[]; couriers: ShippingCourier[] };

const SHIPPING_KEY = "shipping_matrix_v1";

const DEFAULT_MATRIX: ShippingMatrix = {
  regions: GHANA_REGIONS.map((r) => ({ slug: r.slug, label: r.label, base_fee: r.feeGhs, cities: [] })),
  couriers: [
    { name: "Station driver", fee_delta: 0 },
    { name: "Speedaf", fee_delta: 0 },
    { name: "FedEx", fee_delta: 0 },
    { name: "Ghana Post", fee_delta: 0 },
    { name: "Other courier", fee_delta: 0 },
  ],
};

function asString(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function asNumber(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function parseMatrix(rows: BusinessSettingRow[]): ShippingMatrix {
  const raw = rows.find((r) => r.key === SHIPPING_KEY)?.value ?? "";
  if (!raw.trim()) return DEFAULT_MATRIX;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return DEFAULT_MATRIX;
    const obj = parsed as { regions?: unknown; couriers?: unknown };
    const regions: unknown[] = Array.isArray(obj.regions) ? obj.regions : [];
    const couriers: unknown[] = Array.isArray(obj.couriers) ? obj.couriers : [];
    return {
      regions: regions.map((r) => {
        const region = (r ?? {}) as {
          slug?: unknown;
          label?: unknown;
          base_fee?: unknown;
          cities?: unknown;
        };
        const slug = asString(region.slug);
        const label = asString(region.label) || slug;
        const cities = Array.isArray(region.cities) ? region.cities : [];
        return {
          slug,
          label,
          base_fee: asNumber(region.base_fee),
          cities: cities.map((c) => {
            const city = (c ?? {}) as { name?: unknown; fee?: unknown };
            return { name: asString(city.name), fee: asNumber(city.fee) };
          }),
        };
      }),
      couriers: couriers.map((c) => {
        const courier = (c ?? {}) as { name?: unknown; fee_delta?: unknown };
        return { name: asString(courier.name), fee_delta: asNumber(courier.fee_delta) };
      }),
    };
  } catch {
    return DEFAULT_MATRIX;
  }
}

export default function AdminSettingsPage() {
  const { accessToken } = useAuth();
  const [rows, setRows] = useState<BusinessSettingRow[]>([]);
  const [key, setKey] = useState("");
  const [value, setValue] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [shipping, setShipping] = useState<ShippingMatrix>(DEFAULT_MATRIX);
  const [newCourier, setNewCourier] = useState("");
  const [newCityName, setNewCityName] = useState("");
  const [newCityFee, setNewCityFee] = useState("0");
  const [cityRegion, setCityRegion] = useState(DEFAULT_MATRIX.regions[0]?.slug ?? "greater-accra");

  const load = useCallback(async () => {
    if (!accessToken) return;
    try {
      const data = await adminFetchSettings(accessToken);
      setRows(data);
      setShipping(parseMatrix(data));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load settings");
    } finally {
      setReady(true);
    }
  }, [accessToken]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken || saving) return;
    setSaving(true);
    try {
      await adminUpsertSetting(accessToken, { key, value });
      setKey("");
      setValue("");
      await load();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const saveShipping = async () => {
    if (!accessToken || saving) return;
    setSaving(true);
    setErr(null);
    try {
      await adminUpsertSetting(accessToken, {
        key: SHIPPING_KEY,
        value: JSON.stringify(shipping),
      });
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to save shipping matrix");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h1 className="font-display text-page-title font-semibold">Settings</h1>
      <p className="mt-2 text-small text-kofkan-text-secondary">
        Editable business settings stored in the database.
      </p>
      {err && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-small text-red-800">{err}</p>}
      {!ready && !err ? (
        <AdminSettingsPageSkeleton />
      ) : (
        <>
      <section className="mt-6 rounded-xl bg-white p-5 shadow-sm ring-1 ring-black/[0.06]">
        <h2 className="font-display text-section-title font-semibold text-kofkan-text-primary">Shipping matrix</h2>
        <p className="mt-1 text-small text-kofkan-text-secondary">
          Set delivery fees by region, optional city-specific overrides, and courier extra charges.
        </p>

        <div className="mt-4 space-y-5">
          <div>
            <p className="text-small font-semibold text-kofkan-text-primary">Regions</p>
            <div className="mt-2 space-y-2">
              {shipping.regions.map((r) => (
                <div key={r.slug} className="rounded-lg border border-black/[0.08] p-3">
                  <div className="grid gap-2 sm:grid-cols-3">
                    <input
                      value={r.label}
                      onChange={(e) =>
                        setShipping((prev) => ({
                          ...prev,
                          regions: prev.regions.map((x) => (x.slug === r.slug ? { ...x, label: e.target.value } : x)),
                        }))
                      }
                      className="rounded-lg border border-black/[0.08] px-2 py-1.5 text-small"
                    />
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={r.base_fee}
                      onChange={(e) =>
                        setShipping((prev) => ({
                          ...prev,
                          regions: prev.regions.map((x) =>
                            x.slug === r.slug ? { ...x, base_fee: Number(e.target.value || 0) } : x
                          ),
                        }))
                      }
                      className="rounded-lg border border-black/[0.08] px-2 py-1.5 text-small"
                    />
                    <div className="text-[11px] text-kofkan-text-muted">slug: {r.slug}</div>
                  </div>
                  <div className="mt-2 space-y-1">
                    {r.cities.map((c, idx) => (
                      <div key={`${r.slug}-${idx}`} className="grid gap-2 sm:grid-cols-[1fr_120px_auto]">
                        <input
                          value={c.name}
                          onChange={(e) =>
                            setShipping((prev) => ({
                              ...prev,
                              regions: prev.regions.map((x) =>
                                x.slug !== r.slug
                                  ? x
                                  : {
                                      ...x,
                                      cities: x.cities.map((z, i) => (i === idx ? { ...z, name: e.target.value } : z)),
                                    }
                              ),
                            }))
                          }
                          className="rounded-lg border border-black/[0.08] px-2 py-1.5 text-small"
                        />
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={c.fee}
                          onChange={(e) =>
                            setShipping((prev) => ({
                              ...prev,
                              regions: prev.regions.map((x) =>
                                x.slug !== r.slug
                                  ? x
                                  : {
                                      ...x,
                                      cities: x.cities.map((z, i) => (i === idx ? { ...z, fee: Number(e.target.value || 0) } : z)),
                                    }
                              ),
                            }))
                          }
                          className="rounded-lg border border-black/[0.08] px-2 py-1.5 text-small"
                        />
                        <button
                          type="button"
                          className="rounded-lg border border-red-200 px-2 py-1.5 text-[11px] font-semibold text-red-700"
                          onClick={() =>
                            setShipping((prev) => ({
                              ...prev,
                              regions: prev.regions.map((x) =>
                                x.slug !== r.slug ? x : { ...x, cities: x.cities.filter((_, i) => i !== idx) }
                              ),
                            }))
                          }
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-[180px_1fr_120px_auto]">
              <select
                value={cityRegion}
                onChange={(e) => setCityRegion(e.target.value)}
                className="rounded-lg border border-black/[0.08] px-2 py-1.5 text-small"
              >
                {shipping.regions.map((r) => (
                  <option key={r.slug} value={r.slug}>
                    {r.label}
                  </option>
                ))}
              </select>
              <input
                value={newCityName}
                onChange={(e) => setNewCityName(e.target.value)}
                placeholder="City name"
                className="rounded-lg border border-black/[0.08] px-2 py-1.5 text-small"
              />
              <input
                type="number"
                min={0}
                step="0.01"
                value={newCityFee}
                onChange={(e) => setNewCityFee(e.target.value)}
                placeholder="Fee"
                className="rounded-lg border border-black/[0.08] px-2 py-1.5 text-small"
              />
              <button
                type="button"
                className="rounded-full bg-kofkan-crimson px-4 py-1.5 text-small font-semibold text-white"
                onClick={() => {
                  const city = newCityName.trim();
                  if (!city) return;
                  setShipping((prev) => ({
                    ...prev,
                    regions: prev.regions.map((r) =>
                      r.slug !== cityRegion
                        ? r
                        : { ...r, cities: [...r.cities, { name: city, fee: Number(newCityFee || 0) }] }
                    ),
                  }));
                  setNewCityName("");
                  setNewCityFee("0");
                }}
              >
                Add city fee
              </button>
            </div>
          </div>

          <div>
            <p className="text-small font-semibold text-kofkan-text-primary">Couriers</p>
            <div className="mt-2 space-y-2">
              {shipping.couriers.map((c, idx) => (
                <div key={`${c.name}-${idx}`} className="grid gap-2 sm:grid-cols-[1fr_140px_auto]">
                  <input
                    value={c.name}
                    onChange={(e) =>
                      setShipping((prev) => ({
                        ...prev,
                        couriers: prev.couriers.map((x, i) => (i === idx ? { ...x, name: e.target.value } : x)),
                      }))
                    }
                    className="rounded-lg border border-black/[0.08] px-2 py-1.5 text-small"
                  />
                  <input
                    type="number"
                    step="0.01"
                    value={c.fee_delta}
                    onChange={(e) =>
                      setShipping((prev) => ({
                        ...prev,
                        couriers: prev.couriers.map((x, i) =>
                          i === idx ? { ...x, fee_delta: Number(e.target.value || 0) } : x
                        ),
                      }))
                    }
                    className="rounded-lg border border-black/[0.08] px-2 py-1.5 text-small"
                  />
                  <button
                    type="button"
                    className="rounded-lg border border-red-200 px-2 py-1.5 text-[11px] font-semibold text-red-700"
                    onClick={() =>
                      setShipping((prev) => ({
                        ...prev,
                        couriers: prev.couriers.filter((_, i) => i !== idx),
                      }))
                    }
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <input
                value={newCourier}
                onChange={(e) => setNewCourier(e.target.value)}
                placeholder="New courier name"
                className="flex-1 rounded-lg border border-black/[0.08] px-2 py-1.5 text-small"
              />
              <button
                type="button"
                className="rounded-full bg-kofkan-crimson px-4 py-1.5 text-small font-semibold text-white"
                onClick={() => {
                  const name = newCourier.trim();
                  if (!name) return;
                  setShipping((prev) => ({ ...prev, couriers: [...prev.couriers, { name, fee_delta: 0 }] }));
                  setNewCourier("");
                }}
              >
                Add courier
              </button>
            </div>
          </div>

          <button
            type="button"
            disabled={saving}
            className="rounded-full bg-kofkan-gold px-5 py-2 text-small font-semibold text-white disabled:opacity-60"
            onClick={() => void saveShipping()}
          >
            {saving ? "Saving shipping…" : "Save shipping matrix"}
          </button>
        </div>
      </section>

      <form
        onSubmit={(e) => void save(e)}
        className="mt-6 grid gap-3 rounded-xl bg-white p-5 shadow-sm ring-1 ring-black/[0.06] sm:grid-cols-[1fr_2fr_auto]"
      >
        <input
          required
          placeholder="setting key (e.g. delivery_fee_default)"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          className="rounded-lg border border-black/[0.08] px-3 py-2 text-small"
        />
        <input
          required
          placeholder="value"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="rounded-lg border border-black/[0.08] px-3 py-2 text-small"
        />
        <button
          type="submit"
          disabled={saving}
          className="rounded-full bg-kofkan-crimson px-4 py-2 text-small font-semibold text-white disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </form>
      <div className="mt-6 overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-black/[0.06]">
        <table className="w-full min-w-[720px] text-left text-small">
          <thead className="border-b border-black/[0.06] text-[11px] uppercase tracking-wider text-kofkan-text-muted">
            <tr>
              <th className="px-4 py-3">Key</th>
              <th className="px-4 py-3">Value</th>
              <th className="px-4 py-3">Updated</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-kofkan-gray-soft">
            {rows.map((r) => (
              <tr key={r.key}>
                <td className="px-4 py-3 font-mono text-[11px]">{r.key}</td>
                <td className="px-4 py-3">{r.value}</td>
                <td className="px-4 py-3 text-[11px] text-kofkan-text-muted">
                  {new Date(r.updated_at).toLocaleString()}
                </td>
              </tr>
            ))}
            {rows.length === 0 && ready && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-small text-kofkan-text-muted">
                  No settings saved yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      </>
      )}
    </div>
  );
}
