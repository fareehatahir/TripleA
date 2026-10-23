import type { Metadata } from "next";
import { getContent } from "@/lib/content";
import { PageHero } from "@/components/layout/page-hero";
import { RichHtml } from "@/components/content/rich-html";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Terms of Use", alternates: { canonical: "/terms" } };

export default async function Page() {
  const c = await getContent("legal");
  return (
    <>
      <PageHero title="Terms of Use" crumbs={[{ name: "Terms of Use" }]} />
      <div className="container max-w-3xl py-12 md:py-16"><RichHtml html={c.terms} className="text-graphite" /></div>
    </>
  );
}
