import { db } from "@/lib/db";

export function slugify(input: string) {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Returns slug, or slug-2, slug-3… until unused by another product. */
export async function uniqueProductSlug(base: string, ignoreId?: string) {
  const root = slugify(base) || "product";
  let slug = root;
  for (let i = 2; ; i++) {
    const hit = await db.product.findUnique({ where: { slug }, select: { id: true } });
    if (!hit || hit.id === ignoreId) return slug;
    slug = `${root}-${i}`;
  }
}
