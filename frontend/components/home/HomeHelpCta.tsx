import Link from "next/link";
import { whatsappHelpUrl } from "@/lib/site";

export function HomeHelpCta() {
  const wa = whatsappHelpUrl();

  return (
    <section
      id="need-help"
      className="scroll-mt-20 bg-white px-4 py-6 dark:bg-zinc-950"
      aria-labelledby="help-heading"
    >
      <div className="mx-auto max-w-mobile">
        <div className="rounded-[10px] bg-gradient-to-br from-kofkan-crimson to-[#5c1f24] px-5 py-5 text-center shadow-md ring-1 ring-black/10">
          <h2 id="help-heading" className="font-serif text-section-title font-semibold text-white">
            Need a hand?
          </h2>
          <p className="mt-2 text-small leading-relaxed text-white/85">
            Orders, account settings, and more — your hub is one tap away.
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-center">
            <Link
              href="/account"
              className="kofkan-tap inline-flex items-center justify-center rounded-[10px] bg-kofkan-gold px-5 py-2.5 text-small font-semibold text-white shadow-sm"
            >
              Account & help
            </Link>
            <Link
              href="/orders"
              className="kofkan-tap inline-flex items-center justify-center rounded-[10px] border border-white/40 bg-white/10 px-5 py-2.5 text-small font-semibold text-white backdrop-blur-sm"
            >
              Track orders
            </Link>
            {wa ? (
              <a
                href={wa}
                target="_blank"
                rel="noopener noreferrer"
                className="kofkan-tap inline-flex items-center justify-center rounded-[10px] border border-emerald-400/50 bg-emerald-500/20 px-5 py-2.5 text-small font-semibold text-white"
              >
                WhatsApp us
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
