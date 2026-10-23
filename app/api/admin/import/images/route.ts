import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { adminGuard } from "@/lib/admin-api";
import { audit } from "@/lib/audit";
import { importImageZip, MAX_ZIP_BYTES } from "@/lib/import/zip-images";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: Request) {
  const g = await adminGuard(req, "import-images", 6);
  if ("error" in g) return g.error;
  const file = (await req.formData().catch(() => null))?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file received" }, { status: 400 });
  if (!/\.zip$/i.test(file.name)) return NextResponse.json({ error: "Please upload a .zip file" }, { status: 422 });
  if (file.size > MAX_ZIP_BYTES) return NextResponse.json({ error: "ZIP is larger than 200 MB. Split it into smaller ZIP files." }, { status: 413 });
  try {
    const report = await importImageZip(Buffer.from(await file.arrayBuffer()), g.user.id);
    await audit(g.user, "create", "ProductImage", null, `Photo ZIP: ${report.added} photos added to ${Object.keys(report.matched).length} products (${report.unmatched.length} unmatched)`);
    revalidatePath("/", "layout");
    return NextResponse.json(report);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Import failed" }, { status: 422 });
  }
}
