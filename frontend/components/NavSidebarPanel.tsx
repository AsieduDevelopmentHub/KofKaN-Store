"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { useNavDrawer } from "@/context/NavDrawerContext";
import { useTheme } from "@/context/ThemeContext";
import { faqUrl, privacyUrl, KOFKAN_LOCATION_LINE, termsUrl } from "@/lib/site";

const MAIN_LINKS: { href: string; label: string; description: string }[] = [
  { href: "/", label: "Home", description: "Hero, collections, and featured products." },
  { href: "/shop", label: "Shop", description: "Browse the full catalog with grid or list view." },
  { href: "/cart", label: "Cart", description: "Review items and proceed when you are ready." },
  { href: "/orders", label: "Orders", description: "Track purchases and delivery status." },
  { href: "/account", label: "Account", description: "Sign in, profile, and preferences." },
  { href: "/help", label: "Help center", description: "Shipping, returns, payments, and support contacts." },
];

const DISCOVER_LINKS: { href: string; label: string; description: string }[] = [
  { href: "/#categories", label: "Categories", description: "Jump to all collections on the home page." },
  { href: "/#featured", label: "Featured", description: "Curated picks and seasonal highlights." },
  { href: "/#delivery", label: "Delivery & visit", description: "Pickup, nationwide shipping, and our location." },
  { href: "/#trust", label: "Why KofKaN", description: "Quality, secure checkout, and how we help." },
  { href: "/#need-help", label: "Need help?", description: "WhatsApp (if configured) and support links." },
];

const HELP_LEGAL_LINKS: { href: string; label: string; description: string }[] = [
  { href: "/help", label: "Help center", description: "Browse support guides by topic." },
  { href: "/help/contact", label: "Contact support", description: "Email, WhatsApp, and store location map." },
  { href: faqUrl(), label: "FAQs", description: "Common questions about ordering and delivery." },
  { href: termsUrl(), label: "Terms of service", description: "How you may use KofKaN Store." },
  { href: privacyUrl(), label: "Privacy policy", description: "How we handle your data." },
];

const ADMIN_LINK = {
  href: "/system",
  label: "Admin",
  description: "Store metrics and analytics for team accounts.",
} as const;

function NavDisclosure({
  title,
  items,
  closeDrawer,
}: {
  title: string;
  items: { href: string; label: string; description: string }[];
  closeDrawer: () => void;
}) {
  return (
    <details className="group rounded-[10px] ring-1 ring-transparent open:bg-kofkan-cream open:ring-black/[0.04] dark:open:bg-zinc-900 dark:open:ring-white/10">
      <summary className="kofkan-tap cursor-pointer list-none rounded-[10px] px-3 py-2.5 [&::-webkit-details-marker]:hidden">
        <span className="flex items-center justify-between gap-2">
          <span className="text-small font-semibold text-kofkan-text-primary dark:text-zinc-100">{title}</span>
          <svg
            className="h-4 w-4 shrink-0 text-kofkan-text-muted transition-transform group-open:rotate-180 dark:text-zinc-500"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden
          >
            <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
          </svg>
        </span>
      </summary>
      <ul className="space-y-1 border-t border-kofkan-gray-soft/90 py-2 dark:border-white/10">
        {items.map((item) => (
          <li key={`${item.href}-${item.label}`}>
            <Link
              href={item.href}
              onClick={closeDrawer}
              className="kofkan-tap block rounded-[8px] px-3 py-2 ring-1 ring-transparent hover:bg-white/80 hover:ring-black/[0.04] dark:hover:bg-zinc-950 dark:hover:ring-white/10"
            >
              <span className="block text-[13px] font-semibold text-kofkan-text-primary dark:text-zinc-100">
                {item.label}
              </span>
              <span className="mt-0.5 block text-[11px] leading-snug text-kofkan-text-secondary dark:text-zinc-400">
                {item.description}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </details>
  );
}

export function NavSidebarPanel() {
  const { user, accessToken } = useAuth();
  const { preference, setPreference } = useTheme();
  const { open, closeDrawer } = useNavDrawer();
  const pathname = usePathname() || "/";

  const showAdminLink = Boolean(user && accessToken && user.is_admin === true);

  const mainLinks = useMemo(() => {
    if (!showAdminLink) return MAIN_LINKS;
    const i = MAIN_LINKS.findIndex((l) => l.href === "/account");
    const next = [...MAIN_LINKS];
    next.splice(i + 1, 0, ADMIN_LINK);
    return next;
  }, [showAdminLink]);

  useEffect(() => {
    closeDrawer();
  }, [pathname, closeDrawer]);

  return (
    <div
      className={`fixed inset-0 z-[60] transition-opacity duration-200 ${
        open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
      }`}
      aria-hidden={!open}
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/45 backdrop-blur-[1px]"
        aria-label="Close menu"
        onClick={closeDrawer}
      />
      <aside
        className={`absolute left-0 top-0 flex h-full w-[min(88vw,320px)] max-w-full flex-col bg-white shadow-2xl transition-transform duration-200 ease-out dark:bg-zinc-950 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
      >
        <div className="border-b border-kofkan-gray-soft px-4 py-4 dark:border-white/10">
          <p className="font-display text-[1.05rem] font-semibold tracking-tight text-kofkan-text-primary dark:text-zinc-100">
            KofKaN
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-kofkan-text-secondary dark:text-zinc-400">
            Embedded systems &amp; robotics — shop, track orders, and visit us in {KOFKAN_LOCATION_LINE}.
          </p>
        </div>
        <nav className="flex-1 overflow-y-auto px-2 py-3" aria-label="Main navigation">
          <ul className="space-y-1">
            {mainLinks.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={closeDrawer}
                  className="kofkan-tap block rounded-[10px] px-3 py-2.5 ring-1 ring-transparent hover:bg-kofkan-cream hover:ring-black/[0.04] dark:hover:bg-zinc-900 dark:hover:ring-white/10"
                >
                  <span className="block text-small font-semibold text-kofkan-text-primary dark:text-zinc-100">
                    {item.label}
                  </span>
                  <span className="mt-0.5 block text-[11px] leading-snug text-kofkan-text-secondary dark:text-zinc-400">
                    {item.description}
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          <div className="mt-3 space-y-2">
            <NavDisclosure title="Explore the site" items={DISCOVER_LINKS} closeDrawer={closeDrawer} />
            <NavDisclosure title="Help & policies" items={HELP_LEGAL_LINKS} closeDrawer={closeDrawer} />
          </div>

          <div className="mt-4 rounded-[10px] border border-kofkan-gray-soft px-3 py-3 dark:border-white/10">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-kofkan-text-muted dark:text-zinc-500">
              Theme
            </p>
            <div className="mt-2 grid grid-cols-3 gap-1.5">
              {(
                [
                  { id: "light" as const, label: "Light" },
                  { id: "dark" as const, label: "Dark" },
                  { id: "system" as const, label: "System" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setPreference(opt.id)}
                  className={`kofkan-tap rounded-[8px] border px-2 py-2 text-[11px] font-semibold ${
                    preference === opt.id
                      ? "border-kofkan-cyan bg-kofkan-cream text-kofkan-text-primary dark:bg-zinc-800 dark:text-zinc-100"
                      : "border-kofkan-gray-soft text-kofkan-text-secondary dark:border-white/10 dark:text-zinc-400"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </nav>
        <div className="border-t border-kofkan-gray-soft px-4 py-3 dark:border-white/10">
          <button
            type="button"
            className="kofkan-tap w-full rounded-[10px] border border-kofkan-gray-soft py-2.5 text-small font-semibold text-kofkan-text-primary dark:border-white/15 dark:text-zinc-100"
            onClick={closeDrawer}
          >
            Close menu
          </button>
        </div>
      </aside>
    </div>
  );
}
