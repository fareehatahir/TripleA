import { createHash, randomBytes } from "crypto";
import path from "path";
import { promises as fs } from "fs";
import sharp from "sharp";
import { db } from "@/lib/db";
import { getAppSettingFresh } from "@/lib/app-settings";
import { deleteObject, keyFromUrl, publicUrl, putObject } from "@/lib/storage";

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const ALLOWED = new Set(["jpeg", "png", "webp", "heif", "avif", "gif", "tiff"]);
const MAX_EDGE = 2000;
const THUMB_EDGE = 480;

export class UploadError extends Error {}

let watermarkBuf: Buffer | null | undefined;
async function watermark(width: number) {
  const on = process.env.WATERMARK === "true" || (await getAppSettingFresh("general").catch(() => null))?.watermark;
  if (!on) return null;
  if (watermarkBuf === undefined) {
    try {
      watermarkBuf = await fs.readFile(path.join(process.cwd(), "public/brand/logo.png"));
    } catch {
      watermarkBuf = null;
    }
  }
  if (!watermarkBuf) return null;
  const w = Math.round(width * 0.2);
  return sharp(watermarkBuf).resize({ width: w }).ensureAlpha(0.55).toBuffer();
}

/**
 * Validates by actual content (not file name/MIME header), strips EXIF (after honouring rotation),
 * resizes, converts to WebP, makes a thumbnail and a tiny blur placeholder, and stores everything.
 * Re-uploading the same bytes returns the existing asset.
 */
export async function processAndStoreImage(input: Buffer, originalName: string, uploadedById?: string | null) {
  if (input.length > MAX_UPLOAD_BYTES) throw new UploadError(`${originalName}: larger than 10 MB`);
  const hash = createHash("sha256").update(input).digest("hex");
  const existing = await db.mediaAsset.findFirst({ where: { hash } });
  if (existing) return { asset: existing, duplicate: true };

  let meta: Awaited<ReturnType<ReturnType<typeof sharp>["metadata"]>>;
  try {
    meta = await sharp(input, { failOn: "error" }).metadata();
  } catch {
    throw new UploadError(`${originalName}: not a readable image`);
  }
  if (!meta.format || !ALLOWED.has(meta.format)) throw new UploadError(`${originalName}: unsupported image type`);

  const base = sharp(input, { failOn: "error" }).rotate();
  let main = base.clone().resize({ width: MAX_EDGE, height: MAX_EDGE, fit: "inside", withoutEnlargement: true });
  const resized = await main.clone().toBuffer({ resolveWithObject: true });
  const wm = await watermark(resized.info.width);
  if (wm) main = sharp(resized.data).composite([{ input: wm, gravity: "southeast" }]);
  else main = sharp(resized.data);

  const webp = await main.webp({ quality: 80 }).toBuffer({ resolveWithObject: true });
  const thumb = await sharp(resized.data).resize({ width: THUMB_EDGE, height: THUMB_EDGE, fit: "inside" }).webp({ quality: 72 }).toBuffer();
  const blurBuf = await sharp(resized.data).resize(16).blur(1).webp({ quality: 40 }).toBuffer();

  const now = new Date();
  const id = randomBytes(10).toString("hex");
  const dir = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}`;
  const key = `${dir}/${id}.webp`;
  const thumbKey = `${dir}/${id}-thumb.webp`;
  await putObject(key, webp.data, "image/webp");
  await putObject(thumbKey, thumb, "image/webp");

  const asset = await db.mediaAsset.create({
    data: {
      url: publicUrl(key),
      thumbUrl: publicUrl(thumbKey),
      blur: `data:image/webp;base64,${blurBuf.toString("base64")}`,
      hash,
      filename: originalName.replace(/[^\w.\- ]+/g, "_").slice(0, 120),
      mime: "image/webp",
      size: webp.data.length,
      width: webp.info.width,
      height: webp.info.height,
      uploadedById: uploadedById ?? null,
    },
  });
  return { asset, duplicate: false };
}

export async function deleteAssetFiles(asset: { url: string; thumbUrl: string | null }) {
  await deleteObject(keyFromUrl(asset.url)).catch(() => {});
  if (asset.thumbUrl) await deleteObject(keyFromUrl(asset.thumbUrl)).catch(() => {});
}
