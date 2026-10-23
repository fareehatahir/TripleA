import { NextResponse } from "next/server";
import { adminGuard } from "@/lib/admin-api";
import { buildSheet } from "@/lib/import/files";
import { IMPORT_FIELDS } from "@/lib/import/columns";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const g = await adminGuard(req, "import-template", 30);
  if ("error" in g) return g.error;
  const format = new URL(req.url).searchParams.get("format") === "xlsx" ? "xlsx" : "csv";
  const headers = IMPORT_FIELDS.map((f) => f.header);
  const { body, type, ext } = await buildSheet(format, "Products", headers, [IMPORT_FIELDS.map((f) => f.example[0]), IMPORT_FIELDS.map((f) => f.example[1])]);
  return new NextResponse(new Uint8Array(body), { headers: { "Content-Type": type, "Content-Disposition": `attachment; filename="product-import-template.${ext}"`, "Cache-Control": "no-store" } });
}
