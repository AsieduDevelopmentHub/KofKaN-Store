"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  LogOut,
  RotateCcw,
  Menu,
  Box,
  LineChart,
  ClipboardList,
  FolderTree,
  Settings,
  Home,
  Search,
  Shield,
  Star,
  Store,
  Ticket,
  Users,
  Wallet,
  Warehouse,
  X,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { pingBackendHealth } from "@/lib/api/client";
import { SkeletonBlock } from "@/components/StorefrontSkeletons";

export type AdminNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

const NAV_MAIN: AdminNavItem[] = [
  { href: "/system", label: "Overview", icon: Home },
  { href: "/system/products", label: "Products", icon: Box },
  { href: "/system/categories", label: "Categories", icon: FolderTree },
  { href: "/system/orders", label: "Orders", icon: ClipboardList },
  { href: "/system/returns", label: "Returns", icon: RotateCcw },
  { href: "/system/customers", label: "Customers", icon: Users },
  { href: "/system/inventory", label: "Inventory", icon: Warehouse },
  { href: "/system/coupons", label: "Coupons", icon: Ticket },
  { href: "/system/reviews", label: "Reviews", icon: Star },
  { href: "/system/analytics", label: "Analytics", icon: LineChart },
  { href: "/system/search-analytics", label: "Search", icon: Search },
  { href: "/system/payments", label: "Payments", icon: Wallet },
  { href: "/system/staff", label: "Staff", icon: Shield },
  { href: "/system/settings", label: "Settings", icon: Settings },
];

function navActive(pathname: string, href: string): boolean {
  if (href === "/system") return pathname === "/system";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function AdminSidebarLink({
  item,
  pathname,
  onNavigate,
}: {
  item: AdminNavItem;
  pathname: string;
  onNavigate?: () => void;
}) {
  const active = navActive(pathname, item.href);
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-small font-medium transition-colors ${
        active
          ? "bg-kofkan-gold/20 text-kofkan-gold"
          : "text-kofkan-hero-subtext/90 hover:bg-white/5 hover:text-white"
      }`}
    >
      <item.icon className="h-4 w-4 shrink-0 opacity-90" strokeWidth={2} />
      {item.label}
    </Link>
  );
}

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user, accessToken, loading, logout, refreshProfile } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [retrying, setRetrying] = useState(false);

  const closeMobile = useCallback(() => setMobileOpen(false), []);

  useEffect(() => {
    closeMobile();
  }, [pathname, closeMobile]);

  const handleRetry = useCallback(async () => {
    setRetrying(true);
    try {
      pingBackendHealth();
      await refreshProfile();
    } finally {
      setRetrying(false);
    }
  }, [refreshProfile]);

  if (loading) {
    return (
      <div className="min-h-screen bg-kofkan-cream p-6" aria-hidden>
        <div className="mx-auto flex w-full max-w-6xl gap-4">
          <div className="hidden w-56 shrink-0 space-y-3 rounded-xl bg-kofkan-bg-deep p-4 lg:block">
            <SkeletonBlock className="h-8 w-28 rounded" />
            {Array.from({ length: 8 }).map((_, i) => (
              <SkeletonBlock key={i} className="h-8 w-full rounded" />
            ))}
          </div>
          <div className="flex-1 space-y-4">
            <SkeletonBlock className="h-8 w-40 rounded" />
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <SkeletonBlock key={i} className="h-24 w-full rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // We have a token but couldn't load the profile (likely a network blip / cold backend).
  // Offer a retry instead of bouncing the admin to the sign-in screen.
  if (!user && accessToken) {
    return (
      <div className="min-h-screen bg-kofkan-cream px-6 py-16 font-sans text-center">
        <p className="text-body text-kofkan-text-secondary">
          We couldn&apos;t reach the server. Please check your connection.
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={() => void handleRetry()}
            disabled={retrying}
            className="inline-flex items-center gap-2 rounded-full bg-kofkan-crimson px-5 py-2.5 text-small font-semibold text-white disabled:opacity-60"
          >
            {retrying ? "Retrying…" : "Retry"}
          </button>
          <button
            type="button"
            onClick={() => void logout()}
            className="inline-flex items-center gap-2 rounded-full border border-kofkan-gray-soft bg-white px-5 py-2.5 text-small font-semibold text-kofkan-text-primary hover:bg-kofkan-cream"
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-kofkan-cream px-6 py-16 font-sans text-center">
        <p className="text-body text-kofkan-text-secondary">Sign in to open the admin portal.</p>
        <Link
          href="/account"
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-kofkan-crimson px-5 py-2.5 text-small font-semibold text-white"
        >
          Go to account
        </Link>
      </div>
    );
  }

  if (!user.is_admin) {
    return (
      <div className="min-h-screen bg-kofkan-cream px-6 py-16 font-sans text-center">
        <p className="text-body text-kofkan-text-secondary">You do not have access to the admin portal.</p>
        <Link href="/account" className="mt-4 inline-block font-semibold text-kofkan-gold">
          Back to account
        </Link>
      </div>
    );
  }

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="border-b border-white/10 px-4 py-5">
        <Link href="/system" className="block" onClick={closeMobile}>
          <div className="flex items-center gap-2.5">
            <Image
              src="/assets/logos/brandmark.png"
              alt="KofKaN"
              width={34}
              height={34}
              className="h-8 w-8 rounded-sm object-contain"
            />
            <div>
              <p className="font-serif text-lg font-semibold tracking-wide text-white">KofKaN</p>
              <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-kofkan-gold/90">
                System
              </p>
            </div>
          </div>
        </Link>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
        {NAV_MAIN.map((item) => (
          <AdminSidebarLink key={item.href} item={item} pathname={pathname} onNavigate={closeMobile} />
        ))}
      </nav>
      <div className="border-t border-white/10 p-3 space-y-1">
        <Link
          href="/"
          onClick={closeMobile}
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-small text-kofkan-hero-subtext/85 hover:bg-white/5 hover:text-white"
        >
          <Store className="h-4 w-4" strokeWidth={2} />
          Storefront
        </Link>
        <button
          type="button"
          onClick={() => void logout()}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-small text-kofkan-hero-subtext/85 hover:bg-white/5 hover:text-white"
        >
          <LogOut className="h-4 w-4" strokeWidth={2} />
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-kofkan-cream font-sans text-kofkan-text-primary">
      {/* Mobile top bar */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-black/[0.06] bg-kofkan-bg-deep px-4 py-3 text-white lg:hidden">
        <button
          type="button"
          aria-label="Open menu"
          className="rounded-lg p-2 hover:bg-white/10"
          onClick={() => setMobileOpen(true)}
        >
          <Menu className="h-5 w-5" strokeWidth={2} />
        </button>
        <span className="font-serif text-section-title font-semibold">Admin</span>
        <span className="w-9" />
      </header>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            aria-label="Close menu"
            onClick={closeMobile}
          />
          <aside className="absolute left-0 top-0 flex h-full w-[min(88vw,280px)] flex-col bg-kofkan-bg-deep shadow-xl">
            <div className="flex justify-end p-2">
              <button
                type="button"
                className="rounded-lg p-2 text-white hover:bg-white/10"
                aria-label="Close"
                onClick={closeMobile}
              >
                <X className="h-5 w-5" strokeWidth={2} />
              </button>
            </div>
            {sidebar}
          </aside>
        </div>
      )}

      <div className="flex min-h-[calc(100vh-52px)] lg:min-h-screen">
        <aside className="hidden w-56 shrink-0 bg-kofkan-bg-deep lg:block lg:min-h-screen">{sidebar}</aside>
        <main className="min-w-0 flex-1">
          <div className="mx-auto w-full max-w-6xl px-3 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</div>
        </main>
      </div>
      {/* accessToken kept warm for child fetches that use useAuth */}
      {accessToken ? null : null}
    </div>
  );
}
