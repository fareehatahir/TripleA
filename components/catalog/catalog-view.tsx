import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronRight, MessageCircle, PackageSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { getFacets, parseFilters, queryCatalog } from "@/lib/catalog";
import { buildCatalogUrl } from "@/lib/catalog-url";
import { whatsappLink } from "@/lib/site";
import { getSiteConfig } from "@/lib/content";
import { ProductCard } from "./product-card";
import { CatalogShell, ResultsFrame } from "./catalog-shell";
import { CatalogFilters } from "./filters";
import { CatalogToolbar } from "./toolbar";
import { cn } from "@/lib/utils";

type SP = Record<string, string | string[] | undefined>;

export async function catalogHeading(preset: { category?: string; make?: string }) {
  const [category, make] = await Promise.all([
    preset.category ? db.category.findUnique({ where: { slug: preset.category }, select: { name: true } }) : null,
    preset.make ? db.make.findUnique({ where: { slug: preset.make }, select: { name: true } }) : null,
  ]);
  return { category, make };
}

function Pager({ page, pages, filters }: { page: number; pages: number; filters: ReturnType<typeof parseFilters> }) {
  if (pages <= 1) return null;
  const nums = Array.from(new Set([1, 2, page - 1, page, page + 1, pages - 1, pages].filter((n) => n >= 1 && n <= pages))).sort((a, b) => a - b);
  return (
    <nav aria-label="Pagination" className="mt-10 flex flex-wrap items-center justify-center gap-2">
      {page > 1 && <Button asChild variant="ghost" size="sm"><Link href={buildCatalogUrl({ ...filters, page: page - 1 })} rel="prev">Previous</Link></Button>}
      {nums.map((n, i) => (
        <span key={n} className="flex items-center gap-2">
          {i > 0 && n - nums[i - 1] > 1 && <span aria-hidden>…</span>}
          <Link href={buildCatalogUrl({ ...filters, page: n })} aria-current={n === page ? "page" : undefined} className={cn("grid h-10 min-w-10 place-items-center rounded-lg px-3 text-sm font-semibold transition", n === page ? "bg-charcoal text-white" : "hover:bg-mist")}>{n}</Link>
        </span>
      ))}
      {page < pages && <Button asChild variant="ghost" size="sm"><Link href={buildCatalogUrl({ ...filters, page: page + 1 })} rel="next">Next</Link></Button>}
    </nav>
  );
}

export async function CatalogView({ searchParams, preset }: { searchParams: SP; preset: { category?: string; make?: string } }) {
  const f = parseFilters(searchParams, preset);
  const { category, make } = await catalogHeading({ category: f.category, make: f.make });
  if ((f.category && !category) || (f.make && !make)) notFound();

  const [{ products, total, pages }, facets, cfg] = await Promise.all([queryCatalog(f), getFacets(f), getSiteConfig()]);
  if (f.page > pages && total > 0) redirect(buildCatalogUrl({ ...f, page: pages }));

  const title = [category?.name, make?.name].filter(Boolean).join(" · ") || "Catalog";
  const crumbs = [{ name: "Home", href: "/" }, { name: "Catalog", href: "/catalog" }, ...(category ? [{ name: category.name, href: `/catalog/${f.category}` }] : []), ...(make && f.category ? [{ name: make.name, href: `/catalog/${f.category}/${f.make}` }] : [])];
  const ld = { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: crumbs.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://tripleaint.tw"}${c.href}` })) };

  return (
    <CatalogShell filters={f}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <section className="border-b border-silver/40 bg-mist">
        <div className="container py-10">
          <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-sm">
            {crumbs.map((c, i) => (
              <span key={c.href} className="flex items-center gap-1">
                {i > 0 && <ChevronRight className="h-3.5 w-3.5" />}
                {i === crumbs.length - 1 ? <span aria-current="page" className="font-semibold text-charcoal">{c.name}</span> : <Link href={c.href} className="hover:text-brand">{c.name}</Link>}
              </span>
            ))}
          </nav>
          <h1 className="mt-4 text-3xl font-bold tracking-tight md:text-5xl">{f.q ? `Results for “${f.q}”` : title}</h1>
          <p className="mt-2" aria-live="polite">{total} item{total === 1 ? "" : "s"} found</p>
        </div>
      </section>

      <div className="container grid gap-8 py-10 lg:grid-cols-[17rem_1fr]">
        <CatalogFilters facets={facets} total={total} />
        <div className="min-w-0 lg:col-start-2 lg:row-start-1">
          <CatalogToolbar filtersButton={null} />
          <div className="mt-6">
            <h2 className="sr-only">Products</h2>
            <ResultsFrame>
              {products.length === 0 ? (
                <div className="grid place-items-center rounded-3xl bg-mist px-6 py-16 text-center">
                  <PackageSearch className="h-12 w-12 text-graphite" />
                  <h2 className="mt-4 text-xl font-bold">Nothing matches those filters</h2>
                  <p className="mt-2 max-w-md">Stock changes daily. Tell us what you are looking for and we will source it for you.</p>
                  <div className="mt-6 flex flex-wrap justify-center gap-3">
                    <Button asChild variant="ghost"><Link href="/catalog">Clear filters</Link></Button>
                    <Button asChild><a href={whatsappLink(`Hello, I am looking for: ${f.q ?? [make?.name, f.model, f.code, f.part].filter(Boolean).join(" ") ?? ""}`, cfg.whatsapp)} target="_blank" rel="noopener noreferrer"><MessageCircle className="h-4 w-4" /> Ask on WhatsApp</a></Button>
                  </div>
                </div>
              ) : (
                <div className={f.view === "list" ? "space-y-5" : "grid gap-5 sm:grid-cols-2 xl:grid-cols-3"}>
                  {products.map((p, i) => <ProductCard key={p.id} p={p} view={f.view} priority={i === 0} />)}
                </div>
              )}
            </ResultsFrame>
          </div>
          <Pager page={f.page} pages={pages} filters={f} />
        </div>
      </div>
    </CatalogShell>
  );
}
