import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-[50vh] flex-col items-center justify-center gap-4 bg-kofkan-cream px-6 text-center">
      <h1 className="font-serif text-page-title text-kofkan-text-primary">Page not found</h1>
      <p className="text-body text-kofkan-text-secondary">The page you requested does not exist.</p>
      <Link
        href="/"
        className="kofkan-btn-gold kofkan-tap rounded-[10px] px-6 py-3 text-small font-semibold text-white"
      >
        Back to home
      </Link>
    </main>
  );
}
