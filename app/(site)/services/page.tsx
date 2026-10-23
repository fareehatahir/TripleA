import type { Metadata } from "next";
import { Car, CircleDot, Cog, Wrench } from "lucide-react";
import { getContent } from "@/lib/content";
import { PageHero } from "@/components/layout/page-hero";
import { CtaBand } from "@/components/home/sections";
import { RevealGroup, RevealItem } from "@/components/ui/reveal";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Services: Used Engines, Cars, Tires & Parts",
  description: "What we export from Taiwan: used engines and gearboxes, used cars and car cuts, used tires and used parts, with engine-code guidance.",
  alternates: { canonical: "/services" },
};
const icons = [Cog, Car, CircleDot, Wrench];

export default async function ServicesPage() {
  const c = await getContent("services");
  return (
    <>
      <PageHero eyebrow="Services" title="Everything you need, from one yard" intro={c.intro} crumbs={[{ name: "Services" }]} />
      <div className="container py-14 md:py-20">
        <RevealGroup className="grid gap-6 md:grid-cols-2">
          {c.items.map((it, i) => {
            const Icon = icons[i % icons.length];
            const points = it.points.split("\n").map((p) => p.trim()).filter(Boolean);
            return (
              <RevealItem key={i}>
                <article className="h-full rounded-3xl bg-white p-8 shadow-soft ring-1 ring-silver/40 transition duration-300 hover:-translate-y-1 hover:shadow-lift">
                  <span className="grid h-14 w-14 place-items-center rounded-2xl bg-charcoal text-white"><Icon className="h-7 w-7" /></span>
                  <h2 className="mt-6 text-2xl font-bold">{it.title}</h2>
                  <p className="mt-3">{it.text}</p>
                  {points.length > 0 && (
                    <ul className="mt-5 space-y-2 text-sm">
                      {points.map((p) => <li key={p} className="flex gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />{p}</li>)}
                    </ul>
                  )}
                </article>
              </RevealItem>
            );
          })}
        </RevealGroup>

        {c.codes.rows.length > 0 && (
          <section className="mt-16 rounded-3xl bg-mist p-8 md:p-12" aria-labelledby="codes">
            <h2 id="codes" className="text-2xl font-bold md:text-3xl">{c.codes.title}</h2>
            <p className="mt-3 max-w-2xl">{c.codes.intro}</p>
            <div className="mt-6 overflow-x-auto rounded-2xl bg-white ring-1 ring-silver/50">
              <table className="w-full min-w-[28rem] text-left text-sm">
                <thead className="border-b border-silver/50 text-xs uppercase tracking-wider"><tr><th className="px-5 py-3">Engine code</th><th className="px-5 py-3">What it is</th></tr></thead>
                <tbody className="divide-y divide-silver/40">
                  {c.codes.rows.map((r, i) => <tr key={i}><td className="px-5 py-3 font-mono font-semibold text-brand">{r.code}</td><td className="px-5 py-3">{r.meaning}</td></tr>)}
                </tbody>
              </table>
            </div>
            {c.codes.note && <p className="mt-4 text-sm font-medium text-charcoal">{c.codes.note}</p>}
          </section>
        )}
      </div>
      <CtaBand title="Tell us what you need" text="Send your list of engines, cars or parts and we will source it for you." />
    </>
  );
}
