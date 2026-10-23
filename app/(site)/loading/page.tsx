import type { Metadata } from "next";
import Link from "next/link";
import { Camera } from "lucide-react";
import { db } from "@/lib/db";
import { PageHero } from "@/components/layout/page-hero";
import { CtaBand } from "@/components/home/sections";
import { cn } from "@/lib/utils";
import { LoadingGrid } from "./loading-grid";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Container Loading Gallery",
  description: "Photos from our real container loadings in Taiwan: cars, engines and parts packed and shipped to buyers worldwide.",
  alternates: { canonical: "/loading" },
};

export default async function LoadingPage(props: { searchParams: Promise<{ year?: string; dest?: string }> }) {
  const searchParams = await props.searchParams;
  const all = await db.loadingPhoto.findMany({ orderBy: { shotAt: "desc" } });
  const years = [...new Set(all.map((p) => p.shotAt.getFullYear()))];
  const dests = [...new Set(all.map((p) => p.destination).filter((d): d is string => !!d))].sort();
  const year = years.find((y) => String(y) === searchParams.year);
  const dest = dests.find((d) => d === searchParams.dest);
  const photos = all.filter((p) => (!year || p.shotAt.getFullYear() === year) && (!dest || p.destination === dest));

  const media = await db.mediaAsset.findMany({ where: { url: { in: photos.map((p) => p.url) } }, select: { url: true, width: true, height: true } });
  const dims = new Map(media.map((m) => [m.url, m]));
  const href = (o: { year?: number; dest?: string }) => {
    const sp = new URLSearchParams();
    const y = "year" in o ? o.year : year, d = "dest" in o ? o.dest : dest;
    if (y) sp.set("year", String(y));
    if (d) sp.set("dest", d);
    return `/loading${sp.size ? `?${sp}` : ""}`;
  };
  const chip = (active: boolean) => cn("rounded-full px-4 py-2 text-sm font-semibold transition", active ? "bg-charcoal text-white" : "bg-mist hover:bg-silver/50");

  return (
    <>
      <PageHero eyebrow="Loading gallery" title="Real containers. Real cargo." intro="Photos from our own loadings in Taiwan. Ask us for photos or video of your own order." crumbs={[{ name: "Loading gallery" }]} />
      <div className="container py-12 md:py-16">
        {(years.length > 1 || dests.length > 0) && (
          <div className="mb-8 space-y-3" aria-label="Filters">
            {years.length > 1 && (
              <div className="flex flex-wrap items-center gap-2"><span className="mr-1 text-sm font-semibold text-charcoal">Year</span>
                <Link href={href({ year: undefined })} className={chip(!year)}>All</Link>
                {years.map((y) => <Link key={y} href={href({ year: y })} aria-current={y === year} className={chip(y === year)}>{y}</Link>)}
              </div>
            )}
            {dests.length > 0 && (
              <div className="flex flex-wrap items-center gap-2"><span className="mr-1 text-sm font-semibold text-charcoal">Destination</span>
                <Link href={href({ dest: undefined })} className={chip(!dest)}>All</Link>
                {dests.map((d) => <Link key={d} href={href({ dest: d })} aria-current={d === dest} className={chip(d === dest)}>{d}</Link>)}
              </div>
            )}
          </div>
        )}
        {photos.length === 0 ? (
          <div className="grid place-items-center rounded-3xl bg-mist px-6 py-20 text-center"><Camera className="h-10 w-10 text-graphite" /><p className="mt-3 font-semibold text-charcoal">No photos yet</p><p className="mt-1 text-sm">Check back soon, or ask us for photos of a recent loading.</p></div>
        ) : (
          <LoadingGrid items={photos.map((p) => ({ id: p.id, url: p.url, thumbUrl: p.thumbUrl, caption: p.caption, destination: p.destination, date: p.shotAt.toISOString(), width: dims.get(p.url)?.width ?? 1200, height: dims.get(p.url)?.height ?? 900 }))} />
        )}
      </div>
      <CtaBand title="Want your cargo on this wall?" text="Send an inquiry and we will start your next loading." />
    </>
  );
}
