import { NextResponse } from "next/server";
import { audit } from "@/lib/audit";
import { getUser } from "@/lib/session";
import { MAX_UPLOAD_BYTES, processAndStoreImage, UploadError } from "@/lib/images";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_FILES = 20;

export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  // CSRF: cookie-authenticated POST must come from our own origin.
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");
  if (origin && host && new URL(origin).host !== host) return NextResponse.json({ error: "Bad origin" }, { status: 403 });

  const limit = rateLimit(`upload:${user.id}`, 60, 60_000);
  if (!limit.ok) return NextResponse.json({ error: `Too many uploads. Retry in ${limit.retryAfter}s.` }, { status: 429 });

  const form = await req.formData().catch(() => null);
  const files = (form?.getAll("files") ?? []).filter((f): f is File => f instanceof File);
  if (!files.length) return NextResponse.json({ error: "No files received" }, { status: 400 });
  if (files.length > MAX_FILES) return NextResponse.json({ error: `Upload at most ${MAX_FILES} files at a time` }, { status: 400 });

  const assets = [];
  const errors: string[] = [];
  for (const f of files) {
    if (f.size > MAX_UPLOAD_BYTES) {
      errors.push(`${f.name}: larger than 10 MB`);
      continue;
    }
    try {
      const { asset } = await processAndStoreImage(Buffer.from(await f.arrayBuffer()), f.name, user.id);
      assets.push({ id: asset.id, url: asset.url, thumbUrl: asset.thumbUrl, blur: asset.blur, filename: asset.filename, width: asset.width, height: asset.height, size: asset.size });
    } catch (e) {
      errors.push(e instanceof UploadError ? e.message : `${f.name}: upload failed`);
    }
  }
  if (assets.length) await audit(user, "create", "MediaAsset", null, `Uploaded ${assets.length} image${assets.length === 1 ? "" : "s"}`);
  return NextResponse.json({ assets, errors }, { status: assets.length ? 200 : 422 });
}
