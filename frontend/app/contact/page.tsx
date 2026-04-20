import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";

import { NewsletterForm } from "@/components/NewsletterForm";

export default function ContactPage() {
  return (
    <main>
      <section className="border-b border-kofkan-border bg-kofkan-bg-secondary">
        <div className="kofkan-shell py-12 md:py-16">
          <h1 className="text-3xl font-bold md:text-4xl">Contact KofKaN</h1>
          <p className="mt-3 max-w-2xl text-kofkan-muted">
            Sourcing, bulk orders, or technical questions — we respond within one business day.
          </p>
        </div>
      </section>
      <div className="kofkan-shell grid gap-8 py-10 md:grid-cols-2">
        <div className="space-y-4 rounded-2xl border border-kofkan-border bg-kofkan-white p-6 shadow-sm">
          <div className="flex gap-3">
            <Mail className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-semibold">Email</p>
              <a href="mailto:support@kofkan.store" className="text-sm text-kofkan-charcoal hover:underline">
                support@kofkan.store
              </a>
            </div>
          </div>
          <div className="flex gap-3">
            <Phone className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-semibold">Phone</p>
              <p className="text-sm text-kofkan-muted">+233 24 000 0000</p>
            </div>
          </div>
          <div className="flex gap-3">
            <MapPin className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-semibold">Location</p>
              <p className="text-sm text-kofkan-muted">Kumasi, Ghana</p>
            </div>
          </div>
          <Link href="/shop" className="inline-block text-sm font-semibold text-kofkan-black underline">
            Browse the catalog →
          </Link>
        </div>
        <div className="rounded-2xl border border-kofkan-border bg-kofkan-bg-secondary p-6">
          <h2 className="text-lg font-semibold">Newsletter</h2>
          <p className="mt-1 text-sm text-kofkan-muted">New arrivals and restock alerts. No spam.</p>
          <NewsletterForm />
        </div>
      </div>
    </main>
  );
}
