import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { ProductForm } from "../product-form";
import { loadTaxonomy } from "../taxonomy-data";

export const metadata = { title: "Edit product" };

export default async function EditProduct(
  props: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string }> }
) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const [p, taxonomy] = await Promise.all([
    db.product.findUnique({ where: { id: params.id }, include: { images: { orderBy: { order: "asc" } }, specs: { orderBy: { order: "asc" } } } }),
    loadTaxonomy(),
  ]);
  if (!p) notFound();
  return (
    <ProductForm
      id={p.id}
      created={searchParams.created === "1"}
      taxonomy={taxonomy}
      initial={{
        sku: p.sku, title: p.title, slug: p.slug, categoryId: p.categoryId, makeId: p.makeId ?? "", modelId: p.modelId ?? "",
        yearFrom: p.yearFrom ?? "", yearTo: p.yearTo ?? "", engineCode: p.engineCode ?? "", displacement: p.displacement ?? "",
        fuel: p.fuel ?? "", transmission: p.transmission ?? "", drive: p.drive ?? "", condition: p.condition,
        weightKg: p.weightKg ?? "", mileageKm: p.mileageKm ?? "", stock: p.stock, currency: p.currency, price: p.price ?? "", showPrice: p.showPrice,
        featured: p.featured, status: p.status, videoUrl: p.videoUrl ?? "", seoTitle: p.seoTitle ?? "", seoDescription: p.seoDescription ?? "",
        description: p.description ?? "", included: p.included ?? "",
        specs: p.specs.map((s) => ({ key: s.key, value: s.value })),
        images: p.images.filter((i) => i.mediaId).map((i) => ({ mediaId: i.mediaId!, url: i.url, thumbUrl: i.thumbUrl, blur: i.blur, alt: i.alt ?? "" })),
      }}
    />
  );
}
