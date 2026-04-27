import type { Metadata } from "next";
import type { ReactNode } from "react";

/** OAuth return URLs should not be indexed. */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Sign in with Google",
};

export default function GoogleAuthLayout({ children }: { children: ReactNode }) {
  return children;
}
