import { db } from "@/lib/db";
import { PageHeader } from "@/components/admin/ui";
import { TaxonomyManager } from "./taxonomy-manager";

export const metadata = { title: "Taxonomy" };

export default async function TaxonomyPage() {
  const [categories, makes] = await Promise.all([
    db.category.findMany({ orderBy: { order: "asc" }, include: { _count: { select: { products: true } } } }),
    db.make.findMany({ orderBy: { order: "asc" }, include: { _count: { select: { products: true } }, models: { orderBy: { name: "asc" }, include: { _count: { select: { products: true } } } } } }),
  ]);
  return (
    <>
      <PageHeader title="Taxonomy" description="Categories, makes (brands) and models used to organise the catalog and its filters." />
      <TaxonomyManager
        categories={categories.map((c) => ({ id: c.id, name: c.name, slug: c.slug, image: c.image, count: c._count.products }))}
        makes={makes.map((m) => ({ id: m.id, name: m.name, slug: m.slug, logo: m.logo, count: m._count.products, models: m.models.map((x) => ({ id: x.id, name: x.name, slug: x.slug, count: x._count.products })) }))}
      />
    </>
  );
}
