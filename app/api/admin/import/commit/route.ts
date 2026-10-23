import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { adminGuard } from "@/lib/admin-api";
import { audit } from "@/lib/audit";
import { getAppSettingFresh } from "@/lib/app-settings";
import { applyImport, planImport, summarize } from "@/lib/import/process";
import { importBody } from "@/lib/import/schema";

export const runtime = "nodejs";
export const maxDuration = 120;

/** Re-validates the rows on the server (the browser preview is never trusted), then writes what is valid. */
export async function POST(req: Request) {
  const g = await adminGuard(req, "import-commit", 60);
  if ("error" in g) return g.error;
  const body = importBody.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const { results, planned } = await planImport(body.data.rows, body.data.mapping, body.data.options);
  const { defaultCurrency } = await getAppSettingFresh("general");
  const done = await applyImport(planned, defaultCurrency);
  for (const d of done) {
    if (d.ok) continue;
    const r = results.find((x) => x.sku === d.sku);
    if (r) {
      r.action = "error";
      r.errors.push(d.error ?? "Could not save this row");
    }
  }

  const summary = summarize(results);
  await audit(g.user, "create", "Product", null, `Bulk import: ${summary.create} created, ${summary.update} updated, ${summary.skip} skipped, ${summary.error} with errors`);
  revalidatePath("/", "layout");
  return NextResponse.json({ results, summary });
}
