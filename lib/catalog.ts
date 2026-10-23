import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

/** Case-insensitive `contains` on Postgres; SQLite LIKE is already case-insensitive for ASCII. */
export const ci = process.env.DATABASE_URL?.startsWith("postgres") ? ({ mode: "insensitive" } as const) : ({} as const);

export const PAGE_SIZE = 12;
export const VISIBLE = ["PUBLISHED", "SOLD"] as const;

export const FUEL_LABEL = { PETROL: "Petrol", DIESEL: "Diesel", HYBRID: "Hybrid", ELECTRIC: "Electric" } as const;
export const TRANS_LABEL = { AT: "Automatic", MT: "Manual", CVT: "CVT" } as const;
export const DRIVE_LABEL = { TWO_WD: "2WD", FOUR_WD: "4WD" } as const;
export const COND_LABEL = { USED: "Used", REBUILT: "Rebuilt", NEW: "New" } as const;

export type Filters = {
  q?: string; category?: string; make?: string; model?: string; part?: string; code?: string;
  yearMin?: number; yearMax?: number; dispMin?: number; dispMax?: number;
  fuel?: string; transmission?: string; drive?: string; condition?: string;
  inStock?: boolean; sort: "new" | "az" | "stock"; view: "grid" | "list"; page: number;
};

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() || undefined;
const num = (v: string | string[] | undefined) => {
  const n = Number(one(v));
  return Number.isFinite(n) && one(v) !== undefined ? n : undefined;
};
const oneOf = <T extends string>(v: string | undefined, allowed: readonly T[]) => (v && (allowed as readonly string[]).includes(v) ? (v as T) : undefined);

export function parseFilters(sp: SP, preset: { category?: string; make?: string } = {}): Filters {
  return {
    q: one(sp.q)?.slice(0, 80),
    category: preset.category ?? one(sp.category),
    make: preset.make ?? one(sp.make),
    model: one(sp.model)?.slice(0, 60),
    part: one(sp.part)?.slice(0, 60),
    code: one(sp.code)?.slice(0, 40),
    yearMin: num(sp.yearMin), yearMax: num(sp.yearMax), dispMin: num(sp.dispMin), dispMax: num(sp.dispMax),
    fuel: oneOf(one(sp.fuel), ["PETROL", "DIESEL", "HYBRID", "ELECTRIC"]),
    transmission: oneOf(one(sp.transmission), ["AT", "MT", "CVT"]),
    drive: oneOf(one(sp.drive), ["TWO_WD", "FOUR_WD"]),
    condition: oneOf(one(sp.condition), ["USED", "REBUILT", "NEW"]),
    inStock: one(sp.inStock) === "1",
    sort: oneOf(one(sp.sort), ["new", "az", "stock"]) ?? "new",
    view: oneOf(one(sp.view), ["grid", "list"]) ?? "grid",
    page: Math.max(1, Math.floor(num(sp.page) ?? 1)),
  };
}

export async function buildWhere(f: Filters, skip: { make?: boolean } = {}): Promise<Prisma.ProductWhereInput> {
  const and: Prisma.ProductWhereInput[] = [{ status: { in: [...VISIBLE] } }];
  if (f.category) and.push({ category: { slug: f.category } });
  if (f.make && !skip.make) and.push({ make: { slug: f.make } });
  if (f.model) {
    const bySlug = f.make ? await db.carModel.findFirst({ where: { slug: f.model, make: { slug: f.make } }, select: { id: true } }) : null;
    and.push(bySlug ? { modelId: bySlug.id } : { OR: [{ title: { contains: f.model, ...ci } }, { model: { name: { contains: f.model, ...ci } } }] });
  }
  if (f.part) and.push({ title: { contains: f.part, ...ci } });
  if (f.code) and.push({ engineCode: { contains: f.code, ...ci } });
  if (f.q) {
    for (const w of f.q.split(/\s+/).filter(Boolean).slice(0, 5))
      and.push({ OR: [{ title: { contains: w, ...ci } }, { sku: { contains: w, ...ci } }, { engineCode: { contains: w, ...ci } }, { make: { name: { contains: w, ...ci } } }, { model: { name: { contains: w, ...ci } } }] });
  }
  if (f.yearMin !== undefined) and.push({ OR: [{ yearTo: { gte: f.yearMin } }, { yearTo: null, yearFrom: { gte: f.yearMin } }] });
  if (f.yearMax !== undefined) and.push({ yearFrom: { lte: f.yearMax } });
  if (f.dispMin !== undefined) and.push({ displacement: { gte: f.dispMin } });
  if (f.dispMax !== undefined) and.push({ displacement: { lte: f.dispMax } });
  if (f.fuel) and.push({ fuel: f.fuel as never });
  if (f.transmission) and.push({ transmission: f.transmission as never });
  if (f.drive) and.push({ drive: f.drive as never });
  if (f.condition) and.push({ condition: f.condition as never });
  if (f.inStock) and.push({ status: "PUBLISHED", stock: { gt: 0 } });
  return { AND: and };
}

const orderBy = (s: Filters["sort"]): Prisma.ProductOrderByWithRelationInput[] => [
  { status: "asc" }, // PUBLISHED before SOLD
  s === "az" ? { title: "asc" } : s === "stock" ? { stock: "desc" } : { createdAt: "desc" },
];

export const summarySelect = {
  id: true, slug: true, title: true, sku: true, stock: true, status: true, price: true, showPrice: true, currency: true,
  yearFrom: true, yearTo: true, engineCode: true, displacement: true, fuel: true, transmission: true, drive: true, condition: true, mileageKm: true,
  featured: true, description: true, make: { select: { name: true } }, category: { select: { name: true, slug: true } },
  images: { orderBy: { order: "asc" as const }, take: 8, select: { url: true, thumbUrl: true, blur: true, alt: true } },
} satisfies Prisma.ProductSelect;

type Row = Prisma.ProductGetPayload<{ select: typeof summarySelect }>;

export type ProductSummary = {
  id: string; slug: string; title: string; sku: string; stock: number; status: "PUBLISHED" | "SOLD";
  price: number | null; currency: string; make: string | null; category: string;
  chips: string[]; excerpt: string; images: { url: string; thumbUrl: string | null; blur: string | null; alt: string }[];
};

const strip = (h: string | null) => (h ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

export function chipsFor(p: Pick<Row, "yearFrom" | "yearTo" | "engineCode" | "displacement" | "fuel" | "transmission" | "drive" | "condition">) {
  const c: string[] = [];
  if (p.yearFrom) c.push(p.yearTo && p.yearTo !== p.yearFrom ? `${p.yearFrom}–${p.yearTo}` : String(p.yearFrom));
  if (p.engineCode) c.push(p.engineCode);
  if (p.displacement) c.push(`${p.displacement} cc`);
  if (p.fuel) c.push(FUEL_LABEL[p.fuel]);
  if (p.transmission) c.push(TRANS_LABEL[p.transmission]);
  if (p.drive) c.push(DRIVE_LABEL[p.drive]);
  if (p.condition !== "USED") c.push(COND_LABEL[p.condition]);
  return c;
}

export function toSummary(p: Row): ProductSummary {
  return {
    id: p.id, slug: p.slug, title: p.title, sku: p.sku, stock: p.stock, status: p.status as "PUBLISHED" | "SOLD",
    price: p.showPrice ? p.price : null, currency: p.currency, make: p.make?.name ?? null, category: p.category.name,
    chips: chipsFor(p), excerpt: strip(p.description).slice(0, 180),
    images: p.images.map((i) => ({ url: i.url, thumbUrl: i.thumbUrl, blur: i.blur, alt: i.alt ?? p.title })),
  };
}

export async function queryCatalog(f: Filters) {
  const where = await buildWhere(f);
  const [rows, total] = await Promise.all([
    db.product.findMany({ where, orderBy: orderBy(f.sort), skip: (f.page - 1) * PAGE_SIZE, take: PAGE_SIZE, select: summarySelect }),
    db.product.count({ where }),
  ]);
  return { products: rows.map(toSummary), total, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

/** Sidebar options. Counts ignore the make filter so the list does not collapse to one entry. */
export async function getFacets(f: Filters) {
  const base = await buildWhere({ ...f, make: undefined, model: undefined }, { make: true });
  const [categories, makeCounts, makes] = await Promise.all([
    db.category.findMany({ orderBy: { order: "asc" }, select: { id: true, name: true, slug: true, _count: { select: { products: { where: { status: { in: [...VISIBLE] } } } } } } }),
    db.product.groupBy({ by: ["makeId"], where: base, _count: { _all: true } }),
    db.make.findMany({ orderBy: { order: "asc" }, select: { id: true, name: true, slug: true, models: { orderBy: { name: "asc" }, select: { name: true, slug: true } } } }),
  ]);
  const counts = new Map(makeCounts.map((m) => [m.makeId, m._count._all]));
  return {
    categories: categories.map((c) => ({ name: c.name, slug: c.slug, count: c._count.products })),
    makes: makes.map((m) => ({ name: m.name, slug: m.slug, count: counts.get(m.id) ?? 0, models: m.models })).filter((m) => m.count > 0 || m.slug === f.make),
  };
}
