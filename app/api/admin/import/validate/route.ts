import { NextResponse } from "next/server";
import { adminGuard } from "@/lib/admin-api";
import { planImport, summarize } from "@/lib/import/process";
import { importBody } from "@/lib/import/schema";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const g = await adminGuard(req, "import-validate", 30);
  if ("error" in g) return g.error;
  const body = importBody.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const { results } = await planImport(body.data.rows, body.data.mapping, body.data.options);
  return NextResponse.json({ results, summary: summarize(results) });
}
