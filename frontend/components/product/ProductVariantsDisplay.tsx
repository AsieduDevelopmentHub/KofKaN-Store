"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  fetchProductVariants,
  type ProductVariantPublic,
} from "@/lib/api/product-variants";
import { formatGhs } from "@/lib/mock-data";
import { variantValueSummary } from "@/lib/variant-display";

type Props = {
  productId: number;
  basePrice: number;
  /** Supplied by parent to avoid a duplicate network call. */
  variants?: ProductVariantPublic[];
  /** Controlled-mode selection; when omitted the component manages it. */
  selectedId?: number | null;
  onSelectedIdChange?: (id: number | null) => void;
  onVariantChange?: (variant: ProductVariantPublic | null) => void;
};

type AttrMap = Record<string, string>;

function attrValue(v: ProductVariantPublic, key: string): string | null {
  const a = v.attributes as Record<string, unknown> | null | undefined;
  if (!a) return null;
  const raw = a[key];
  if (raw == null) return null;
  const s = String(raw).trim();
  return s.length > 0 ? s : null;
}

function collectAttrKeys(variants: ProductVariantPublic[]): string[] {
  const counts = new Map<string, number>();
  for (const v of variants) {
    const keys = Object.keys(v.attributes ?? {});
    for (const k of keys) counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  // Only treat a key as a structured dimension when most variants carry it.
  return [...counts.entries()]
    .filter(([, n]) => n >= Math.max(1, Math.floor(variants.length / 2)))
    .map(([k]) => k);
}

function prettyKey(k: string): string {
  return k
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function ProductVariantsDisplay({
  productId,
  basePrice,
  variants: variantsProp,
  selectedId: controlledSelectedId,
  onSelectedIdChange,
  onVariantChange,
}: Props) {
  const isControlled = controlledSelectedId !== undefined;
  const [internalVariants, setInternalVariants] = useState<ProductVariantPublic[]>([]);
  const [loading, setLoading] = useState(!variantsProp);
  const [internalSelectedId, setInternalSelectedId] = useState<number | null>(null);

  // Dedicated state for attribute selection to decouple from the "current variant"
  const [selectedAttrs, setSelectedAttrs] = useState<AttrMap>({});

  const selectedId = isControlled ? controlledSelectedId : internalSelectedId;
  const setSelectedId = (id: number | null) => {
    if (isControlled) onSelectedIdChange?.(id);
    else setInternalSelectedId(id);
  };

  useEffect(() => {
    if (variantsProp) {
      setInternalVariants(variantsProp);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetchProductVariants(productId)
      .then((data) => {
        if (cancelled) return;
        setInternalVariants(data);
      })
      .catch(() => {
        if (cancelled) return;
        setInternalVariants([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [productId, variantsProp]);

  const variants = variantsProp ?? internalVariants;

  const selected = useMemo(
    () => variants.find((v) => v.id === selectedId) ?? null,
    [variants, selectedId]
  );

  // Sync selectedAttrs when selectedId changes (e.g. from parent/thumbnail)
  useEffect(() => {
    if (selected) {
      const m: AttrMap = {};
      const keys = collectAttrKeys(variants);
      for (const k of keys) {
        const v = attrValue(selected, k);
        if (v) m[k] = v;
      }
      setSelectedAttrs(m);
    }
  }, [selected, variants]);

  const lastFiredId = useRef<number | "unset">("unset");
  useEffect(() => {
    const id = selected ? selected.id : null;
    if (lastFiredId.current === id) return;
    lastFiredId.current = id as number | "unset";
    onVariantChange?.(selected);
  }, [selected, onVariantChange]);

  const attrKeys = useMemo(() => collectAttrKeys(variants), [variants]);

  // Find the variant that matches all current attribute selections
  const resolveVariant = (attrs: AttrMap): ProductVariantPublic | null => {
    const keysPresent = Object.keys(attrs);
    if (keysPresent.length === 0) return null;

    // A match is only valid if it satisfies ALL currently selected attributes
    // AND covers ALL possible attribute dimensions for this product.
    const allKeysCovered = attrKeys.every((k) => attrs[k]);
    if (!allKeysCovered) return null;

    return (
      variants.find((v) =>
        attrKeys.every((k) => attrValue(v, k) === attrs[k])
      ) ?? null
    );
  };

  const pickAttr = (key: string, value: string) => {
    setSelectedAttrs((prev) => {
      const next = { ...prev };
      if (next[key] === value) {
        delete next[key];
      } else {
        next[key] = value;
      }

      // Auto-selection logic: if this new selection uniquely identifies a variant,
      // select it immediately.
      const v = resolveVariant(next);
      setSelectedId(v ? v.id : null);

      return next;
    });
  };

  /**
   * Professional cross-filtering: is this specific value "possible" given the
   * *other* attributes already selected?
   */
  const isOptionDisabled = (key: string, value: string): boolean => {
    // If we were to pick this value, would ANY variant match the remaining selections?
    const testAttrs = { ...selectedAttrs, [key]: value };

    return !variants.some((v) => {
      // Must match every selection EXCEPT the one we are currently testing (which is handled by testAttrs)
      return Object.entries(testAttrs).every(([k, val]) => {
        const vVal = attrValue(v, k);
        return vVal === val;
      });
    });
  };

  const isOptionOutOfStock = (key: string, value: string): boolean => {
    const testAttrs = { ...selectedAttrs, [key]: value };
    const matches = variants.filter((v) => {
      return Object.entries(testAttrs).every(([k, val]) => attrValue(v, k) === val);
    });
    if (matches.length === 0) return true;
    return matches.every((v) => v.in_stock <= 0);
  };

  if (loading || variants.length === 0) {
    return null;
  }

  const hasAttributes = attrKeys.length > 0;

  return (
    <section className="mt-5 rounded-[10px] bg-white p-4 ring-1 ring-black/[0.06] dark:bg-zinc-900 dark:ring-white/10">
      <div className="flex items-baseline justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-kofkan-text-muted dark:text-zinc-500">
          Options
        </p>
        {selected && (
          <p className="text-[11px] text-kofkan-text-muted dark:text-zinc-500">
            {selected.in_stock > 0 ? `${selected.in_stock} in stock` : "Out of stock"}
          </p>
        )}
      </div>

      {hasAttributes ? (
        <div className="mt-3 space-y-4">
          {attrKeys.map((key) => {
            const values = Array.from(
              new Set(
                variants
                  .map((v) => attrValue(v, key))
                  .filter((x): x is string => !!x)
              )
            );
            if (values.length === 0) return null;
            return (
              <div key={key}>
                <p className="text-[11px] font-semibold text-kofkan-text-secondary dark:text-zinc-400">
                  {prettyKey(key)}
                  {selectedAttrs[key] && (
                    <span className="ml-1 text-kofkan-text-muted dark:text-zinc-500">
                      · <span className="text-kofkan-text-primary dark:text-zinc-100">{selectedAttrs[key]}</span>
                    </span>
                  )}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {values.map((val) => {
                    const isSelected = selectedAttrs[key] === val;
                    const isDisabled = isOptionDisabled(key, val);
                    const isSoldOut = !isDisabled && isOptionOutOfStock(key, val);

                    return (
                      <button
                        key={val}
                        type="button"
                        disabled={isDisabled}
                        onClick={() => pickAttr(key, val)}
                        className={`min-w-[44px] rounded-lg border px-3 py-2 text-[11px] font-semibold transition-all ${
                          isSelected
                            ? "border-kofkan-gold bg-kofkan-gold/10 text-kofkan-text-primary ring-1 ring-kofkan-gold dark:text-zinc-100"
                            : isDisabled
                            ? "cursor-not-allowed border-dashed border-kofkan-gray-soft bg-transparent text-kofkan-text-muted opacity-40 dark:border-white/5"
                            : "border-kofkan-gray-soft bg-white text-kofkan-text-primary hover:border-kofkan-gold/50 dark:border-white/10 dark:bg-zinc-800 dark:text-zinc-200"
                        } ${isSoldOut ? "relative overflow-hidden opacity-60 after:absolute after:inset-0 after:bg-[linear-gradient(45deg,transparent_45%,#ccc_50%,transparent_55%)] after:content-['']" : ""}`}
                        aria-pressed={isSelected}
                      >
                        {val}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          {variants.map((v) => {
            const isSelected = v.id === selectedId;
            const outOfStock = v.in_stock <= 0;
            return (
              <button
                key={v.id}
                type="button"
                disabled={outOfStock}
                onClick={() => setSelectedId(isSelected ? null : v.id)}
                className={`rounded-lg border px-4 py-2 text-[11px] font-semibold transition ${
                  isSelected
                    ? "border-kofkan-gold bg-kofkan-gold/10 text-kofkan-text-primary ring-1 ring-kofkan-gold dark:text-zinc-100"
                    : "border-kofkan-gray-soft bg-white text-kofkan-text-primary hover:border-kofkan-gold/50 dark:border-white/10 dark:bg-zinc-800 dark:text-zinc-200"
                } ${outOfStock ? "opacity-50 line-through" : ""}`}
                aria-pressed={isSelected}
              >
                {variantValueSummary(v)}
                {v.price_delta !== 0 && (
                  <span className="ml-1.5 font-bold text-kofkan-gold">
                    {v.price_delta > 0 ? "+" : ""}
                    {formatGhs(Math.abs(v.price_delta))}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {selected && (
        <div className="mt-4 border-t border-kofkan-gray-soft pt-3 dark:border-white/10">
          <p className="text-[11px] text-kofkan-text-secondary dark:text-zinc-400">
            Selected: <span className="font-semibold text-kofkan-text-primary dark:text-zinc-100">{variantValueSummary(selected)}</span>
          </p>
          <p className="mt-0.5 text-small font-bold text-kofkan-gold">
            {formatGhs(basePrice + (selected.price_delta ?? 0))}
          </p>
        </div>
      )}
    </section>
  );
}
