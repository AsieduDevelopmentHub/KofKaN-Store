import { whatsappHelpUrl } from "@/lib/site";

/** WhatsApp-only strip (no fallback copy). */
export function HomeNeedHelpBanner() {
  const wa = whatsappHelpUrl();
  if (!wa) return null;

  return (
    <aside
      className="border-b border-kofkan-gray-soft bg-emerald-600/[0.08] px-4 py-3.5 text-center"
      aria-label="Shopping help"
    >
      <p className="mx-auto max-w-mobile text-small leading-relaxed text-kofkan-text-primary">
        Having trouble finding something?{" "}
        <a
          href={wa}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-emerald-800 underline decoration-emerald-600/50 underline-offset-2 hover:text-emerald-900"
        >
          Message us on WhatsApp
        </a>{" "}
        — we&apos;ll help you choose.
      </p>
    </aside>
  );
}
