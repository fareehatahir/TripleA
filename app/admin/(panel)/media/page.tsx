import Link from "next/link";
import { Search } from "lucide-react";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { PageHeader, inputCls } from "@/components/admin/ui";
import { MediaLibrary } from "./media-library";

export const metadata = { title: "Media library" };

const PAGE = 48;

export default async function MediaPage(props: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const searchParams = await props.searchParams;
  const q = searchParams.q?.trim() ?? "";
  const page = Math.max(1, Number(searchParams.page) || 1);
  const where = q ? { filename: { contains: q } } : {};
  const [assets, total] = await Promise.all([
    db.mediaAsset.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE, take: PAGE }),
    db.mediaAsset.count({ where }),
  ]);

  const ids = assets.map((a) => a.id);
  const [prodRefs, galleryRefs] = await Promise.all([
    db.productImage.findMany({ where: { mediaId: { in: ids } }, select: { mediaId: true, product: { select: { id: true, title: true } } } }),
    db.loadingPhoto.findMany({ where: { url: { in: assets.map((a) => a.url) } }, select: { url: true } }),
  ]);
  const usage = new Map<string, { products: { id: string; title: string }[]; gallery: boolean }>();
  for (const a of assets) usage.set(a.id, { products: [], gallery: galleryRefs.some((g) => g.url === a.url) });
  for (const r of prodRefs) usage.get(r.mediaId!)!.products.push(r.product);

  const pages = Math.max(1, Math.ceil(total / PAGE));
  return (
    <>
      <PageHeader title="Media library" description={`${total} file${total === 1 ? "" : "s"} · every upload is converted to WebP with a thumbnail`} />
      <form className="relative mb-5 max-w-md" role="search">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2" />
        <input name="q" defaultValue={q} placeholder="Search by file name" aria-label="Search media" className={`${inputCls} pl-10`} />
      </form>
      <MediaLibrary
        assets={assets.map((a) => ({ id: a.id, url: a.url, thumbUrl: a.thumbUrl, filename: a.filename, size: a.size, width: a.width, height: a.height, createdAt: a.createdAt.toISOString(), usage: usage.get(a.id)! }))}
        searching={!!q}
      />
      {pages > 1 && (
        <nav aria-label="Pagination" className="mt-6 flex items-center justify-between text-sm">
          <span>Page {page} of {pages}</span>
          <span className="flex gap-2">
            {page > 1 && <Button asChild size="sm" variant="ghost"><Link href={`/admin/media?${new URLSearchParams({ ...(q && { q }), page: String(page - 1) })}`}>Previous</Link></Button>}
            {page < pages && <Button asChild size="sm" variant="ghost"><Link href={`/admin/media?${new URLSearchParams({ ...(q && { q }), page: String(page + 1) })}`}>Next</Link></Button>}
          </span>
        </nav>
      )}
    </>
  );
}
