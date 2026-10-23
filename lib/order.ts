import { db } from "@/lib/db";

type Model = "faq" | "testimonial" | "shippingRate";

/** Moves a row up (-1) or down (+1) by rewriting a clean 0..n order for the whole table. */
export async function moveRow(model: Model, id: string, dir: -1 | 1) {
  const rows = await (db[model] as unknown as { findMany: (a: object) => Promise<{ id: string }[]> }).findMany({ orderBy: [{ order: "asc" }, { id: "asc" }], select: { id: true } });
  const ids = rows.map((r) => r.id);
  const i = ids.indexOf(id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= ids.length) return;
  [ids[i], ids[j]] = [ids[j], ids[i]];
  await db.$transaction(ids.map((rid, order) => (db[model] as unknown as { update: (a: object) => never }).update({ where: { id: rid }, data: { order } })));
}
