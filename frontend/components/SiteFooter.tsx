import Image from "next/image";
import Link from "next/link";

import { NewsletterForm } from "@/components/NewsletterForm";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-kofkan-border bg-kofkan-bg-secondary pb-20 md:pb-8">
      <div className="kofkan-shell grid gap-10 py-10 text-sm text-kofkan-charcoal md:grid-cols-2">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-kofkan-border bg-white px-2 py-1">
            <Image src="/brand/logo.jpg" alt="KofKaN logo" width={24} height={24} className="h-6 w-6 rounded-full object-cover" />
            <span className="text-xs font-semibold tracking-wide">KofKaN</span>
          </div>
          <p className="font-semibold">KofKaN Store — electronics in Ghana</p>
          <p className="mt-2 max-w-md text-kofkan-muted">
            Components, dev boards, and power parts for makers and professionals. Accra &amp; Kumasi dispatch.
          </p>
          <div className="mt-4 flex flex-wrap gap-4 text-xs font-medium">
            <Link href="/shop" className="hover:underline">
              Shop
            </Link>
            <Link href="/contact" className="hover:underline">
              Contact
            </Link>
            <Link href="/auth/login" className="hover:underline">
              Account
            </Link>
          </div>
        </div>
        <div>
          <NewsletterForm variant="footer" />
        </div>
      </div>
    </footer>
  );
}
