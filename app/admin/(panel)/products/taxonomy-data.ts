import { db } from "@/lib/db";

export async function loadTaxonomy() {
  const [categories, makes] = await Promise.all([
    db.category.findMany({ orderBy: { order: "asc" }, select: { id: true, name: true } }),
    db.make.findMany({ orderBy: { order: "asc" }, select: { id: true, name: true, models: { orderBy: { name: "asc" }, select: { id: true, name: true } } } }),
  ]);
  return { categories, makes };
}
