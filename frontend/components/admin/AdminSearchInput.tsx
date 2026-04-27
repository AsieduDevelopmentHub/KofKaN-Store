"use client";

import { ChangeEvent } from "react";

type Props = {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  /** Optional visual hint (e.g. "12 of 84 shown"). */
  hint?: string;
  /** Width control on larger screens. Defaults to a comfortable 20rem. */
  maxWidthClassName?: string;
  className?: string;
};

/**
 * Compact search input used across admin list views. Keep styling consistent so
 * every section presents the same affordance.
 */
export function AdminSearchInput({
  value,
  onChange,
  placeholder = "Search…",
  hint,
  maxWidthClassName = "sm:max-w-xs",
  className = "",
}: Props) {
  return (
    <div className={`flex w-full flex-col gap-1 sm:w-auto ${maxWidthClassName} ${className}`}>
      <div className="relative w-full">
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-kofkan-text-muted"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="9" cy="9" r="6" />
          <path strokeLinecap="round" d="m14 14 3.5 3.5" />
        </svg>
        <input
          type="search"
          value={value}
          onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-full border border-black/[0.08] bg-white py-2 pl-9 pr-10 text-small text-kofkan-text-primary placeholder:text-kofkan-text-muted focus:border-kofkan-gold focus:outline-none"
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            aria-label="Clear search"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full px-2 py-0.5 text-[11px] font-semibold text-kofkan-text-muted hover:bg-kofkan-cream hover:text-kofkan-text-primary"
          >
            Clear
          </button>
        )}
      </div>
      {hint && <p className="px-1 text-[11px] text-kofkan-text-muted">{hint}</p>}
    </div>
  );
}
