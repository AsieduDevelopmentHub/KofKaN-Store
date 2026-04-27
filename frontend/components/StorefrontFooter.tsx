import Link from "next/link";
import { KofKaNLogo } from "@/components/KofKaNLogo";
import { NewsletterFooterForm } from "@/components/home/NewsletterFooterForm";
import { 
  FaFacebook, 
  FaInstagram, 
  FaTwitter, 
  FaCreditCard, 
  FaLock 
} from "@/components/FaIcons";

const onPage = [
  { href: "/#intro", label: "Brand" },
  { href: "/#categories", label: "Categories" },
  { href: "/#trust", label: "Why KofKaN" },
  { href: "/#delivery", label: "Delivery" },
  { href: "/#how-it-works", label: "Process" },
  { href: "/#need-help", label: "Help" },
] as const;

export function StorefrontFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-12 bg-white border-t border-kofkan-gray-soft px-4 pb-24 pt-10 dark:bg-zinc-900 dark:border-white/10">
      <div className="mx-auto max-w-mobile">
        <div className="flex flex-col items-center text-center">
          <KofKaNLogo className="h-10 w-auto" />
          <p className="mt-4 text-small text-kofkan-text-secondary dark:text-zinc-400 max-w-[280px]">
            Embedded systems, robotics, and programming gear for makers, students, and engineers in Ghana.
          </p>
          
          <div className="mt-6 flex items-center gap-6">
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="text-kofkan-text-muted hover:text-kofkan-gold transition dark:text-zinc-500">
              <FaInstagram className="!h-5 !w-5" />
            </a>
            <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="text-kofkan-text-muted hover:text-kofkan-gold transition dark:text-zinc-500">
              <FaFacebook className="!h-5 !w-5" />
            </a>
            <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="text-kofkan-text-muted hover:text-kofkan-gold transition dark:text-zinc-500">
              <FaTwitter className="!h-5 !w-5" />
            </a>
          </div>
        </div>

        <div className="mt-10 grid grid-cols-2 gap-8 border-t border-kofkan-gray-soft pt-10 dark:border-white/5">
          <div className="space-y-4">
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-kofkan-text-primary dark:text-zinc-200">Shop</h3>
            <ul className="space-y-2 text-small text-kofkan-text-secondary dark:text-zinc-400">
              <li><Link href="/shop" className="hover:text-kofkan-gold">All Products</Link></li>
              <li><Link href="/shop?cat=microcontrollers" className="hover:text-kofkan-gold">Microcontrollers</Link></li>
              <li><Link href="/shop?cat=sensors" className="hover:text-kofkan-gold">Sensors</Link></li>
              <li><Link href="/shop?cat=robotics-motors" className="hover:text-kofkan-gold">Robotics &amp; Motors</Link></li>
              <li><Link href="/shop?cat=power-batteries" className="hover:text-kofkan-gold">Power &amp; Batteries</Link></li>
              <li><Link href="/shop?cat=tools-prototyping" className="hover:text-kofkan-gold">Tools &amp; Prototyping</Link></li>
            </ul>
          </div>
          <div className="space-y-4">
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-kofkan-text-primary dark:text-zinc-200">Support</h3>
            <ul className="space-y-2 text-small text-kofkan-text-secondary dark:text-zinc-400">
              <li><Link href="/help" className="hover:text-kofkan-gold">FAQ</Link></li>
              <li><Link href="/help/shipping" className="hover:text-kofkan-gold">Shipping</Link></li>
              <li><Link href="/help/returns" className="hover:text-kofkan-gold">Returns</Link></li>
              <li><Link href="/help/contact" className="hover:text-kofkan-gold">Contact Us</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-kofkan-gray-soft pt-8 dark:border-white/5">
          <h3 className="text-center text-[11px] font-bold uppercase tracking-widest text-kofkan-text-primary dark:text-zinc-200 mb-4">Quick Links</h3>
          <ul className="flex flex-wrap justify-center gap-x-6 gap-y-2">
            {onPage.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="text-[12px] text-kofkan-text-secondary hover:text-kofkan-gold dark:text-zinc-400">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-10 border-t border-kofkan-gray-soft pt-10 dark:border-white/5">
          <NewsletterFooterForm />
        </div>

        <div className="mt-10 flex flex-col items-center gap-6 border-t border-kofkan-gray-soft pt-10 dark:border-white/5">
          <div className="flex items-center gap-2 text-[10px] font-medium text-kofkan-text-muted dark:text-zinc-500">
            <FaLock className="!h-3 !w-3 text-emerald-600 dark:text-emerald-500" />
            <span>Secure Checkout with Paystack</span>
          </div>
          <div className="flex items-center gap-3 grayscale opacity-60 dark:invert">
             <FaCreditCard className="!h-5 !w-5" />
             <span className="text-[9px] font-bold uppercase">Visa · Mastercard · MoMo</span>
          </div>
        </div>

        <div className="mt-10 text-center">
          <p className="text-[10px] text-kofkan-text-muted dark:text-zinc-600">
            &copy; {currentYear} KofKaN Store. All rights reserved.
          </p>
          <div className="mt-2 flex justify-center gap-4 text-[9px] font-medium text-kofkan-text-muted dark:text-zinc-600">
            <Link href="/terms" className="hover:underline">Terms</Link>
            <Link href="/privacy" className="hover:underline">Privacy</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
