import type { Metadata } from "next";
import { cookies } from "next/headers";
import { ThemeScope } from "@/components/admin/theme-scope";

export const metadata: Metadata = { title: { default: "Admin", template: "%s | TripleA Admin" }, robots: { index: false, follow: false } };

export default async function AdminRootLayout({ children }: { children: React.ReactNode }) {
  const theme = (await cookies()).get("ta-admin-theme")?.value === "dark" ? "dark" : "light";
  return <ThemeScope initial={theme}>{children}</ThemeScope>;
}
