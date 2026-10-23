"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { assertRole } from "@/lib/session";
import { loadingPhotoSchema } from "@/lib/validation";

type Result = { ok: true } | { ok: false; error: string };
const refresh = () => (revalidatePath("/loading"), revalidatePath("/", "layout"), revalidatePath("/admin/loading-gallery"));

/** Creates gallery entries from freshly uploaded media, applying the shared caption/destination/date. */
export async function addLoadingPhotosAction(mediaIds: string[], defaults: unknown): Promise<Result> {
  const actor = await assertRole();
  const p = loadingPhotoSchema.safeParse(defaults);
  if (!p.success) return { ok: false, error: p.error.issues[0].message };
  if (!mediaIds.length || mediaIds.length > 50) return { ok: false, error: "Add between 1 and 50 photos" };
  const media = await db.mediaAsset.findMany({ where: { id: { in: mediaIds } } });
  const existing = new Set((await db.loadingPhoto.findMany({ where: { url: { in: media.map((m) => m.url) } }, select: { url: true } })).map((x) => x.url));
  const fresh = media.filter((m) => !existing.has(m.url));
  await db.loadingPhoto.createMany({ data: fresh.map((m) => ({ url: m.url, thumbUrl: m.thumbUrl, caption: p.data.caption ?? null, destination: p.data.destination ?? null, shotAt: p.data.shotAt })) });
  await audit(actor, "create", "LoadingPhoto", null, `Added ${fresh.length} loading photo${fresh.length === 1 ? "" : "s"}${p.data.destination ? ` for ${p.data.destination}` : ""}`);
  refresh();
  return { ok: true };
}
export async function updateLoadingPhotoAction(id: string, input: unknown): Promise<Result> {
  const actor = await assertRole();
  const p = loadingPhotoSchema.safeParse(input);
  if (!p.success) return { ok: false, error: p.error.issues[0].message };
  await db.loadingPhoto.update({ where: { id }, data: { caption: p.data.caption ?? null, destination: p.data.destination ?? null, shotAt: p.data.shotAt } });
  await audit(actor, "update", "LoadingPhoto", id, "Edited a loading photo");
  refresh();
  return { ok: true };
}
/** Removes it from the gallery only; the file stays in the media library. */
export async function deleteLoadingPhotosAction(ids: string[]): Promise<Result> {
  const actor = await assertRole();
  const r = await db.loadingPhoto.deleteMany({ where: { id: { in: ids } } });
  await audit(actor, "delete", "LoadingPhoto", null, `Removed ${r.count} photo${r.count === 1 ? "" : "s"} from the gallery`);
  refresh();
  return { ok: true };
}
