"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      console.error("[RouteError]", error);
    }
  }, [error]);

  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center gap-4 bg-kofkan-cream px-6 text-center dark:bg-zinc-950">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-kofkan-text-muted dark:text-zinc-500">
        Error 500
      </p>
      <h1 className="font-serif text-page-title text-kofkan-text-primary dark:text-zinc-100">
        Something went wrong
      </h1>
      <p className="max-w-md text-body text-kofkan-text-secondary dark:text-zinc-400">
        We hit an unexpected issue while loading this page. You can try again, or head back to the home page.
        {error.digest ? (
          <span className="mt-2 block text-[11px] text-kofkan-text-muted dark:text-zinc-500">
            Reference: {error.digest}
          </span>
        ) : null}
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={() => reset()}
          className="kofkan-btn-gold kofkan-tap rounded-[10px] px-6 py-3 text-small font-semibold text-white"
        >
          Try again
        </button>
        <Link
          href="/"
          className="kofkan-tap rounded-[10px] border border-kofkan-gray-soft bg-white px-6 py-3 text-small font-semibold text-kofkan-text-primary dark:border-white/15 dark:bg-zinc-900 dark:text-zinc-100"
        >
          Back to home
        </Link>
      </div>
    </main>
  );
}
