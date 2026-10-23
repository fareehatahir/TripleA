import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { getUser } from "@/lib/session";

export async function GET() {
  const user = await getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });
  const rows = await db.subscriber.findMany({ orderBy: { createdAt: "desc" } });
  await audit(user, "export", "Subscriber", null, `Exported ${rows.length} newsletter subscribers`);
  const csv = ["Email,Subscribed", ...rows.map((r) => `"${r.email.replace(/"/g, '""')}",${r.createdAt.toISOString()}`)].join("\r\n");
  return new NextResponse(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="subscribers.csv"', "Cache-Control": "no-store" } });
}
