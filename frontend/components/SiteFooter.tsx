import Image from "next/image";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-kofkan-border bg-kofkan-bg-secondary pb-20 md:pb-8">
      <div className="kofkan-shell py-10 text-sm text-kofkan-charcoal">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-kofkan-border bg-white px-2 py-1">
          <Image src="/brand/logo.jpg" alt="KofKaN logo" width={24} height={24} className="h-6 w-6 rounded-full object-cover" />
          <span className="text-xs font-semibold tracking-wide">KofKaN</span>
        </div>
        <p className="font-semibold">KofKaN Store - Electronics Components in Ghana</p>
        <p className="mt-2 max-w-2xl text-kofkan-muted">
          Fast delivery, technical-grade components, and reliable support for makers and engineers.
        </p>
      </div>
    </footer>
  );
}
