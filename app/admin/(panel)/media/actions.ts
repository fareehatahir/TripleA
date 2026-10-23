"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { deleteAssetFiles } from "@/lib/images";
import { assertRole } from "@/lib/session";

export async function deleteMediaAction(ids: string[]): Promise<{ ok: true; count: number } | { ok: false; error: string }> {
  const actor = await assertRole();
  if (!ids.length || ids.length > 200) return { ok: false, error: "Select between 1 and 200 files" };
  const assets = await db.mediaAsset.findMany({ where: { id: { in: ids } } });
  for (const a of assets) {
    // Remove product references (and keep covers consistent), then the file.
    const refs = await db.productImage.findMany({ where: { mediaId: a.id }, select: { productId: true } });
    await db.productImage.deleteMany({ where: { mediaId: a.id } });
    for (const pid of new Set(refs.map((r) => r.productId))) {
      const first = await db.productImage.findFirst({ where: { productId: pid }, orderBy: { order: "asc" } });
      if (first) {
        await db.productImage.updateMany({ where: { productId: pid }, data: { isCover: false } });
        await db.productImage.update({ where: { id: first.id }, data: { isCover: true } });
      }
    }
    await db.loadingPhoto.deleteMany({ where: { url: a.url } });
    await db.mediaAsset.delete({ where: { id: a.id } });
    await deleteAssetFiles(a);
  }
  await audit(actor, "delete", "MediaAsset", null, `Deleted ${assets.length} media file${assets.length === 1 ? "" : "s"}`, { ids });
  revalidatePath("/", "layout");
  revalidatePath("/admin/media");
  revalidatePath("/admin/products");
  return { ok: true, count: assets.length };
}
