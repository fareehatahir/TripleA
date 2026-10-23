import type { Metadata } from "next";
import { CatalogView, catalogHeading } from "@/components/catalog/catalog-view";

export const dynamic = "force-dynamic";
type SP = Record<string, string | string[] | undefined>;

export async function generateMetadata(
  props: { params: Promise<{ category: string; make: string }>; searchParams: Promise<SP> }
): Promise<Metadata> {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const { category, make } = await catalogHeading(params);
  return {
    title: `Used ${make?.name ?? ""} ${category?.name ?? ""} for Export`.replace(/\s+/g, " ").trim(),
    description: `Used ${make?.name ?? ""} ${category?.name.toLowerCase() ?? ""} from Taiwan. Photos, specs and wholesale quotes for importers and dealers.`.replace(/\s+/g, " "),
    alternates: { canonical: `/catalog/${params.category}/${params.make}` },
    ...(Object.keys(searchParams).length ? { robots: { index: false, follow: true } } : {}), // omit the key entirely otherwise (undefined would erase inherited values)
  };
}

export default async function MakePage(
  props: { params: Promise<{ category: string; make: string }>; searchParams: Promise<SP> }
) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  return <CatalogView searchParams={searchParams} preset={params} />;
}
