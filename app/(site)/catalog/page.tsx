import type { Metadata } from "next";
import { CatalogView, catalogHeading } from "@/components/catalog/catalog-view";

export const dynamic = "force-dynamic";
type SP = Record<string, string | string[] | undefined>;

export async function generateMetadata(props: { searchParams: Promise<SP> }): Promise<Metadata> {
  const searchParams = await props.searchParams;
  const make = typeof searchParams.make === "string" ? searchParams.make : undefined;
  const { make: m } = await catalogHeading({ make });
  return {
    title: m ? `Used ${m.name} Cars, Engines & Parts` : "Catalog: Used Cars, Engines, Parts & Car Cuts",
    description: "Browse inspected used cars, engines, gearboxes, parts and car cuts exported from Taiwan. Filter by make, model, year, engine code and more.",
    alternates: { canonical: "/catalog" },
    ...(Object.keys(searchParams).length ? { robots: { index: false, follow: true } } : {}), // omit the key entirely otherwise (undefined would erase inherited values)
  };
}

export default async function CatalogPage(props: { searchParams: Promise<SP> }) {
  const searchParams = await props.searchParams;
  return <CatalogView searchParams={searchParams} preset={{}} />;
}
