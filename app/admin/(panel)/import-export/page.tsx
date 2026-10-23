import { db } from "@/lib/db";
import { PageHeader } from "@/components/admin/ui";
import { ImportTools } from "./import-tools";

export const metadata = { title: "Import / Export" };

export default async function ImportExportPage() {
  const [products, categories] = await Promise.all([db.product.count(), db.category.findMany({ orderBy: { order: "asc" }, select: { name: true } })]);
  return (
    <>
      <PageHeader title="Import / Export" description="Load hundreds of products from Excel or CSV, attach photos from a ZIP, or download your catalog." />
      <ImportTools productCount={products} categories={categories.map((c) => c.name)} />
    </>
  );
}
