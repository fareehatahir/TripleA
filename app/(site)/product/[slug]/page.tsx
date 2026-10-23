import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { db } from "@/lib/db";
import { COND_LABEL, DRIVE_LABEL, FUEL_LABEL, TRANS_LABEL, VISIBLE, summarySelect, toSummary } from "@/lib/catalog";
import { cleanHtml, stripHtml } from "@/lib/sanitize";
import { site } from "@/lib/site";
import { Gallery } from "@/components/catalog/gallery";
import { QuotePanel } from "@/components/catalog/quote-panel";
import { ProductCard, StockBadge } from "@/components/catalog/product-card";

export const dynamic = "force-dynamic";

const load = (slug: string) =>
  db.product.findFirst({
    where: { slug, status: { in: [...VISIBLE] } },
    include: { images: { orderBy: { order: "asc" } }, specs: { orderBy: { order: "asc" } }, category: true, make: true, model: true },
  });

export async function generateMetadata(props: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const params = await props.params;
  const p = await load(params.slug);
  if (!p) return { title: "Product not found" };
  const desc = p.seoDescription ?? (stripHtml(p.description ?? "").slice(0, 160) || `${p.title} (SKU ${p.sku}) available for export from Taiwan. Request a quote.`);
  const cover = p.images[0]?.url;
  return {
    title: p.seoTitle ?? `${p.title} (${p.sku})`,
    description: desc,
    alternates: { canonical: `/product/${p.slug}` },
    openGraph: { title: p.seoTitle ?? p.title, description: desc, type: "website", images: cover ? [{ url: cover }] : undefined },
  };
}

export default async function ProductPage(props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  const p = await load(params.slug);
  if (!p) notFound();

  const related = (
    await db.product.findMany({
      where: { id: { not: p.id }, status: "PUBLISHED", categoryId: p.categoryId },
      orderBy: [{ makeId: p.makeId ? "asc" : "desc" }, { createdAt: "desc" }],
      take: 40, select: summarySelect,
    })
  )
    .sort((a, b) => Number(b.make?.name === p.make?.name) - Number(a.make?.name === p.make?.name))
    .slice(0, 4)
    .map(toSummary);

  const sold = p.status === "SOLD" || p.stock === 0;
  const priceLabel = p.showPrice && p.price !== null ? `${p.currency} ${p.price.toLocaleString()}` : "Price on request";
  const years = p.yearFrom ? (p.yearTo && p.yearTo !== p.yearFrom ? `${p.yearFrom} – ${p.yearTo}` : String(p.yearFrom)) : null;
  const rows: [string, string | null][] = [
    ["SKU", p.sku], ["Category", p.category.name], ["Make", p.make?.name ?? null], ["Model", p.model?.name ?? null], ["Year", years],
    ["Engine code", p.engineCode], ["Displacement", p.displacement ? `${p.displacement.toLocaleString()} cc` : null],
    ["Fuel", p.fuel ? FUEL_LABEL[p.fuel] : null], ["Transmission", p.transmission ? TRANS_LABEL[p.transmission] : null], ["Drive", p.drive ? DRIVE_LABEL[p.drive] : null],
    ["Condition", COND_LABEL[p.condition]], ["Mileage", p.mileageKm ? `${p.mileageKm.toLocaleString()} km` : null],
    ["Weight", p.weightKg ? `${p.weightKg.toLocaleString()} kg` : null], ["Stock", sold ? "Sold" : String(p.stock)],
    ...p.specs.map((s): [string, string] => [s.key, s.value]),
  ];
  const specRows = rows.filter((r): r is [string, string] => !!r[1]);

  const url = `${site.url}/product/${p.slug}`;
  const crumbs = [{ name: "Home", href: "/" }, { name: "Catalog", href: "/catalog" }, { name: p.category.name, href: `/catalog/${p.category.slug}` }, ...(p.make ? [{ name: p.make.name, href: `/catalog/${p.category.slug}/${p.make.slug}` }] : []), { name: p.title, href: `/product/${p.slug}` }];
  const ld = [
    { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: crumbs.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: `${site.url}${c.href}` })) },
    {
      "@context": "https://schema.org", "@type": "Product", name: p.title, sku: p.sku, url,
      image: p.images.map((i) => (i.url.startsWith("http") ? i.url : `${site.url}${i.url}`)),
      description: stripHtml(p.description ?? "") || p.title,
      ...(p.make && { brand: { "@type": "Brand", name: p.make.name } }),
      itemCondition: p.condition === "NEW" ? "https://schema.org/NewCondition" : p.condition === "REBUILT" ? "https://schema.org/RefurbishedCondition" : "https://schema.org/UsedCondition",
      ...(p.showPrice && p.price !== null && { offers: { "@type": "Offer", price: p.price, priceCurrency: p.currency, availability: sold ? "https://schema.org/SoldOut" : "https://schema.org/InStock", url } }),
    },
  ];

  return (
    <div className="container py-8 md:py-12">
      {ld.map((o, i) => <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(o) }} />)}
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-sm">
        {crumbs.map((c, i) => (
          <span key={c.href} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="h-3.5 w-3.5" />}
            {i === crumbs.length - 1 ? <span aria-current="page" className="max-w-[16rem] truncate font-semibold text-charcoal">{c.name}</span> : <Link href={c.href} className="hover:text-brand">{c.name}</Link>}
          </span>
        ))}
      </nav>

      <div className="mt-6 grid gap-10 lg:grid-cols-[1fr_24rem] xl:grid-cols-[1fr_26rem]">
        <div className="min-w-0">
          <Gallery images={p.images.map((i) => ({ url: i.url, thumbUrl: i.thumbUrl, blur: i.blur, alt: i.alt ?? p.title }))} video={p.videoUrl} title={p.title} />

          <div className="mt-10 lg:hidden"><QuotePanel p={{ id: p.id, slug: p.slug, title: p.title, sku: p.sku, stock: p.stock, sold }} priceLabel={priceLabel} url={url} /></div>

          <div className="mt-10">
            <div className="flex flex-wrap items-center gap-3">
              {p.make && <span className="text-xs font-semibold uppercase tracking-wider text-brand">{p.make.name}</span>}
              <StockBadge stock={p.stock} status={p.status} inline />
            </div>
            <h1 className="mt-3 text-3xl font-bold leading-tight tracking-tight md:text-4xl">{p.title}</h1>
            <p className="mt-1 text-sm">SKU {p.sku}</p>
          </div>

          <section className="mt-10" aria-labelledby="specs">
            <h2 id="specs" className="text-xl font-bold">Specifications</h2>
            <dl className="mt-4 divide-y divide-silver/40 overflow-hidden rounded-2xl ring-1 ring-silver/40">
              {specRows.map(([k, v], i) => (
                <div key={k + i} className="grid grid-cols-[9rem_1fr] gap-4 px-5 py-3 text-sm odd:bg-mist/60 sm:grid-cols-[12rem_1fr]">
                  <dt className="font-semibold text-charcoal">{k}</dt><dd>{v}</dd>
                </div>
              ))}
            </dl>
          </section>

          {p.description && (
            <section className="mt-10" aria-labelledby="desc">
              <h2 id="desc" className="text-xl font-bold">Description</h2>
              <div className="prose-rich mt-4 text-graphite" dangerouslySetInnerHTML={{ __html: cleanHtml(p.description) ?? "" }} />
            </section>
          )}
          {p.included && (
            <section className="mt-10" aria-labelledby="inc">
              <h2 id="inc" className="text-xl font-bold">What is included</h2>
              <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                {p.included.split(/[,\n]/).map((s) => s.trim()).filter(Boolean).map((s) => (
                  <li key={s} className="flex items-start gap-2 text-sm"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />{s}</li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <aside className="hidden lg:block"><div className="sticky top-24"><QuotePanel p={{ id: p.id, slug: p.slug, title: p.title, sku: p.sku, stock: p.stock, sold }} priceLabel={priceLabel} url={url} /></div></aside>
      </div>

      {related.length > 0 && (
        <section className="mt-20" aria-labelledby="rel">
          <h2 id="rel" className="text-2xl font-bold">You may also need</h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">{related.map((r) => <ProductCard key={r.id} p={r} />)}</div>
        </section>
      )}
    </div>
  );
}
