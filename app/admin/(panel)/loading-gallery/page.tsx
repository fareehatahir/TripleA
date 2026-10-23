import { db } from "@/lib/db";
import { PageHeader } from "@/components/admin/ui";
import { GalleryManager } from "./gallery-manager";

export const metadata = { title: "Loading gallery" };

export default async function GalleryPage() {
  const photos = await db.loadingPhoto.findMany({ orderBy: { shotAt: "desc" } });
  return (
    <>
      <PageHeader title="Loading gallery" description="Container-loading photos shown on the public Loading page and the home page." />
      <GalleryManager photos={photos.map((p) => ({ id: p.id, url: p.url, thumbUrl: p.thumbUrl, caption: p.caption ?? "", destination: p.destination ?? "", shotAt: p.shotAt.toISOString().slice(0, 10) }))} />
    </>
  );
}
