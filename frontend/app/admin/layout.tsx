import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/AdminShell";

export const metadata: Metadata = {
  title: { template: "%s · KofKaN Admin", default: "Admin · KofKaN Admin" },
  robots: { index: false, follow: false },
  description: "KofKaN storefront administration.",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
