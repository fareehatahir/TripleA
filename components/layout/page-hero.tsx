import Link from "next/link";
import { ChevronRight } from "lucide-react";

export function PageHero({ eyebrow, title, intro, crumbs }: { eyebrow?: string; title: string; intro?: string; crumbs?: { name: string; href?: string }[] }) {
  return (
    <section className="relative overflow-hidden border-b border-silver/40 bg-gradient-to-b from-white to-mist">
      <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-brand/5" aria-hidden />
      <div className="container relative py-14 md:py-20">
        {crumbs && (
          <nav aria-label="Breadcrumb" className="mb-6 flex flex-wrap items-center gap-1 text-sm">
            {[{ name: "Home", href: "/" }, ...crumbs].map((c, i, a) => (
              <span key={c.name} className="flex items-center gap-1">
                {i > 0 && <ChevronRight className="h-3.5 w-3.5" />}
                {i === a.length - 1 || !c.href ? <span aria-current="page" className="font-semibold text-charcoal">{c.name}</span> : <Link href={c.href} className="hover:text-brand">{c.name}</Link>}
              </span>
            ))}
          </nav>
        )}
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1 className="display-italic mt-4 max-w-3xl text-4xl md:text-6xl">{title}</h1>
        {intro && <p className="mt-5 max-w-2xl text-lg">{intro}</p>}
      </div>
    </section>
  );
}
