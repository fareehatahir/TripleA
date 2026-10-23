import type { Metadata } from "next";
import { CheckCircle2 } from "lucide-react";
import { db } from "@/lib/db";
import { getContent } from "@/lib/content";
import { PageHero } from "@/components/layout/page-hero";
import { Accordion } from "@/components/content/accordion";
import { RichHtml } from "@/components/content/rich-html";
import { CtaBand } from "@/components/home/sections";
import { Reveal } from "@/components/ui/reveal";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Shipping & Freight Rates from Taiwan",
  description: "Ocean freight rates per container from Taiwan to Africa, the Middle East and Asia, how our export process works, local charges explained, and shipping FAQs.",
  alternates: { canonical: "/shipping" },
};

const fmt = (d: Date) => d.toLocaleDateString("en", { day: "2-digit", month: "short", year: "numeric" });

export default async function ShippingPage() {
  const [c, rates, faqs] = await Promise.all([
    getContent("shipping"),
    db.shippingRate.findMany({ orderBy: [{ order: "asc" }, { country: "asc" }] }),
    db.faq.findMany({ where: { active: true, group: { in: ["shipping", "general"] } }, orderBy: [{ group: "desc" }, { order: "asc" }] }),
  ]);
  const now = new Date();
  const faqLd = faqs.length ? { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.question, acceptedAnswer: { "@type": "Answer", text: f.answer } })) } : null;

  return (
    <>
      <PageHero eyebrow="Shipping" title="From our yard to your port" crumbs={[{ name: "Shipping" }]} />
      <div className="container py-14 md:py-20">
        <Reveal><RichHtml html={c.intro} className="max-w-3xl text-lg text-graphite" /></Reveal>

        <section className="mt-12" aria-labelledby="rates">
          <h2 id="rates" className="text-2xl font-bold md:text-3xl">Ocean freight rates</h2>
          <div className="mt-6 overflow-x-auto rounded-2xl ring-1 ring-silver/50">
            <table className="w-full min-w-[40rem] bg-white text-left text-sm">
              <thead className="bg-charcoal text-xs uppercase tracking-wider text-white">
                <tr><th className="px-5 py-4">Departure</th><th className="px-5 py-4">Destination</th><th className="px-5 py-4">Port</th><th className="px-5 py-4">Container</th><th className="px-5 py-4 text-right">Freight (USD)</th><th className="px-5 py-4">Valid until</th></tr>
              </thead>
              <tbody className="divide-y divide-silver/40">
                {rates.length === 0 && <tr><td colSpan={6} className="px-5 py-10 text-center">Rates are quoted per order. Send an inquiry for your port.</td></tr>}
                {rates.map((r) => {
                  const expired = r.validUntil < now;
                  return (
                    <tr key={r.id} className={expired ? "text-graphite/75" : "hover:bg-mist/60"}>
                      <td className="px-5 py-3.5">{r.departure}</td>
                      <td className="px-5 py-3.5 font-semibold text-charcoal">{r.country}</td>
                      <td className="px-5 py-3.5">{r.port}</td>
                      <td className="px-5 py-3.5">{r.containerType}</td>
                      <td className="px-5 py-3.5 text-right font-semibold tabular-nums text-charcoal">{expired ? "Ask for latest" : `$${r.freightUsd.toLocaleString()}`}</td>
                      <td className="whitespace-nowrap px-5 py-3.5">{fmt(r.validUntil)}{expired && <span className="ml-2 rounded-full bg-mist px-2 py-0.5 text-xs font-semibold">Expired</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {c.note && <p className="mt-3 text-sm">{c.note}</p>}
        </section>

        <section className="mt-16" aria-labelledby="process">
          <h2 id="process" className="text-2xl font-bold md:text-3xl">How shipping works</h2>
          <ol className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {c.steps.map((s, i) => (
              <li key={i} className="rounded-2xl bg-white p-6 shadow-soft ring-1 ring-silver/40">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-brand font-bold text-white">{i + 1}</span>
                <h3 className="mt-4 text-lg font-bold">{s.title}</h3>
                <p className="mt-2 text-sm">{s.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-16" aria-labelledby="charges">
          <h2 id="charges" className="text-2xl font-bold md:text-3xl">Charges explained</h2>
          <ul className="mt-6 grid gap-5 md:grid-cols-2">
            {c.charges.map((ch, i) => (
              <li key={i} className="flex gap-4 rounded-2xl bg-mist p-6">
                <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-brand" />
                <div><h3 className="font-bold text-charcoal">{ch.title}</h3><p className="mt-1 text-sm">{ch.text}</p></div>
              </li>
            ))}
          </ul>
        </section>

        {faqs.length > 0 && (
          <section className="mt-16 max-w-3xl" aria-labelledby="faq">
            <h2 id="faq" className="mb-6 text-2xl font-bold md:text-3xl">Frequently asked questions</h2>
            <Accordion items={faqs.map((f) => ({ q: f.question, a: <p className="whitespace-pre-line">{f.answer}</p> }))} />
          </section>
        )}
      </div>
      {faqLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />}
      <CtaBand title="Need a freight quote for your port?" text="Tell us the destination and what you are buying. We reply with an all-in quotation." />
    </>
  );
}
