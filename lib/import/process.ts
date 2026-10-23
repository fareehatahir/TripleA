import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { cleanHtml } from "@/lib/sanitize";
import { slugify, uniqueProductSlug } from "@/lib/slug";
import { productSchema } from "@/lib/validation";
import { IMPORT_FIELDS, norm, type ImportFieldKey, type ImportOptions, type Mapping, type RowResult } from "./columns";

export type RawRow = Record<string, string>;

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const cell = (row: RawRow, mapping: Mapping, key: ImportFieldKey) => {
  const col = mapping[key];
  return col ? String(row[col] ?? "").trim() : "";
};
const num = (v: string) => {
  const t = v.replace(/[^\d.,-]/g, "").replace(/,/g, "");
  return t && !Number.isNaN(Number(t)) ? t : "";
};
const yes = (v: string) => /^(y|yes|true|1|x|✓|show|on)$/i.test(v.trim());
const pick = <T extends string>(v: string, table: [RegExp, T][]) => table.find(([re]) => re.test(v.trim()))?.[1];

const FUEL: [RegExp, "PETROL" | "DIESEL" | "HYBRID" | "ELECTRIC"][] = [[/^(petrol|gasoline|gas|benzin|pet)$/i, "PETROL"], [/^diesel$/i, "DIESEL"], [/hybrid|phev/i, "HYBRID"], [/^(electric|ev|bev)$/i, "ELECTRIC"]];
const TRANS: [RegExp, "AT" | "MT" | "CVT"][] = [[/^(at|auto|automatic|a\/t)$/i, "AT"], [/^(mt|manual|m\/t|stick)$/i, "MT"], [/^cvt$/i, "CVT"]];
const DRIVE: [RegExp, "TWO_WD" | "FOUR_WD"][] = [[/^(2wd|2 wd|fwd|rwd|2x4|4x2|two)/i, "TWO_WD"], [/^(4wd|4 wd|awd|4x4|four)/i, "FOUR_WD"]];
const COND: [RegExp, "USED" | "REBUILT" | "NEW"][] = [[/^(used|second ?hand|pre-?owned)$/i, "USED"], [/rebuil|recondition|refurb/i, "REBUILT"], [/^(new|brand new)$/i, "NEW"]];
const STATUS: [RegExp, "DRAFT" | "PUBLISHED" | "SOLD" | "ARCHIVED"][] = [[/^(draft|hidden|unpublished|no)$/i, "DRAFT"], [/^(published?|live|visible|yes|active)$/i, "PUBLISHED"], [/^sold/i, "SOLD"], [/^archiv/i, "ARCHIVED"]];

/** "Compatible with: Camry 2012-2017 | Weight: 185 kg" → [{key, value}] */
export function parseSpecs(v: string) {
  return v.split(/\s*(?:\||;|\n)\s*/).map((p) => {
    const i = p.indexOf(":");
    return i > 0 ? { key: p.slice(0, i).trim(), value: p.slice(i + 1).trim() } : null;
  }).filter((x): x is { key: string; value: string } => !!x && !!x.key && !!x.value);
}

export function toHtml(v: string) {
  if (!v) return undefined;
  if (/<\/?(p|br|strong|em|u|s|ul|ol|li|h[2-4]|blockquote|a)\b[^>]*>/i.test(v)) return v; // only tags the site allows; anything else is plain text
  return v.split(/\n{2,}/).map((p) => `<p>${esc(p).replace(/\n/g, "<br>")}</p>`).join("");
}

type Ctx = {
  categories: { id: string; name: string; slug: string }[];
  makes: { id: string; name: string; slug: string; models: { id: string; name: string }[] }[];
  skus: Map<string, string>; // lower sku → product id
};
export async function loadCtx(): Promise<Ctx> {
  const [categories, makes, products] = await Promise.all([
    db.category.findMany({ select: { id: true, name: true, slug: true } }),
    db.make.findMany({ select: { id: true, name: true, slug: true, models: { select: { id: true, name: true } } } }),
    db.product.findMany({ select: { id: true, sku: true } }),
  ]);
  return { categories, makes, skus: new Map(products.map((p) => [p.sku.toLowerCase(), p.id])) };
}

const singular = (s: string) => norm(s).replace(/s$/, "");
const findCategory = (ctx: Ctx, v: string) => ctx.categories.find((c) => norm(c.name) === norm(v) || c.slug === slugify(v) || singular(c.name) === singular(v));
/** "Toyota" matches "Toyota & Lexus" and "Lexus" matches it too. */
function findMake(ctx: Ctx, v: string) {
  const n = norm(v);
  return ctx.makes.find((m) => norm(m.name) === n || m.slug === slugify(v)) ?? ctx.makes.find((m) => m.name.toLowerCase().split(/\s*(?:&|,|\/| and )\s*/).some((p) => norm(p) === n));
}

export type Planned = {
  result: RowResult;
  action: "create" | "update";
  sku: string;
  existingId?: string;
  categoryId: string;
  make?: { id?: string; create?: string };
  model?: { id?: string; create?: string };
  data: Record<string, unknown>; // validated product fields (create) or a patch of mapped, non-empty fields (update)
  specs?: { key: string; value: string }[];
};

/** Validates every row against the mapping and the database. Pure planning: writes nothing. */
export async function planImport(rows: RawRow[], mapping: Mapping, opts: ImportOptions) {
  const ctx = await loadCtx();
  const seen = new Map<string, number>();
  const planned: Planned[] = [];
  const results: RowResult[] = [];

  rows.forEach((row, index) => {
    const g = (k: ImportFieldKey) => cell(row, mapping, k);
    const sku = g("sku"), title = g("title");
    const r: RowResult = { index: index + 1, sku, title, action: "error", errors: [], notes: [] };
    results.push(r);
    const bad = (m: string) => r.errors.push(m);

    if (!sku) return bad("SKU is empty");
    const lower = sku.toLowerCase();
    if (seen.has(lower)) return bad(`Duplicate SKU: also on row ${seen.get(lower)}`);
    seen.set(lower, index + 1);

    const existingId = ctx.skus.get(lower);
    if (existingId && !opts.updateExisting) { r.action = "skip"; r.notes.push("SKU already exists (skipped; tick “update existing” to change it)"); return; }

    // taxonomy
    const catRaw = g("category");
    let categoryId = "";
    if (catRaw) {
      const c = findCategory(ctx, catRaw);
      if (c) categoryId = c.id;
      else bad(`Unknown category “${catRaw}”. Use one of: ${ctx.categories.map((x) => x.name).join(", ")}`);
    } else if (!existingId) bad("Category is empty");

    let make: Planned["make"], model: Planned["model"];
    const makeRaw = g("make"), modelRaw = g("model");
    if (makeRaw) {
      const m = findMake(ctx, makeRaw);
      if (m) {
        make = { id: m.id };
        if (modelRaw) {
          const mo = m.models.find((x) => norm(x.name) === norm(modelRaw));
          if (mo) model = { id: mo.id };
          else if (opts.createMissingTaxonomy) { model = { create: modelRaw }; r.notes.push(`New model “${modelRaw}” will be added to ${m.name}`); }
          else r.notes.push(`Model “${modelRaw}” not found for ${m.name} (left blank)`);
        }
      } else if (opts.createMissingTaxonomy) {
        make = { create: makeRaw };
        if (modelRaw) model = { create: modelRaw };
        r.notes.push(`New make “${makeRaw}” will be added`);
      } else r.notes.push(`Make “${makeRaw}” not found (left blank)`);
    } else if (modelRaw) r.notes.push("Model ignored because Make is empty");

    // scalar fields as the product form would receive them
    const status = pick(g("status"), STATUS);
    if (g("status") && !status) r.notes.push(`Status “${g("status")}” not recognised, using ${opts.defaultStatus.toLowerCase()}`);
    const fields: Record<string, unknown> = {
      sku, title, categoryId: categoryId || "x",
      yearFrom: num(g("yearFrom")), yearTo: num(g("yearTo")), engineCode: g("engineCode"), displacement: num(g("displacement")),
      fuel: pick(g("fuel"), FUEL) ?? "", transmission: pick(g("transmission"), TRANS) ?? "", drive: pick(g("drive"), DRIVE) ?? "",
      condition: pick(g("condition"), COND) ?? "USED", weightKg: num(g("weightKg")), mileageKm: num(g("mileageKm")),
      stock: num(g("stock")) || (existingId ? "" : "1"), price: num(g("price")), showPrice: yes(g("showPrice")),
      currency: g("currency").toUpperCase(), featured: yes(g("featured")), status: status ?? opts.defaultStatus,
      videoUrl: g("videoUrl"), seoTitle: g("seoTitle"), seoDescription: g("seoDescription"),
      description: toHtml(g("description")) ?? "", included: g("included"), specs: [], images: [],
    };
    for (const [k, label] of [["fuel", "Fuel"], ["transmission", "Transmission"], ["drive", "Drive"]] as const)
      if (g(k) && !fields[k]) r.notes.push(`${label} “${g(k)}” not recognised (left blank)`);

    const parsed = productSchema.safeParse(fields);
    if (!parsed.success) for (const i of parsed.error.issues) bad(`${i.path[0] ? String(i.path[0]) + ": " : ""}${i.message}`);
    if (r.errors.length || !parsed.success) return;

    const specs = parseSpecs(g("specs"));
    const v = parsed.data;
    let data: Record<string, unknown>;
    if (existingId) {
      // Update only columns that are mapped AND filled in, so blank cells never wipe good data.
      const patch: Record<string, unknown> = {};
      const set = (key: ImportFieldKey, field: string, value: unknown) => { if (mapping[key] && g(key) !== "") patch[field] = value ?? null; };
      set("title", "title", v.title); set("yearFrom", "yearFrom", v.yearFrom); set("yearTo", "yearTo", v.yearTo); set("engineCode", "engineCode", v.engineCode);
      set("displacement", "displacement", v.displacement); set("fuel", "fuel", v.fuel); set("transmission", "transmission", v.transmission); set("drive", "drive", v.drive);
      set("condition", "condition", v.condition); set("weightKg", "weightKg", v.weightKg); set("mileageKm", "mileageKm", v.mileageKm); set("stock", "stock", v.stock);
      set("price", "price", v.price); set("showPrice", "showPrice", v.showPrice); set("currency", "currency", v.currency); set("featured", "featured", v.featured);
      set("status", "status", status ?? undefined); set("videoUrl", "videoUrl", v.videoUrl); set("seoTitle", "seoTitle", v.seoTitle); set("seoDescription", "seoDescription", v.seoDescription);
      set("included", "included", v.included);
      if (mapping.description && g("description")) patch.description = cleanHtml(v.description);
      if (categoryId) patch.categoryId = categoryId;
      data = patch;
      r.action = "update";
      r.notes.push(`Updates ${Object.keys(patch).length} field${Object.keys(patch).length === 1 ? "" : "s"}`);
    } else {
      data = {
        sku: v.sku, title: v.title, categoryId, yearFrom: v.yearFrom ?? null, yearTo: v.yearTo ?? null, engineCode: v.engineCode ?? null, displacement: v.displacement ?? null,
        fuel: v.fuel ?? null, transmission: v.transmission ?? null, drive: v.drive ?? null, condition: v.condition, weightKg: v.weightKg ?? null, mileageKm: v.mileageKm ?? null,
        stock: v.stock, price: v.price ?? null, showPrice: v.showPrice, ...(v.currency ? { currency: v.currency } : {}), featured: v.featured, status: v.status,
        videoUrl: v.videoUrl ?? null, seoTitle: v.seoTitle ?? null, seoDescription: v.seoDescription ?? null, description: cleanHtml(v.description), included: v.included ?? null,
      };
      r.action = "create";
    }
    planned.push({ result: r, action: r.action, sku, existingId, categoryId, make, model, data, specs: specs.length ? specs : undefined });
  });

  return { results, planned };
}

const counts = (results: RowResult[]) => ({
  create: results.filter((r) => r.action === "create").length, update: results.filter((r) => r.action === "update").length,
  skip: results.filter((r) => r.action === "skip").length, error: results.filter((r) => r.action === "error").length,
});
export const summarize = counts;

/** Applies a plan. Taxonomy is created on demand and cached; rows are written in small transactions. */
export async function applyImport(planned: Planned[], defaultCurrency: string) {
  const makeCache = new Map<string, string>(), modelCache = new Map<string, string>();
  const done: { sku: string; ok: boolean; error?: string }[] = [];

  const makeId = async (m?: Planned["make"]) => {
    if (!m) return null;
    if (m.id) return m.id;
    const key = norm(m.create!);
    if (makeCache.has(key)) return makeCache.get(key)!;
    const slug = slugify(m.create!);
    const row = (await db.make.findUnique({ where: { slug } })) ?? (await db.make.create({ data: { name: m.create!.slice(0, 60), slug, order: await db.make.count() } }));
    makeCache.set(key, row.id);
    return row.id;
  };
  const modelId = async (mk: string | null, m?: Planned["model"]) => {
    if (!m || !mk) return null;
    if (m.id) return m.id;
    const key = `${mk}:${norm(m.create!)}`;
    if (modelCache.has(key)) return modelCache.get(key)!;
    const slug = slugify(m.create!);
    const row = (await db.carModel.findUnique({ where: { makeId_slug: { makeId: mk, slug } } })) ?? (await db.carModel.create({ data: { makeId: mk, name: m.create!.slice(0, 60), slug } }));
    modelCache.set(key, row.id);
    return row.id;
  };

  for (const p of planned) {
    try {
      const mk = await makeId(p.make);
      const mo = await modelId(mk ?? p.make?.id ?? null, p.model);
      if (p.action === "create") {
        await db.product.create({
          data: {
            ...(p.data as Prisma.ProductUncheckedCreateInput),
            slug: await uniqueProductSlug(String(p.data.title)),
            makeId: mk, modelId: mo,
            ...(p.data.currency ? {} : { currency: defaultCurrency }),
            specs: p.specs ? { create: p.specs.map((s, order) => ({ ...s, order })) } : undefined,
          },
        });
      } else {
        await db.$transaction(async (tx) => {
          await tx.product.update({ where: { id: p.existingId! }, data: { ...(p.data as Prisma.ProductUncheckedUpdateInput), ...(mk ? { makeId: mk, modelId: mo } : {}) } });
          if (p.specs) {
            await tx.productSpec.deleteMany({ where: { productId: p.existingId! } });
            await tx.productSpec.createMany({ data: p.specs.map((s, order) => ({ ...s, order, productId: p.existingId! })) });
          }
        });
      }
      done.push({ sku: p.sku, ok: true });
    } catch (e) {
      done.push({ sku: p.sku, ok: false, error: e instanceof Error ? e.message.split("\n").pop()?.slice(0, 160) : "Database error" });
    }
  }
  return done;
}

export const exportColumns = IMPORT_FIELDS.map((f) => ({ key: f.key, header: f.header }));
