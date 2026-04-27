"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { FaSearch } from "@/components/FaIcons";
import { useCatalog } from "@/context/CatalogContext";
import {
  TRENDING_SEARCHES,
  addRecentSearch,
  clearRecentSearches,
  matchesQuery,
  readRecentSearches,
} from "@/lib/search-helpers";
import { cleanImageUrl } from "@/lib/clean-image-url";

type Props = {
  /** Shows a compact variant that fits in the home header (mobile). */
  variant?: "default" | "compact";
  placeholder?: string;
  autoFocus?: boolean;
};

const MAX_SUGGESTIONS = 6;

/**
 * Global search input with autocomplete. Submitting or picking a suggestion
 * persists the term via `addRecentSearch` so the `/search` page can show
 * recent queries.
 */
export function SearchAutocomplete({
  variant = "default",
  placeholder = "Search Arduino, ESP32, sensors, motors…",
  autoFocus = false,
}: Props) {
  const router = useRouter();
  const listboxId = useId();
  const { products, categories } = useCatalog();

  const [term, setTerm] = useState("");
  const [open, setOpen] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setRecent(readRecentSearches());
  }, []);

  useEffect(() => {
    function onDocClick(ev: MouseEvent) {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(ev.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const suggestions = useMemo(() => {
    const q = term.trim();
    if (!q) return [];
    return products.filter((p) => matchesQuery(p, q)).slice(0, MAX_SUGGESTIONS);
  }, [products, term]);

  const matchedCategories = useMemo(() => {
    const q = term.trim().toLowerCase();
    if (!q) return [];
    return categories.filter((c) => c.label.toLowerCase().includes(q)).slice(0, 3);
  }, [categories, term]);

  const runSearch = useCallback(
    (raw: string) => {
      const q = raw.trim();
      if (!q) return;
      addRecentSearch(q);
      setOpen(false);
      router.push(`/search?q=${encodeURIComponent(q)}`);
    },
    [router],
  );

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    runSearch(term);
  };

  const onClear = () => {
    clearRecentSearches();
    setRecent([]);
  };

  const compact = variant === "compact";

  return (
    <div ref={wrapRef} className="relative w-full">
      <form role="search" onSubmit={onSubmit}>
        <label className="sr-only" htmlFor={`${listboxId}-input`}>
          Search KofKaN
        </label>
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-kofkan-text-muted">
            <FaSearch className="!h-4 !w-4" />
          </span>
          <input
            ref={inputRef}
            id={`${listboxId}-input`}
            type="search"
            role="combobox"
            aria-controls={listboxId}
            aria-expanded={open}
            aria-autocomplete="list"
            value={term}
            onChange={(e) => {
              setTerm(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            autoFocus={autoFocus}
            placeholder={placeholder}
            className={`w-full rounded-[10px] border-0 bg-kofkan-gray-soft text-body text-kofkan-text-primary outline-none ring-1 ring-transparent placeholder:text-kofkan-text-muted focus:ring-2 focus:ring-kofkan-gold/40 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500 ${
              compact ? "py-2 pl-9 pr-3 text-small" : "py-3 pl-10 pr-3"
            }`}
          />
          {term ? (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => {
                setTerm("");
                inputRef.current?.focus();
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full px-2 py-1 text-small text-kofkan-text-muted hover:text-kofkan-text-primary"
            >
              ×
            </button>
          ) : null}
        </div>
      </form>

      {open && (
        <div
          id={listboxId}
          role="listbox"
          className="absolute left-0 right-0 top-full z-[55] mt-2 max-h-[min(70vh,26rem)] w-full overflow-y-auto overflow-x-hidden rounded-[12px] border border-kofkan-gray-soft bg-white shadow-xl dark:border-white/10 dark:bg-zinc-900"
        >
          {term.trim().length > 0 ? (
            suggestions.length > 0 || matchedCategories.length > 0 ? (
              <ul className="divide-y divide-kofkan-gray-soft/70 dark:divide-white/10">
                {matchedCategories.map((c) => (
                  <li key={`cat-${c.slug}`}>
                    <Link
                      href={`/category/${encodeURIComponent(c.slug)}`}
                      className="kofkan-tap flex items-center justify-between px-3 py-2.5 text-small text-kofkan-text-primary hover:bg-kofkan-cream dark:text-zinc-100 dark:hover:bg-zinc-800"
                      onClick={() => {
                        addRecentSearch(c.label);
                        setOpen(false);
                      }}
                    >
                      <span>
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-kofkan-text-muted">
                          Category ·{" "}
                        </span>
                        {c.label}
                      </span>
                      <span aria-hidden className="text-kofkan-text-muted">
                        ›
                      </span>
                    </Link>
                  </li>
                ))}
                {suggestions.map((p) => (
                  <li key={p.id}>
                    <Link
                      href={`/product/${p.id}`}
                      className="kofkan-tap flex items-center gap-3 px-3 py-2.5 hover:bg-kofkan-cream dark:hover:bg-zinc-800"
                      onClick={() => {
                        addRecentSearch(p.name);
                        setOpen(false);
                      }}
                    >
                      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-kofkan-cream">
                        <Image src={cleanImageUrl(p.image)} alt="" fill sizes="40px" className="object-cover" unoptimized />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-small font-medium text-kofkan-text-primary dark:text-zinc-100">
                          {p.name}
                        </p>
                        <p className="text-[11px] text-kofkan-text-muted dark:text-zinc-500">
                          {p.categoryLabel}
                        </p>
                      </div>
                    </Link>
                  </li>
                ))}
                <li>
                  <button
                    type="button"
                    onClick={() => runSearch(term)}
                    className="kofkan-tap w-full px-3 py-2.5 text-left text-small font-semibold text-kofkan-gold hover:bg-kofkan-cream dark:hover:bg-zinc-800"
                  >
                    Search all results for “{term}”
                  </button>
                </li>
              </ul>
            ) : (
              <div className="px-3 py-4 text-small text-kofkan-text-secondary dark:text-zinc-400">
                <p>No matches. Press enter to search anyway.</p>
                <button
                  type="button"
                  onClick={() => runSearch(term)}
                  className="mt-2 font-semibold text-kofkan-gold"
                >
                  Search for “{term}”
                </button>
              </div>
            )
          ) : (
            <div className="space-y-3 px-3 py-3">
              {recent.length > 0 && (
                <div>
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-kofkan-text-muted dark:text-zinc-500">
                      Recent
                    </p>
                    <button
                      type="button"
                      className="text-[11px] font-semibold text-kofkan-text-muted hover:text-kofkan-crimson"
                      onClick={onClear}
                    >
                      Clear
                    </button>
                  </div>
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {recent.map((r) => (
                      <li key={`r-${r}`}>
                        <button
                          type="button"
                          onClick={() => runSearch(r)}
                          className="rounded-full bg-kofkan-gray-soft px-3 py-1 text-[11px] font-semibold text-kofkan-text-secondary hover:bg-kofkan-cream dark:bg-zinc-800 dark:text-zinc-300"
                        >
                          {r}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-kofkan-text-muted dark:text-zinc-500">
                  Trending
                </p>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {TRENDING_SEARCHES.map((r) => (
                    <li key={`t-${r}`}>
                      <button
                        type="button"
                        onClick={() => runSearch(r)}
                        className="rounded-full bg-kofkan-cream px-3 py-1 text-[11px] font-semibold text-kofkan-text-primary hover:bg-kofkan-gray-soft dark:bg-zinc-800 dark:text-zinc-200"
                      >
                        {r}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
