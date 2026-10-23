"use server";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { cleanHtml } from "@/lib/sanitize";
import { getAppSettingFresh } from "@/lib/app-settings";
import { assertRole } from "@/lib/session";
import { uniqueProductSlug } from "@/lib/slug";
import { productSchema } from "@/lib/validation";

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string; field?: string };

function refresh() {
  revalidatePath("/", "layout"); // public home, catalog and product pages
  revalidatePath("/admin/products");
  revalidatePath("/admin");
}

export async function saveProductAction(id: string | null, input: unknown): Promise<Result<{ id: string }>> {
  const actor = await assertRole();
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) {
    const i = parsed.error.issues[0];
    return { ok: false, error: i.message, field: String(i.path[0] ?? "") };
  }
  const v = parsed.data;

  // Referential checks (the client could send anything)
  const [cat, make, model] = await Promise.all([
    db.category.findUnique({ where: { id: v.categoryId }, select: { id: true } }),
    v.makeId ? db.make.findUnique({ where: { id: v.makeId }, select: { id: true } }) : null,
    v.modelId ? db.carModel.findUnique({ where: { id: v.modelId }, select: { id: true, makeId: true } }) : null,
  ]);
  if (!cat) return { ok: false, error: "Category not found", field: "categoryId" };
  if (v.makeId && !make) return { ok: false, error: "Make not found", field: "makeId" };
  if (v.modelId && (!model || model.makeId !== v.makeId)) return { ok: false, error: "That model does not belong to the chosen make", field: "modelId" };

  const dupe = await db.product.findFirst({ where: { sku: v.sku, ...(id ? { id: { not: id } } : {}) }, select: { id: true } });
  if (dupe) return { ok: false, error: "Another product already uses this SKU", field: "sku" };

  // Only accept media that really exists
  const mediaIds = v.images.map((i) => i.mediaId);
  const found = await db.mediaAsset.findMany({ where: { id: { in: mediaIds } }, select: { id: true, url: true, thumbUrl: true, blur: true } });
  const byId = new Map(found.map((m) => [m.id, m]));
  if (mediaIds.some((m) => !byId.has(m))) return { ok: false, error: "One of the images no longer exists. Remove it and re-upload.", field: "images" };

  const slug = await uniqueProductSlug(v.slug || v.title, id ?? undefined);
  const data = {
    sku: v.sku,
    slug,
    title: v.title,
    description: cleanHtml(v.description),
    included: v.included ?? null,
    categoryId: v.categoryId,
    makeId: v.makeId ?? null,
    modelId: v.modelId ?? null,
    yearFrom: v.yearFrom ?? null,
    yearTo: v.yearTo ?? null,
    engineCode: v.engineCode ?? null,
    displacement: v.displacement ?? null,
    fuel: v.fuel ?? null,
    transmission: v.transmission ?? null,
    drive: v.drive ?? null,
    condition: v.condition,
    weightKg: v.weightKg ?? null,
    mileageKm: v.mileageKm ?? null,
    stock: v.stock,
    price: v.price ?? null,
    showPrice: v.showPrice,
    ...(v.currency ? { currency: v.currency } : id ? {} : { currency: (await getAppSettingFresh("general")).defaultCurrency }),
    featured: v.featured,
    status: v.status,
    videoUrl: v.videoUrl ?? null,
    seoTitle: v.seoTitle ?? null,
    seoDescription: v.seoDescription ?? null,
  };
  const specs = v.specs.filter((s) => s.key && s.value).map((s, order) => ({ ...s, order }));
  const images = v.images.map((img, order) => {
    const m = byId.get(img.mediaId)!;
    return { mediaId: m.id, url: m.url, thumbUrl: m.thumbUrl, blur: m.blur, alt: img.alt ?? null, order, isCover: order === 0 };
  });

  try {
    const saved = await db.$transaction(async (tx) => {
      if (id) {
        await tx.productImage.deleteMany({ where: { productId: id } });
        await tx.productSpec.deleteMany({ where: { productId: id } });
        return tx.product.update({ where: { id }, data: { ...data, images: { create: images }, specs: { create: specs } } });
      }
      return tx.product.create({ data: { ...data, images: { create: images }, specs: { create: specs } } });
    });
    await audit(actor, id ? "update" : "create", "Product", saved.id, `${id ? "Updated" : "Created"} product ${saved.sku} “${saved.title}” (${saved.status})`);
    refresh();
    return { ok: true, id: saved.id };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return { ok: false, error: "SKU or slug already in use", field: "sku" };
    throw e;
  }
}

export async function duplicateProductAction(id: string): Promise<Result<{ id: string }>> {
  const actor = await assertRole();
  const p = await db.product.findUnique({ where: { id }, include: { images: true, specs: true } });
  if (!p) return { ok: false, error: "Product not found" };
  let sku = `${p.sku}-COPY`;
  for (let i = 2; await db.product.findUnique({ where: { sku }, select: { id: true } }); i++) sku = `${p.sku}-COPY${i}`;
  const title = `${p.title} (copy)`;
  const { id: _id, createdAt: _c, updatedAt: _u, images, specs, sku: _s, slug: _sl, title: _t, status: _st, featured: _f, ...fields } = p;
  const copy = await db.product.create({
    data: {
      ...fields,
      sku,
      title,
      slug: await uniqueProductSlug(title),
      status: "DRAFT",
      featured: false,
      images: { create: images.map(({ id: _i, productId: _p, ...rest }) => rest) },
      specs: { create: specs.map(({ id: _i, productId: _p, ...rest }) => rest) },
    },
  });
  await audit(actor, "create", "Product", copy.id, `Duplicated ${p.sku} as ${sku}`);
  refresh();
  return { ok: true, id: copy.id };
}

export async function bulkProductsAction(ids: string[], action: "publish" | "unpublish" | "archive" | "delete"): Promise<Result<{ count: number }>> {
  const actor = await assertRole();
  if (!ids.length || ids.length > 500) return { ok: false, error: "Select between 1 and 500 products" };
  const where = { id: { in: ids } };
  let count = 0;
  if (action === "delete") {
    // Inquiry history keeps title/SKU snapshots, so deleting the product is safe (productId becomes null).
    count = (await db.product.deleteMany({ where })).count;
  } else {
    const status = action === "publish" ? "PUBLISHED" : action === "unpublish" ? "DRAFT" : "ARCHIVED";
    count = (await db.product.updateMany({ where, data: { status } })).count;
  }
  await audit(actor, action === "delete" ? "delete" : "update", "Product", null, `Bulk ${action}: ${count} product${count === 1 ? "" : "s"}`, { ids });
  refresh();
  return { ok: true, count };
}
