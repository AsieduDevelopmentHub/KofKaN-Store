"use client";

import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { BottomNav } from "@/components/BottomNav";
import { SplashScreen } from "@/components/SplashScreen";
import { WhatsAppFloat } from "@/components/WhatsAppFloat";
import { StorefrontFooter } from "@/components/StorefrontFooter";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin") || pathname?.startsWith("/system");

  return (
    <>
      <SplashScreen />
      <div className={`kofkan-storefront-max min-h-screen bg-kofkan-cream dark:bg-zinc-950 dark:text-zinc-100 ${isAdmin ? "" : "pb-[calc(4.5rem+var(--safe-bottom))]"}`}>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="min-h-screen flex flex-col"
        >
          <div className="flex-1">
            {children}
          </div>
          {!isAdmin && <StorefrontFooter />}
        </motion.div>
      </div>
      {!isAdmin && <BottomNav />}
      {!isAdmin && <WhatsAppFloat />}
    </>
  );
}
