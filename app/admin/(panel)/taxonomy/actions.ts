"use server";
import { revalidatePath, revalidateTag } from "next/cache";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { assertRole } from "@/lib/session";
import { slugify } from "@/lib/slug";
import { categorySchema, makeSchema, modelSchema } from "@/lib/validation";

type Result = { ok: true } | { ok: false; error: string };
type Kind = "category" | "make";

const safeImg = (u?: string | null) => (u && (u.startsWith("/uploads/") || u.startsWith("https://")) ? u : null);
const done = (): Result => (revalidateTag("nav"), revalidatePath("/", "layout"), { ok: true });
const fail = (error: string): Result => ({ ok: false, error });

async function nextOrder(kind: Kind) {
  const last = kind === "category" ? await db.category.findFirst({ orderBy: { order: "desc" } }) : await db.make.findFirst({ orderBy: { order: "desc" } });
  return (last?.order ?? -1) + 1;
}

export async function saveCategoryAction(id: string | null, input: unknown): Promise<Result> {
  const actor = await assertRole();
  const p = categorySchema.safeParse(input);
  if (!p.success) return fail(p.error.issues[0].message);
  const slug = slugify(p.data.slug || p.data.name);
  if (!slug) return fail("Enter a valid name");
  const clash = await db.category.findFirst({ where: { slug, ...(id ? { id: { not: id } } : {}) } });
  if (clash) return fail("A category with that URL name already exists");
  const data = { name: p.data.name, slug, image: safeImg(p.data.image) };
  const c = id ? await db.category.update({ where: { id }, data }) : await db.category.create({ data: { ...data, order: await nextOrder("category") } });
  await audit(actor, id ? "update" : "create", "Category", c.id, `${id ? "Updated" : "Created"} category ${c.name}`);
  return done();
}

export async function saveMakeAction(id: string | null, input: unknown): Promise<Result> {
  const actor = await assertRole();
  const p = makeSchema.safeParse(input);
  if (!p.success) return fail(p.error.issues[0].message);
  const slug = slugify(p.data.slug || p.data.name);
  if (!slug) return fail("Enter a valid name");
  const clash = await db.make.findFirst({ where: { slug, ...(id ? { id: { not: id } } : {}) } });
  if (clash) return fail("A make with that URL name already exists");
  const data = { name: p.data.name, slug, logo: safeImg(p.data.logo) };
  const m = id ? await db.make.update({ where: { id }, data }) : await db.make.create({ data: { ...data, order: await nextOrder("make") } });
  await audit(actor, id ? "update" : "create", "Make", m.id, `${id ? "Updated" : "Created"} make ${m.name}`);
  return done();
}

export async function saveModelAction(id: string | null, input: unknown): Promise<Result> {
  const actor = await assertRole();
  const p = modelSchema.safeParse(input);
  if (!p.success) return fail(p.error.issues[0].message);
  const slug = slugify(p.data.slug || p.data.name);
  if (!slug) return fail("Enter a valid name");
  const clash = await db.carModel.findFirst({ where: { makeId: p.data.makeId, slug, ...(id ? { id: { not: id } } : {}) } });
  if (clash) return fail("That make already has a model with this name");
  const m = id
    ? await db.carModel.update({ where: { id }, data: { name: p.data.name, slug } })
    : await db.carModel.create({ data: { makeId: p.data.makeId, name: p.data.name, slug, order: await db.carModel.count({ where: { makeId: p.data.makeId } }) } });
  await audit(actor, id ? "update" : "create", "Model", m.id, `${id ? "Updated" : "Created"} model ${m.name}`);
  return done();
}

export async function deleteTaxonomyAction(kind: "category" | "make" | "model", id: string): Promise<Result> {
  const actor = await assertRole();
  if (kind === "category") {
    const n = await db.product.count({ where: { categoryId: id } });
    if (n) return fail(`${n} product${n === 1 ? " uses" : "s use"} this category. Move them first.`);
    const c = await db.category.delete({ where: { id } });
    await audit(actor, "delete", "Category", id, `Deleted category ${c.name}`);
  } else if (kind === "make") {
    const n = await db.product.count({ where: { makeId: id } });
    if (n) return fail(`${n} product${n === 1 ? " uses" : "s use"} this make. Move them first.`);
    const m = await db.make.delete({ where: { id } });
    await audit(actor, "delete", "Make", id, `Deleted make ${m.name}`);
  } else {
    const n = await db.product.count({ where: { modelId: id } });
    if (n) return fail(`${n} product${n === 1 ? " uses" : "s use"} this model. Move them first.`);
    const m = await db.carModel.delete({ where: { id } });
    await audit(actor, "delete", "Model", id, `Deleted model ${m.name}`);
  }
  return done();
}

/** Swap order with the neighbour above (-1) or below (+1). */
export async function moveTaxonomyAction(kind: Kind, id: string, dir: -1 | 1): Promise<Result> {
  await assertRole();
  const rows = (kind === "category" ? await db.category.findMany({ orderBy: { order: "asc" } }) : await db.make.findMany({ orderBy: { order: "asc" } })).map((r, i) => ({ id: r.id, i }));
  const idx = rows.findIndex((r) => r.id === id);
  const swap = rows[idx + dir];
  if (idx < 0 || !swap) return { ok: true };
  const reordered = rows.map((r) => r.id);
  [reordered[idx], reordered[idx + dir]] = [reordered[idx + dir], reordered[idx]];
  await db.$transaction(
    reordered.map((rid, order) => (kind === "category" ? db.category.update({ where: { id: rid }, data: { order } }) : db.make.update({ where: { id: rid }, data: { order } })))
  );
  return done();
}
