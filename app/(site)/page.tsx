import { db } from "@/lib/db";
import { getContent } from "@/lib/content";
import { VISIBLE, summarySelect, toSummary } from "@/lib/catalog";
import { Hero } from "@/components/home/hero";
import { QuickFinder } from "@/components/home/quick-finder";
import { CategoryCards, CtaBand, Destinations, Featured, HowItWorks, Loadings, Stats, Testimonials, WhyUs } from "@/components/home/sections";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [featured, categories, testimonials, photos, makes, home] = await Promise.all([
    db.product.findMany({ where: { status: "PUBLISHED", featured: true }, orderBy: { updatedAt: "desc" }, take: 10, select: summarySelect }),
    db.category.findMany({ orderBy: { order: "asc" }, select: { name: true, slug: true, _count: { select: { products: { where: { status: { in: [...VISIBLE] } } } } } } }),
    db.testimonial.findMany({ where: { active: true }, orderBy: { order: "asc" }, select: { id: true, name: true, role: true, quote: true } }),
    db.loadingPhoto.findMany({ orderBy: { shotAt: "desc" }, take: 5 }),
    db.make.findMany({ orderBy: { order: "asc" }, select: { name: true, slug: true } }),
    getContent("home"),
  ]);

  return (
    <>
      <Hero c={home.hero} />
      <QuickFinder makes={makes} />
      <CategoryCards categories={categories.map((c) => ({ name: c.name, slug: c.slug, count: c._count.products }))} />
      <Featured products={featured.map(toSummary)} />
      <Stats stats={home.stats} />
      <HowItWorks steps={home.steps} />
      <Destinations />
      <Loadings photos={photos.map((p) => ({ id: p.id, url: p.url, thumbUrl: p.thumbUrl, caption: p.caption, destination: p.destination, shotAt: p.shotAt.toISOString() }))} />
      <WhyUs why={home.why} />
      <Testimonials items={testimonials} />
      <CtaBand {...home.cta} />
    </>
  );
}
