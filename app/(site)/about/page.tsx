import type { Metadata } from "next";
import Image from "next/image";
import { BadgeCheck, Target } from "lucide-react";
import { getContent } from "@/lib/content";
import { PageHero } from "@/components/layout/page-hero";
import { RichHtml } from "@/components/content/rich-html";
import { CtaBand } from "@/components/home/sections";
import { Reveal } from "@/components/ui/reveal";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "About Triple A International",
  description: "Triple A International is a Taiwan-based exporter of used cars, engines, parts and car cuts. Our story, mission, team and certifications.",
  alternates: { canonical: "/about" },
};

export default async function AboutPage() {
  const c = await getContent("about");
  return (
    <>
      <PageHero eyebrow="About us" title="Taiwan stock, delivered with trust" crumbs={[{ name: "About" }]} />
      <div className="container py-14 md:py-20">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr]">
          <Reveal><RichHtml html={c.intro} className="text-lg text-graphite" /></Reveal>
          {c.mission && (
            <Reveal delay={0.1}>
              <aside className="rounded-3xl bg-charcoal p-8 text-white">
                <Target className="h-8 w-8 text-brand" />
                <h2 className="mt-4 !text-white text-xl font-bold">Our mission</h2>
                <p className="mt-3 text-silver">{c.mission}</p>
              </aside>
            </Reveal>
          )}
        </div>

        {c.timeline.length > 0 && (
          <section className="mt-20" aria-labelledby="timeline">
            <h2 id="timeline" className="text-2xl font-bold md:text-3xl">Our journey</h2>
            <ol className="relative mt-8 space-y-8 border-l-2 border-silver/60 pl-8">
              {c.timeline.map((t, i) => (
                <li key={i} className="relative">
                  <span className="absolute -left-[2.6rem] top-1 grid h-5 w-5 place-items-center rounded-full bg-brand ring-4 ring-white" aria-hidden />
                  <p className="font-display text-sm font-bold text-brand">{t.year}</p>
                  <h3 className="text-lg font-bold">{t.title}</h3>
                  <p className="mt-1 max-w-2xl text-sm">{t.text}</p>
                </li>
              ))}
            </ol>
          </section>
        )}

        {c.certifications.length > 0 && (
          <section className="mt-20" aria-labelledby="certs">
            <h2 id="certs" className="text-2xl font-bold md:text-3xl">Certifications &amp; standards</h2>
            <ul className="mt-6 grid gap-5 md:grid-cols-2">
              {c.certifications.map((x, i) => (
                <li key={i} className="flex gap-4 rounded-2xl bg-mist p-6"><BadgeCheck className="h-7 w-7 shrink-0 text-brand" /><div><h3 className="font-bold text-charcoal">{x.name}</h3><p className="mt-1 text-sm">{x.detail}</p></div></li>
              ))}
            </ul>
          </section>
        )}

        {c.team.length > 0 && (
          <section className="mt-20" aria-labelledby="team">
            <h2 id="team" className="text-2xl font-bold md:text-3xl">The team</h2>
            <ul className="mt-6 grid grid-cols-2 gap-6 md:grid-cols-4">
              {c.team.map((m, i) => (
                <li key={i} className="text-center">
                  <span className="relative mx-auto block aspect-square w-full max-w-[12rem] overflow-hidden rounded-full bg-mist">
                    {m.photo ? <Image src={m.photo} alt={m.name} fill sizes="192px" className="object-cover" /> : <span className="grid h-full place-items-center font-display text-4xl font-bold text-silver">{m.name[0]}</span>}
                  </span>
                  <p className="mt-3 font-bold text-charcoal">{m.name}</p><p className="text-sm">{m.role}</p>
                </li>
              ))}
            </ul>
          </section>
        )}

        {c.gallery.length > 0 && (
          <section className="mt-20" aria-labelledby="yard">
            <h2 id="yard" className="text-2xl font-bold md:text-3xl">Our yard &amp; warehouse</h2>
            <ul className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3">
              {c.gallery.map((g, i) => (
                <li key={i} className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-mist">
                  <Image src={g.url} alt={g.caption || "Warehouse photo"} fill sizes="(min-width:768px) 33vw, 50vw" className="object-cover" />
                  {g.caption && <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 text-xs text-white">{g.caption}</span>}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
      <CtaBand title="Let's work together" text="Tell us what your market needs and we will build your next container." />
    </>
  );
}
