import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { getUser } from "@/lib/session";

// CSV cells starting with = + - @ are executed as formulas by Excel; prefix them so they stay text.
const cell = (v: unknown) => {
  let s = v === null || v === undefined ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
};

export async function GET(req: Request) {
  const user = await getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });
  const status = new URL(req.url).searchParams.get("status");
  const rows = await db.inquiry.findMany({
    where: status && ["NEW", "CONTACTED", "QUOTED", "WON", "LOST"].includes(status) ? { status: status as "NEW" } : {},
    orderBy: { createdAt: "desc" },
    include: { items: true },
  });
  const head = ["Reference", "Date", "Status", "Name", "Company", "Country", "Phone", "Email", "Port", "Items", "Message", "Notes"];
  const lines = rows.map((q) =>
    [q.reference, q.createdAt.toISOString(), q.status, q.name, q.company, q.country, q.phone, q.email, q.port, q.items.map((i) => `${i.title} (${i.sku}) x${i.qty}`).join("; "), q.message, q.notes].map(cell).join(",")
  );
  await audit(user, "export", "Inquiry", null, `Exported ${rows.length} inquiries to CSV`);
  return new NextResponse("﻿" + [head.map(cell).join(","), ...lines].join("\r\n"), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="inquiries-${new Date().toISOString().slice(0, 10)}.csv"`, "Cache-Control": "no-store" },
  });
}
