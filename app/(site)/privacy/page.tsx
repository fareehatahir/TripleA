import type { Metadata } from "next";
import { getContent } from "@/lib/content";
import { PageHero } from "@/components/layout/page-hero";
import { RichHtml } from "@/components/content/rich-html";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Privacy Notice", alternates: { canonical: "/privacy" } };

export default async function Page() {
  const c = await getContent("legal");
  return (
    <>
      <PageHero title="Privacy Notice" crumbs={[{ name: "Privacy Notice" }]} />
      <div className="container max-w-3xl py-12 md:py-16"><RichHtml html={c.privacy} className="text-graphite" /></div>
    </>
  );
}
