import { NextResponse } from "next/server";
import { buildWhere, ci, parseFilters } from "@/lib/catalog";
import { db } from "@/lib/db";
import { clientIp, rateLimit } from "@/lib/rate-limit";

// Instant search suggestions (published/sold products only).
export async function GET(req: Request) {
  if (!rateLimit(`search:${clientIp(req.headers)}`, 60, 60_000).ok) return NextResponse.json({ results: [] }, { status: 429 });
  const q = new URL(req.url).searchParams.get("q")?.trim().slice(0, 60) ?? "";
  if (q.length < 2) return NextResponse.json({ results: [] });

  const where = await buildWhere(parseFilters({ q }));
  const rows = await db.product.findMany({
    where, take: 6, orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    select: { slug: true, title: true, sku: true, make: { select: { name: true } }, images: { orderBy: { order: "asc" }, take: 1, select: { thumbUrl: true, url: true } } },
  });
  const makes = await db.make.findMany({ where: { name: { contains: q, ...ci } }, take: 2, select: { name: true, slug: true } });
  return NextResponse.json(
    {
      results: rows.map((r) => ({ slug: r.slug, title: r.title, sku: r.sku, make: r.make?.name ?? null, image: r.images[0]?.thumbUrl ?? r.images[0]?.url ?? null })),
      makes,
    },
    { headers: { "Cache-Control": "public, max-age=30" } }
  );
}
