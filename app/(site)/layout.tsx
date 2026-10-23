import { SmoothScroll } from "@/components/providers/smooth-scroll";
import { InquiryProvider } from "@/components/providers/inquiry-provider";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Floating } from "@/components/layout/floating";
import { InquiryDrawer } from "@/components/layout/inquiry-drawer";
import { getNavData } from "@/lib/nav-data";
import { getSiteConfig } from "@/lib/content";
import { SiteProvider } from "@/components/providers/site-provider";
import { auth } from "@/auth";
import { getAppSetting } from "@/lib/app-settings";
import { Maintenance } from "@/components/layout/maintenance";
import { PageViewBeacon } from "@/components/providers/page-view-beacon";
import { AnnouncementBar } from "@/components/layout/announcement-bar";

export async function generateMetadata() {
  const m = await getAppSetting("maintenance");
  return m.enabled ? { robots: { index: false, follow: false } } : {};
}

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [nav, site, maint, session] = await Promise.all([getNavData(), getSiteConfig(), getAppSetting("maintenance"), auth()]);
  const isAdmin = !!session?.user;
  if (maint.enabled && !isAdmin) return <Maintenance message={maint.message} phone={site.phone} whatsapp={site.whatsapp} />;
  const orgJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: site.name,
    url: site.url,
    logo: `${site.url}/brand/logo.png`,
    email: site.email,
    telephone: site.phone,
  };
  return (
    <SiteProvider value={site}>
    <InquiryProvider>
      <SmoothScroll>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }} />
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-brand focus:px-4 focus:py-2 focus:text-white">
          Skip to content
        </a>
        {maint.enabled && <p role="status" className="bg-charcoal px-4 py-2 text-center text-sm text-white">Maintenance mode is ON. Visitors currently see a notice; you can see the site because you are signed in.</p>}
        <AnnouncementBar banner={site.banner} />
        <Header {...nav} />
        <main id="main">{children}</main>
        <Footer categories={nav.categories} />
        <Floating />
        {!isAdmin && <PageViewBeacon />}
        <InquiryDrawer />
      </SmoothScroll>
    </InquiryProvider>
    </SiteProvider>
  );
}
