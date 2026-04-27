"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import { KofKaNLogo } from "@/components/KofKaNLogo";
import { pingBackendHealth } from "@/lib/api/client";

const STORAGE_KEY = "kofkan_splash_seen";
/** Time on screen before exit starts (ms); logo entrance runs first (~1.75s). */
const HOLD_MS = 4000;
/** Must match `splash-dissolve-out` duration in tailwind.config.js */
const EXIT_ANIM_MS = 1150;

/**
 * Animated brand gradient, elastic logo entrance, blur/scale dissolve on exit.
 */
export function SplashScreen() {
  const [show, setShow] = useState(true);
  const [exiting, setExiting] = useState(false);

  useLayoutEffect(() => {
    try {
      if (sessionStorage.getItem(STORAGE_KEY)) {
        setShow(false);
        return;
      }
    } catch {
      /* still show splash */
    }

    pingBackendHealth();

    const displayTimer = window.setTimeout(() => {
      setExiting(true);
    }, HOLD_MS);

    return () => {
      window.clearTimeout(displayTimer);
    };
  }, []);

  useEffect(() => {
    if (!exiting) return;

    const exitTimer = window.setTimeout(() => {
      try {
        sessionStorage.setItem(STORAGE_KEY, "1");
      } catch {
        /* ignore */
      }
      setShow(false);
    }, EXIT_ANIM_MS);

    return () => window.clearTimeout(exitTimer);
  }, [exiting]);

  if (!show) {
    return null;
  }

  return (
    <div
      className={`fixed inset-0 z-[70] flex items-center justify-center ${exiting ? "animate-splash-dissolve-out" : ""}`}
      aria-hidden
    >
      <div className="kofkan-splash-gradient-bg" />
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/15 via-transparent to-black/30"
        aria-hidden
      />

      <div className="relative z-[1] flex items-center justify-center px-8">
        <div className="animate-splash-logo-enter">
          <div className="rounded-[22px] bg-white/10 p-4 shadow-[0_24px_64px_rgba(0,0,0,0.28)] ring-1 ring-white/25 backdrop-blur-[2px] dark:bg-black/20 dark:ring-white/15">
            <div className="overflow-hidden rounded-[18px] ring-1 ring-black/5 dark:ring-white/10">
              <KofKaNLogo
                asset="primary"
                alt=""
                priority
                imageClassName="h-auto max-h-[min(340px,52vh)] w-[min(260px,78vw)] object-contain"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
