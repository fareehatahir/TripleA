import type { Metadata, Viewport } from "next";
import { Inter, Sora } from "next/font/google";
import "./globals.css";
import { HydrationMarker } from "@/components/providers/hydration-marker";
import { getSiteConfig } from "@/lib/content";
import { brandCss } from "@/lib/app-settings";
import { site } from "@/lib/site";

// Every page reads settings from the database at request time, so the build never needs a database connection.
export const dynamic = "force-dynamic";

const display = Sora({ subsets: ["latin"], variable: "--font-display", display: "swap" });
const body = Inter({ subsets: ["latin"], variable: "--font-body", display: "swap" });

export async function generateMetadata(): Promise<Metadata> {
  const c = await getSiteConfig();
  return {
    metadataBase: new URL(site.url),
    title: { default: c.seoTitle, template: `%s | ${c.name}` },
    description: c.seoDescription,
    openGraph: { type: "website", siteName: c.name, url: site.url, title: c.seoTitle, description: c.seoDescription }, // the social image comes from app/opengraph-image.png
    icons: c.faviconUrl ? { icon: c.faviconUrl, apple: c.faviconUrl } : undefined, // default icons come from app/icon.png and app/apple-icon.png
  };
}

export const viewport: Viewport = { themeColor: "#C8102E", width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { brandColor } = await getSiteConfig();
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <head>
        <style dangerouslySetInnerHTML={{ __html: brandCss(brandColor) }} />
      </head>
      <body>
        <HydrationMarker />
        {children}
      </body>
    </html>
  );
}
