"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
}

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);

  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const alreadyDismissed =
      localStorage.getItem("kofkan-install-dismissed");

    if (alreadyDismissed) return;

    const handler = (e: Event) => {
      e.preventDefault();

      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    window.addEventListener(
      "beforeinstallprompt",
      handler as EventListener
    );

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handler as EventListener
      );
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();

    const choice = await deferredPrompt.userChoice;

    if (choice.outcome === "accepted") {
      console.log("PWA installed");
    }

    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    localStorage.setItem(
      "kofkan-install-dismissed",
      "true"
    );
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-6 left-1/2 z-[9999] w-[92%] max-w-md -translate-x-1/2 rounded-2xl border border-[#e5ddd3] bg-[#faf7f2] p-5 shadow-2xl">
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-[#2c1810]">
          Install KofKaN App
        </h3>

        <p className="text-sm text-[#7a6a62]">
          Get faster checkout, quick access, and a smoother shopping
          experience by installing KofKaN on your device.
        </p>

        <div className="flex gap-3 pt-2">
          <button
            onClick={handleDismiss}
            className="flex-1 rounded-xl border border-[#d8c7b0] py-3 text-sm font-medium text-[#5c1528]"
          >
            Maybe Later
          </button>

          <button
            onClick={handleInstall}
            className="flex-1 rounded-xl bg-[#2c1810] py-3 text-sm font-semibold text-white"
          >
            Install App
          </button>
        </div>
      </div>
    </div>
  );
}