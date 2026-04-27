"use client";

import { useMemo, useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NavSidebarPanel } from "@/components/NavSidebarPanel";
import { AppShell } from "@/components/AppShell";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { CatalogProvider } from "@/context/CatalogContext";
import { CartProvider } from "@/context/CartContext";
import { NavDrawerProvider } from "@/context/NavDrawerContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { DialogProvider } from "@/context/DialogContext";
import { ToastProvider } from "@/context/ToastContext";
import { WishlistProvider } from "@/context/WishlistContext";
import { CookieConsentBanner } from "@/components/legal/CookieConsentBanner";

export function Providers({
  children,
  showCookieConsent = false,
}: {
  children: ReactNode;
  showCookieConsent?: boolean;
}) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 minute
        retry: 1,
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <NavDrawerProvider>
        <AuthProvider>
          <ToastProvider>
            <DialogProvider>
              <CatalogProvider>
                <WishlistProvider>
                  <CartProvider>
                    <AppShell>{children}</AppShell>
                    <NavSidebarPanel />
                    <CookieConsentBanner required={showCookieConsent} />
                  </CartProvider>
                </WishlistProvider>
              </CatalogProvider>
            </DialogProvider>
          </ToastProvider>
        </AuthProvider>
      </NavDrawerProvider>
    </ThemeProvider>
    </QueryClientProvider>
  );
}

/**
 * Convenience adapter used by a few simple pages (auth/login, auth/register,
 * account/returns) that prefer an "email + password" shape for sign-in/up
 * over the underlying `AuthContext` (which supports username + email).
 *
 * Returns:
 *   - `token`        – the current access token (or null)
 *   - `user`         – the signed-in user profile (or null)
 *   - `loginUser`    – `{ email, password }` → resolves on success
 *   - `registerUser` – `{ email, password, full_name }` → resolves on success
 */
export function useAppSession() {
  const { user, accessToken, login, register, logout, loading } = useAuth();
  return useMemo(
    () => ({
      token: accessToken,
      user,
      loading,
      logout,
      loginUser: async ({ email, password }: { email: string; password: string }) => {
        await login(email, password);
      },
      registerUser: async ({
        email,
        password,
        full_name,
      }: {
        email: string;
        password: string;
        full_name: string;
      }) => {
        await register(email, full_name, password, email);
      },
    }),
    [user, accessToken, loading, login, register, logout]
  );
}
