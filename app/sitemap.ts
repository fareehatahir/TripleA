import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { VISIBLE } from "@/lib/catalog";
import { site } from "@/lib/site";

export const dynamic = "force-dynamic";

// Next's built-in sitemap route (the same output next-sitemap would produce, always in sync with the database).
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, categories, makes, posts] = await Promise.all([
    db.product.findMany({ where: { status: { in: [...VISIBLE] } }, select: { slug: true, updatedAt: true } }),
    db.category.findMany({ select: { slug: true } }),
    db.make.findMany({ select: { slug: true } }),
    db.blogPost.findMany({ where: { status: "PUBLISHED", publishedAt: { lte: new Date() } }, select: { slug: true, updatedAt: true } }),
  ]);
  const u = (p: string) => `${site.url}${p}`;
  const fixed = ["", "/catalog", "/shipping", "/services", "/loading", "/about", "/blog", "/contact", "/privacy", "/terms"].map((p) => ({ url: u(p), changeFrequency: "weekly" as const, priority: p === "" ? 1 : 0.7 }));
  return [
    ...fixed,
    ...categories.map((c) => ({ url: u(`/catalog/${c.slug}`), changeFrequency: "daily" as const, priority: 0.8 })),
    ...categories.flatMap((c) => makes.map((m) => ({ url: u(`/catalog/${c.slug}/${m.slug}`), changeFrequency: "daily" as const, priority: 0.6 }))),
    ...posts.map((p) => ({ url: u(`/blog/${p.slug}`), lastModified: p.updatedAt, changeFrequency: "monthly" as const, priority: 0.6 })),
    ...products.map((p) => ({ url: u(`/product/${p.slug}`), lastModified: p.updatedAt, changeFrequency: "weekly" as const, priority: 0.9 })),
  ];
}
