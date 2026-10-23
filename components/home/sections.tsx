"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { motion, useScroll, useSpring, useReducedMotion } from "framer-motion";
import {
  ArrowRight, ArrowUpRight, BadgeCheck, ChevronLeft, ChevronRight, ClipboardCheck, Cog, FileText, Car,
  MessageCircle, Package, Quote, Ship, Tags, Timer, Wrench,
} from "lucide-react";
import { Reveal, RevealGroup, RevealItem } from "@/components/ui/reveal";
import { Counter } from "@/components/ui/counter";
import { Magnetic } from "@/components/ui/magnetic";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { ProductCard } from "@/components/catalog/product-card";
import type { ProductSummary } from "@/lib/catalog";
import type { Content } from "@/lib/content";
import { categories as categoriesStatic } from "@/lib/site";
import { useWhatsapp } from "@/components/providers/site-provider";
import { cn } from "@/lib/utils";

function Heading({ eyebrow, title, sub, center }: { eyebrow: string; title: string; sub?: string; center?: boolean }) {
  return (
    <Reveal className={cn("max-w-2xl", center && "mx-auto text-center")}>
      <p className={cn("eyebrow", center && "justify-center")}>{eyebrow}</p>
      <h2 className="mt-4 text-3xl font-bold tracking-tight md:text-5xl">{title}</h2>
      {sub && <p className="mt-4 text-lg text-graphite">{sub}</p>}
    </Reveal>
  );
}

/* ------------------------------ Categories ------------------------------ */
const catIcons: Record<string, typeof Car> = { cars: Car, engines: Cog, parts: Wrench, "car-cuts": Package };
const catBlurbs = Object.fromEntries(categoriesStatic.map((c) => [c.slug, c.blurb]));

export function CategoryCards({ categories }: { categories: { name: string; slug: string; count: number }[] }) {
  return (
    <section className="section">
      <div className="container">
        <Heading eyebrow="Catalog" title="Everything your market needs, from one source" sub="Four product lines, one inspection standard." />
        <RevealGroup className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((c) => {
            const Icon = catIcons[c.slug] ?? Package;
            return (
              <RevealItem key={c.slug}>
                <Link
                  href={`/catalog/${c.slug}`}
                  className="group relative block h-full overflow-hidden rounded-2xl border border-silver/50 bg-white p-7 transition duration-300 hover:-translate-y-1.5 hover:border-transparent hover:shadow-lift"
                >
                  <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-mist transition duration-500 group-hover:scale-[2.2] group-hover:bg-brand/5" />
                  <div className="relative">
                    <span className="grid h-14 w-14 place-items-center rounded-xl bg-charcoal text-white transition duration-300 group-hover:scale-110 group-hover:bg-brand">
                      <Icon className="h-7 w-7" />
                    </span>
                    <h3 className="mt-8 text-2xl font-bold">{c.name}</h3>
                    <p className="mt-2 text-sm text-graphite">{catBlurbs[c.slug] ?? "Browse the range."}</p>
                    <p className="mt-6 flex items-center justify-between text-sm font-semibold text-charcoal">
                      <span>{c.count > 0 ? `${c.count.toLocaleString()} item${c.count === 1 ? "" : "s"}` : "Ask us"}</span>
                      <ArrowUpRight className="h-5 w-5 transition group-hover:translate-x-1 group-hover:-translate-y-1 group-hover:text-brand" />
                    </p>
                  </div>
                </Link>
              </RevealItem>
            );
          })}
        </RevealGroup>
      </div>
    </section>
  );
}

/* ------------------------------ Featured ------------------------------ */
export function Featured({ products }: { products: ProductSummary[] }) {
  const track = useRef<HTMLDivElement>(null);
  const scrollBy = (dir: number) => track.current?.scrollBy({ left: dir * 340, behavior: "smooth" });
  if (products.length === 0) return null;

  return (
    <section className="section bg-mist">
      <div className="container">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <Heading eyebrow="Featured" title="Ready to load this week" />
          <div className="flex gap-2">
            <button onClick={() => scrollBy(-1)} aria-label="Previous" className="grid h-12 w-12 place-items-center rounded-full bg-white shadow-soft transition hover:bg-charcoal hover:text-white"><ChevronLeft /></button>
            <button onClick={() => scrollBy(1)} aria-label="Next" className="grid h-12 w-12 place-items-center rounded-full bg-white shadow-soft transition hover:bg-charcoal hover:text-white"><ChevronRight /></button>
          </div>
        </div>
      </div>
      <div ref={track} className="hide-scrollbar mt-10 flex snap-x snap-mandatory gap-5 overflow-x-auto px-5 pb-6 lg:px-[max(2rem,calc((100vw-1216px)/2))]">
        {products.map((p) => (
          <div key={p.id} className="w-[300px] shrink-0 snap-start"><ProductCard p={p} /></div>
        ))}
      </div>
      <div className="container mt-4"><Button asChild variant="ghost"><Link href="/catalog">View the full catalog <ArrowRight className="h-4 w-4" /></Link></Button></div>
    </section>
  );
}

/* ------------------------------ Stats ------------------------------ */
export function Stats({ stats }: { stats: Content<"home">["stats"] }) {
  return (
    <section className="bg-charcoal py-16 text-white md:py-20">
      <div className="container grid grid-cols-2 gap-y-10 lg:grid-cols-4">
        {stats.map((s, i) => (
          <Reveal key={s.label} delay={i * 0.08} className="border-l border-white/15 pl-6">
            <p className="font-display text-4xl font-extrabold italic md:text-6xl"><Counter to={s.value} suffix={s.suffix} /></p>
            <p className="mt-2 text-sm uppercase tracking-widest text-silver">{s.label}</p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------ How it works ------------------------------ */
const stepIcons = [MessageCircle, FileText, ClipboardCheck, Ship];

export function HowItWorks({ steps }: { steps: Content<"home">["steps"] }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 75%", "end 60%"] });
  const scale = useSpring(scrollYProgress, { stiffness: 80, damping: 25 });

  return (
    <section className="section">
      <div className="container">
        <Heading eyebrow="How it works" title="From inquiry to port in four steps" center />
        <div ref={ref} className="relative mt-16">
          <div className="absolute left-[27px] top-0 h-full w-0.5 bg-silver/60 lg:left-0 lg:top-[27px] lg:h-0.5 lg:w-full" aria-hidden />
          <motion.div
            className="absolute left-[27px] top-0 h-full w-0.5 origin-top bg-brand lg:hidden"
            style={reduce ? undefined : { scaleY: scale }}
            aria-hidden
          />
          {/* desktop draws horizontally */}
          <motion.div className="absolute left-0 top-[27px] hidden h-0.5 w-full origin-left bg-brand lg:block" style={reduce ? undefined : { scaleX: scale }} aria-hidden />
          <ol className="relative grid gap-10 lg:grid-cols-4 lg:gap-8">
            {steps.map((s, i) => {
              const Icon = stepIcons[i % stepIcons.length];
              return (
              <li key={s.title}>
                <Reveal delay={i * 0.1} className="flex gap-5 lg:block">
                  <span className="relative z-10 grid h-14 w-14 shrink-0 place-items-center rounded-full bg-brand text-white shadow-glow ring-8 ring-white">
                    <Icon className="h-6 w-6" />
                  </span>
                  <div className="lg:mt-6">
                    <p className="text-xs font-bold uppercase tracking-widest text-brand">Step {i + 1}</p>
                    <h3 className="mt-1 text-xl font-bold">{s.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-graphite">{s.text}</p>
                  </div>
                </Reveal>
              </li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------ Destinations ------------------------------ */
const dests = [
  { name: "Kenya", x: 355, y: 300, d: "M610 215 C 520 120, 420 200, 355 300" },
  { name: "Tanzania", x: 345, y: 330, d: "M610 215 C 520 150, 430 260, 345 330" },
  { name: "Nigeria", x: 270, y: 280, d: "M610 215 C 500 80, 360 160, 270 280" },
  { name: "UAE", x: 440, y: 215, d: "M610 215 C 560 150, 500 170, 440 215" },
  { name: "Pakistan", x: 500, y: 195, d: "M610 215 C 580 170, 540 170, 500 195" },
  { name: "Philippines", x: 640, y: 250, d: "M610 215 C 620 225, 630 235, 640 250" },
  { name: "Indonesia", x: 610, y: 300, d: "M610 215 C 595 250, 600 280, 610 300" },
  { name: "Sri Lanka", x: 520, y: 260, d: "M610 215 C 580 200, 540 230, 520 260" },
];

export function Destinations() {
  return (
    <section className="section overflow-hidden bg-charcoal text-white">
      <div className="container grid items-center gap-12 lg:grid-cols-12">
        <Reveal className="lg:col-span-4">
          <p className="eyebrow !text-white">Destinations</p>
          <h2 className="mt-4 !text-white text-3xl font-bold md:text-5xl">Out of Taiwan, into your market</h2>
          <p className="mt-5 text-silver">Regular consolidated and full-container sailings to East Africa, West Africa, the Gulf, South Asia and Southeast Asia.</p>
          <ul className="mt-6 grid grid-cols-2 gap-2 text-sm text-silver">
            {dests.map((d) => <li key={d.name} className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-brand" />{d.name}</li>)}
          </ul>
          <Button asChild className="mt-8"><Link href="/shipping">View freight rates <ArrowRight className="h-4 w-4" /></Link></Button>
        </Reveal>
        <Reveal className="lg:col-span-8">
          <svg viewBox="0 0 760 420" className="w-full" role="img" aria-label="Export routes from Taiwan to destination countries">
            <g stroke="#ffffff" strokeOpacity="0.07">
              {Array.from({ length: 11 }).map((_, i) => <line key={`h${i}`} x1="0" x2="760" y1={i * 40} y2={i * 40} />)}
              {Array.from({ length: 20 }).map((_, i) => <line key={`v${i}`} y1="0" y2="420" x1={i * 40} x2={i * 40} />)}
            </g>
            {dests.map((d, i) => (
              <g key={d.name}>
                <motion.path
                  d={d.d}
                  fill="none"
                  stroke="rgb(var(--brand-rgb))"
                  strokeWidth="1.8"
                  strokeDasharray="5 5"
                  initial={{ pathLength: 0, opacity: 0 }}
                  whileInView={{ pathLength: 1, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.4, delay: 0.2 + i * 0.12 }}
                />
                <circle cx={d.x} cy={d.y} r="4.5" fill="#fff" />
                <text x={d.x + 8} y={d.y + 4} fill="#C9CDD2" fontSize="11">{d.name}</text>
              </g>
            ))}
            <circle cx="610" cy="215" r="6" fill="rgb(var(--brand-rgb))" />
            <circle cx="610" cy="215" r="6" fill="rgb(var(--brand-rgb))" className="animate-pulse-ring" style={{ transformBox: "fill-box", transformOrigin: "center" }} />
            <text x="618" y="212" fill="#fff" fontSize="13" fontWeight="700">Taiwan</text>
          </svg>
          <p className="mt-2 text-xs text-silver/60">Illustrative route map. Schematic positions only.</p>
        </Reveal>
      </div>
    </section>
  );
}

/* ------------------------------ Loadings ------------------------------ */
export function Loadings({ photos }: { photos: { id: string; url: string; thumbUrl: string | null; caption: string | null; destination: string | null; shotAt: string }[] }) {
  if (photos.length === 0) return null;
  return (
    <section className="section">
      <div className="container">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <Heading eyebrow="Loading gallery" title="Latest container loadings" />
          <Button asChild variant="ghost"><Link href="/loading">See full gallery <ArrowRight className="h-4 w-4" /></Link></Button>
        </div>
        <RevealGroup className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-4">
          {photos.map((l, i) => (
            <RevealItem key={l.id} className={cn("group relative aspect-[3/4] overflow-hidden rounded-2xl bg-charcoal", i === 0 && "col-span-2 row-span-2 aspect-auto md:min-h-[26rem]")}>
              <Image src={l.url} alt={l.caption ?? "Container loading"} fill sizes={i === 0 ? "(min-width:768px) 50vw, 100vw" : "(min-width:768px) 25vw, 50vw"} className="object-cover transition duration-700 group-hover:scale-105" />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent p-4 text-white">
                <p className="text-sm font-semibold">{l.destination ?? l.caption ?? "Container loading"}</p>
                <p className="text-xs text-silver">{new Date(l.shotAt).toLocaleDateString("en", { month: "short", year: "numeric" })}</p>
              </div>
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}

/* ------------------------------ Why us ------------------------------ */
const whyIcons = [BadgeCheck, Tags, FileText, Timer];

export function WhyUs({ why }: { why: Content<"home">["why"] }) {
  return (
    <section className="section bg-mist">
      <div className="container">
        <Heading eyebrow="Why Triple A" title="Built for repeat buyers" />
        <RevealGroup className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {why.map((w, i) => {
            const Icon = whyIcons[i % whyIcons.length];
            return (
            <RevealItem key={w.title + i}>
              <div className="h-full rounded-2xl bg-white p-7 shadow-soft transition duration-300 hover:-translate-y-1 hover:shadow-lift">
                <Icon className="h-9 w-9 text-brand" />
                <h3 className="mt-6 text-lg font-bold">{w.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-graphite">{w.text}</p>
              </div>
            </RevealItem>
          ); })}
        </RevealGroup>
      </div>
    </section>
  );
}

/* ------------------------------ Testimonials ------------------------------ */
export function Testimonials({ items }: { items: { id: string; name: string; role: string | null; quote: string }[] }) {
  const [i, setI] = useState(0);
  if (items.length === 0) return null;
  const t = items[Math.min(i, items.length - 1)];
  return (
    <section className="section">
      <div className="container max-w-3xl text-center">
        <Quote className="mx-auto h-10 w-10 text-brand" />
        <div className="mt-6 min-h-[200px]" aria-live="polite">
          <motion.div key={t.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <p className="font-display text-2xl font-semibold leading-snug text-charcoal md:text-3xl">“{t.quote}”</p>
            <p className="mt-6 font-semibold text-charcoal">{t.name}</p>
            {t.role && <p className="text-sm">{t.role}</p>}
          </motion.div>
        </div>
        <div className="mt-6 flex justify-center gap-2">
          {items.map((x, n) => (
            <button key={x.id} onClick={() => setI(n)} aria-label={`Show testimonial ${n + 1}`} aria-current={n === i} className="group grid h-6 min-w-6 place-items-center">
              <span className={cn("block h-2.5 rounded-full transition-all", n === i ? "w-8 bg-brand" : "w-2.5 bg-silver group-hover:bg-graphite")} />
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------ CTA band ------------------------------ */
export function CtaBand({ title, text }: { title: string; text: string }) {
  const whatsappLink = useWhatsapp();
  return (
    <section className="container pb-20 md:pb-28">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand to-brand-deep px-8 py-14 text-white md:px-16 md:py-20">
        <div className="absolute -right-20 -top-20 h-80 w-80 rounded-full bg-white/10" aria-hidden />
        <div className="absolute -bottom-32 right-32 h-72 w-72 rounded-full bg-white/5" aria-hidden />
        <div className="relative max-w-2xl">
          <h2 className="display-italic !text-white text-3xl md:text-5xl">{title}</h2>
          <p className="mt-4 text-lg text-white/85">{text}</p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Magnetic>
              <Button asChild size="lg" className="bg-white text-brand shadow-none hover:bg-mist"><Link href="/inquiry">Send Inquiry</Link></Button>
            </Magnetic>
            <Magnetic>
              <Button asChild size="lg" className="bg-whatsapp shadow-none hover:bg-whatsapp-hover">
                <a href={whatsappLink()} target="_blank" rel="noopener noreferrer"><MessageCircle className="h-5 w-5" /> WhatsApp us</a>
              </Button>
            </Magnetic>
          </div>
        </div>
      </div>
    </section>
  );
}
