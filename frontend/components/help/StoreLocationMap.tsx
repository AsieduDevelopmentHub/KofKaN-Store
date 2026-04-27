import { getStoreLocationConfig } from "@/lib/store-location";

export function StoreLocationMap() {
  const cfg = getStoreLocationConfig();
  if (!cfg) {
    return (
      <section className="mt-4 rounded-[12px] border border-black/[0.08] p-3 text-small text-kofkan-text-muted dark:border-white/15 dark:text-zinc-400">
        Store map is unavailable. Add `NEXT_PUBLIC_STORE_LAT` and `NEXT_PUBLIC_STORE_LNG` then restart the frontend.
      </section>
    );
  }

  const query = `${cfg.lat},${cfg.lng}`;
  const embedUrl = `https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=${cfg.zoom}&output=embed`;
  const openUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;

  return (
    <section className="mt-4 rounded-[12px] border border-black/[0.08] p-3 dark:border-white/15" aria-label="Store location map">
      <p className="mb-2 text-small font-semibold text-kofkan-text-primary dark:text-zinc-100">Find us on the map</p>
      <div className="overflow-hidden rounded-[10px] ring-1 ring-black/[0.08] dark:ring-white/10">
        <iframe
          title={cfg.label || "Store location"}
          src={embedUrl}
          className="h-[260px] w-full border-0"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
        />
      </div>
      <a
        href={openUrl}
        target="_blank"
        rel="noreferrer noopener"
        className="mt-2 inline-block text-small font-semibold text-kofkan-gold hover:underline"
      >
        Open in Google Maps
      </a>
    </section>
  );
}
