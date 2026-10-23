import { NextResponse } from "next/server";
import type { ProductStatus } from "@prisma/client";
import { adminGuard } from "@/lib/admin-api";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { IMPORT_FIELDS } from "@/lib/import/columns";
import { buildSheet } from "@/lib/import/files";

export const runtime = "nodejs";

const FUEL = { PETROL: "Petrol", DIESEL: "Diesel", HYBRID: "Hybrid", ELECTRIC: "Electric" } as const;
const TRANS = { AT: "AT", MT: "MT", CVT: "CVT" } as const;
const DRIVE = { TWO_WD: "2WD", FOUR_WD: "4WD" } as const;
const plain = (h: string | null) => (h ?? "").replace(/<\/p>\s*<p>/gi, "\n\n").replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim();

export async function GET(req: Request) {
  const g = await adminGuard(req, "export-products", 10);
  if ("error" in g) return g.error;
  const sp = new URL(req.url).searchParams;
  const format = sp.get("format") === "xlsx" ? "xlsx" : "csv";
  const status = sp.get("status");
  const products = await db.product.findMany({
    where: status && ["DRAFT", "PUBLISHED", "SOLD", "ARCHIVED"].includes(status) ? { status: status as ProductStatus } : {},
    orderBy: { createdAt: "desc" },
    include: { category: true, make: true, model: true, specs: { orderBy: { order: "asc" } } },
  });
  const rows = products.map((p) => IMPORT_FIELDS.map((f) => {
    switch (f.key) {
      case "sku": return p.sku; case "title": return p.title; case "category": return p.category.name; case "make": return p.make?.name ?? "";
      case "model": return p.model?.name ?? ""; case "yearFrom": return p.yearFrom ?? ""; case "yearTo": return p.yearTo ?? "";
      case "engineCode": return p.engineCode ?? ""; case "displacement": return p.displacement ?? "";
      case "fuel": return p.fuel ? FUEL[p.fuel] : ""; case "transmission": return p.transmission ? TRANS[p.transmission] : ""; case "drive": return p.drive ? DRIVE[p.drive] : "";
      case "condition": return p.condition[0] + p.condition.slice(1).toLowerCase(); case "weightKg": return p.weightKg ?? ""; case "mileageKm": return p.mileageKm ?? "";
      case "stock": return p.stock; case "price": return p.price ?? ""; case "showPrice": return p.showPrice ? "yes" : "no"; case "currency": return p.currency;
      case "status": return p.status.toLowerCase(); case "featured": return p.featured ? "yes" : "no"; case "description": return plain(p.description);
      case "included": return p.included ?? ""; case "videoUrl": return p.videoUrl ?? ""; case "seoTitle": return p.seoTitle ?? ""; case "seoDescription": return p.seoDescription ?? "";
      case "specs": return p.specs.map((s) => `${s.key}: ${s.value}`).join(" | ");
    }
  }));
  const { body, type, ext } = await buildSheet(format, "Products", IMPORT_FIELDS.map((f) => f.header), rows);
  await audit(g.user, "export", "Product", null, `Exported ${products.length} products to ${ext.toUpperCase()}`);
  return new NextResponse(new Uint8Array(body), { headers: { "Content-Type": type, "Content-Disposition": `attachment; filename="products-${new Date().toISOString().slice(0, 10)}.${ext}"`, "Cache-Control": "no-store" } });
}
