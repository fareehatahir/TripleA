import type { Metadata } from "next";
import { CatalogView, catalogHeading } from "@/components/catalog/catalog-view";

export const dynamic = "force-dynamic";
type SP = Record<string, string | string[] | undefined>;

export async function generateMetadata(
  props: { params: Promise<{ category: string }>; searchParams: Promise<SP> }
): Promise<Metadata> {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const { category } = await catalogHeading({ category: params.category });
  const name = category?.name ?? "Catalog";
  return {
    title: `Used ${name} for Export from Taiwan`,
    description: `Wholesale used ${name.toLowerCase()} from Taiwan, inspected and ready to ship worldwide. Browse by make and request a quote.`,
    alternates: { canonical: `/catalog/${params.category}` },
    ...(Object.keys(searchParams).length ? { robots: { index: false, follow: true } } : {}), // omit the key entirely otherwise (undefined would erase inherited values)
  };
}

export default async function CategoryPage(
  props: { params: Promise<{ category: string }>; searchParams: Promise<SP> }
) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  return <CatalogView searchParams={searchParams} preset={{ category: params.category }} />;
}
