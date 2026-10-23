import JSZip from "jszip";
import { db } from "@/lib/db";
import { MAX_UPLOAD_BYTES, processAndStoreImage, UploadError } from "@/lib/images";

export const MAX_ZIP_BYTES = 200 * 1024 * 1024;
const MAX_ENTRIES = 1500;
const IMG = /\.(jpe?g|png|webp|heic|heif|avif|gif|tiff?)$/i;
const SEP = /[\s_\-.]/;

/**
 * Finds the SKU a file belongs to. Accepts "CAR-0001.jpg", "CAR-0001_2.jpg", "CAR-0001 front.jpg"
 * and folders like "CAR-0001/front.jpg". The longest SKU wins, so "ENG-12" is never mistaken for "ENG-1".
 */
export function matchSku(path: string, skusLongestFirst: { lower: string; sku: string }[]) {
  const parts = path.split("/").filter(Boolean);
  const stem = (parts[parts.length - 1] ?? "").replace(/\.[^.]+$/, "").toLowerCase();
  const tryMatch = (s: string) => skusLongestFirst.find((k) => s === k.lower || (s.startsWith(k.lower) && SEP.test(s[k.lower.length])));
  const byName = tryMatch(stem);
  if (byName) return byName.sku;
  for (let i = parts.length - 2; i >= 0; i--) {
    const byFolder = skusLongestFirst.find((k) => parts[i].toLowerCase() === k.lower);
    if (byFolder) return byFolder.sku;
  }
  return null;
}

const natural = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });

export type ZipReport = { matched: Record<string, number>; added: number; duplicates: number; unmatched: string[]; skipped: string[]; errors: string[]; totalFiles: number };

export async function importImageZip(buf: Buffer, userId: string): Promise<ZipReport> {
  if (buf.length > MAX_ZIP_BYTES) throw new Error("ZIP is larger than 200 MB. Split it into several smaller ZIP files.");
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(buf);
  } catch {
    throw new Error("That does not look like a valid ZIP file.");
  }
  const entries = Object.values(zip.files).filter((f) => !f.dir && !/(^|\/)(__MACOSX|\.)/.test(f.name) && !/(^|\/)\./.test(f.name.split("/").pop() ?? ""));
  if (entries.length > MAX_ENTRIES) throw new Error(`The ZIP has ${entries.length} files; the limit is ${MAX_ENTRIES} per upload.`);

  const products = await db.product.findMany({ select: { id: true, sku: true } });
  const skus = products.map((p) => ({ lower: p.sku.toLowerCase(), sku: p.sku })).sort((a, b) => b.lower.length - a.lower.length);
  const idBySku = new Map(products.map((p) => [p.sku, p.id]));

  const report: ZipReport = { matched: {}, added: 0, duplicates: 0, unmatched: [], skipped: [], errors: [], totalFiles: entries.length };
  const groups = new Map<string, JSZip.JSZipObject[]>();
  for (const e of entries) {
    if (!IMG.test(e.name)) { report.skipped.push(e.name); continue; }
    const sku = matchSku(e.name, skus);
    if (!sku) { report.unmatched.push(e.name); continue; }
    groups.set(sku, [...(groups.get(sku) ?? []), e]);
  }

  let budget = 600 * 1024 * 1024; // total uncompressed bytes we are willing to expand (zip-bomb guard)
  for (const [sku, files] of groups) {
    const productId = idBySku.get(sku)!;
    const existing = await db.productImage.findMany({ where: { productId }, select: { mediaId: true, order: true } });
    const have = new Set(existing.map((i) => i.mediaId));
    let order = existing.reduce((m, i) => Math.max(m, i.order + 1), 0);
    for (const f of files.sort((a, b) => natural(a.name, b.name))) {
      try {
        const data = await f.async("nodebuffer");
        budget -= data.length;
        if (budget < 0) throw new UploadError("Too much data in the ZIP");
        if (data.length > MAX_UPLOAD_BYTES) throw new UploadError(`${f.name}: larger than 10 MB`);
        const { asset } = await processAndStoreImage(data, f.name.split("/").pop()!, userId);
        if (have.has(asset.id)) { report.duplicates++; continue; }
        await db.productImage.create({ data: { productId, mediaId: asset.id, url: asset.url, thumbUrl: asset.thumbUrl, blur: asset.blur, alt: null, order: order++, isCover: order === 1 } });
        have.add(asset.id);
        report.added++;
        report.matched[sku] = (report.matched[sku] ?? 0) + 1;
      } catch (e) {
        report.errors.push(e instanceof UploadError ? e.message : `${f.name}: could not be processed`);
      }
    }
  }
  report.unmatched = report.unmatched.slice(0, 50);
  report.skipped = report.skipped.slice(0, 20);
  report.errors = report.errors.slice(0, 30);
  return report;
}
