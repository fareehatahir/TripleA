import { NextResponse } from "next/server";
import { adminGuard } from "@/lib/admin-api";
import { autoMap } from "@/lib/import/columns";
import { MAX_FILE_BYTES, parseSpreadsheet } from "@/lib/import/files";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const g = await adminGuard(req, "import-parse", 20);
  if ("error" in g) return g.error;
  const file = (await req.formData().catch(() => null))?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file received" }, { status: 400 });
  if (file.size > MAX_FILE_BYTES) return NextResponse.json({ error: "File is larger than 10 MB" }, { status: 413 });
  try {
    const { headers, rows, truncated, total } = await parseSpreadsheet(Buffer.from(await file.arrayBuffer()), file.name);
    return NextResponse.json({ headers, rows, total, truncated, mapping: autoMap(headers), filename: file.name });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Could not read the file" }, { status: 422 });
  }
}
