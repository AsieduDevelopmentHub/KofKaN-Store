import Link from "next/link";
import { NewsletterFooterForm } from "@/components/home/NewsletterFooterForm";
import { faqUrl, privacyUrl, KOFKAN_LOCATION_LINE, termsUrl } from "@/lib/site";

const primary = [
  { href: "/shop", label: "Shop" },
  { href: "/cart", label: "Cart" },
  { href: "/orders", label: "Orders" },
  { href: "/account", label: "Account" },
  { href: "/help", label: "Help center" },
] as const;

const onPage = [
  { href: "/#categories", label: "Categories" },
  { href: "/#featured", label: "Featured" },
  { href: "/#trust", label: "Why KofKaN" },
  { href: "/#delivery", label: "Delivery & visit" },
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#need-help", label: "Need help?" },
] as const;

export function HomeFooter() {
  return (
    <footer className="border-t border-kofkan-gray-soft bg-kofkan-deep px-4 py-8 text-kofkan-gray-soft dark:border-white/10">
      <div className="mx-auto max-w-mobile">
        <p className="font-serif text-small font-semibold tracking-[0.12em] text-white">KOFKAN</p>
        <p className="mt-1 text-[11px] leading-relaxed text-white/60">
          Embedded systems &amp; robotics — microcontrollers, sensors, motors, power, and prototyping tools.
        </p>
        <p className="mt-3 text-[11px] leading-relaxed text-white/55">
          <span className="text-white/45">Location · </span>
          {KOFKAN_LOCATION_LINE}
        </p>

        <nav className="mt-6" aria-label="Footer">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-kofkan-gold/90">Navigate</p>
          <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2">
            {primary.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="text-small text-white/80 hover:text-kofkan-gold">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-5 text-[10px] font-semibold uppercase tracking-wider text-kofkan-gold/90">
            On this page
          </p>
          <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2">
            {onPage.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="text-small text-white/70 hover:text-kofkan-gold">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-5 text-[10px] font-semibold uppercase tracking-wider text-kofkan-gold/90">
            Legal & help
          </p>
          <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2">
            <li>
              <Link href="/help" className="text-small text-white/70 hover:text-kofkan-gold">
                Help center
              </Link>
            </li>
            <li>
              <Link href="/help/contact" className="text-small text-white/70 hover:text-kofkan-gold">
                Contact support
              </Link>
            </li>
            <li>
              <Link href={faqUrl()} className="text-small text-white/70 hover:text-kofkan-gold">
                FAQs
              </Link>
            </li>
            <li>
              <Link href={termsUrl()} className="text-small text-white/70 hover:text-kofkan-gold">
                Terms
              </Link>
            </li>
            <li>
              <Link href={privacyUrl()} className="text-small text-white/70 hover:text-kofkan-gold">
                Privacy
              </Link>
            </li>
          </ul>
        </nav>

        <NewsletterFooterForm />

        <p className="mt-8 border-t border-white/10 pt-6 text-center text-[10px] text-white/45">
          © {new Date().getFullYear()} KofKaN Store. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
