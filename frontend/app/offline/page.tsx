import Link from "next/link";

export const dynamic = "force-static";

export default function OfflinePage() {
  return (
    <main className="min-h-screen bg-kofkan-bg-deep text-white">
      <div className="kofkan-circuit-grid relative">
        <div className="kofkan-storefront-max px-5 pb-16 pt-14">
          <div className="max-w-xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/60">
              Offline mode
            </p>
            <h1 className="mt-3 font-mono text-[2rem] font-semibold leading-tight tracking-[0.03em]">
              You’re offline.
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-white/70">
              KofKaN Store can’t reach the server right now. Check your connection and try again —
              your cart will still be here.
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              <a
                href="/"
                className="kofkan-btn-cyan kofkan-tap inline-flex items-center justify-center rounded-[12px] px-5 py-3 text-sm font-semibold"
              >
                Retry
              </a>
              <Link
                href="/"
                className="kofkan-tap inline-flex items-center justify-center rounded-[12px] border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10"
              >
                Back to home
              </Link>
              <Link
                href="/shop"
                className="kofkan-tap inline-flex items-center justify-center rounded-[12px] border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10"
              >
                Browse shop
              </Link>
            </div>

            <div className="mt-7 rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/55">
                Tip
              </p>
              <p className="mt-2 text-sm text-white/70">
                If this is your first visit, some pages may need a connection once to be cached for
                offline use.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

