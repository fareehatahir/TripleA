"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { cleanHtml } from "@/lib/sanitize";
import { assertRole } from "@/lib/session";
import { slugify } from "@/lib/slug";
import { blogSchema } from "@/lib/validation";

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string; field?: string };
const refresh = () => (revalidatePath("/blog"), revalidatePath("/blog/[slug]", "page"), revalidatePath("/admin/blog"));

async function uniqueSlug(base: string, ignoreId?: string) {
  const root = slugify(base) || "post";
  for (let i = 1; ; i++) {
    const slug = i === 1 ? root : `${root}-${i}`;
    const hit = await db.blogPost.findUnique({ where: { slug }, select: { id: true } });
    if (!hit || hit.id === ignoreId) return slug;
  }
}

export async function saveBlogPostAction(id: string | null, input: unknown): Promise<Result<{ id: string }>> {
  const actor = await assertRole();
  const p = blogSchema.safeParse(input);
  if (!p.success) {
    const i = p.error.issues[0];
    return { ok: false, error: i.message, field: String(i.path[0] ?? "") };
  }
  const v = p.data;
  const content = cleanHtml(v.content);
  if (!content) return { ok: false, error: "Write the article body", field: "content" };
  if (v.coverUrl && !(v.coverUrl.startsWith("/uploads/") || v.coverUrl.startsWith("https://"))) return { ok: false, error: "Use an uploaded image for the cover", field: "coverUrl" };

  // Publishing without a date means "now". A future date schedules it.
  const publishedAt = v.status === "PUBLISHED" ? v.publishedAt ?? new Date() : v.publishedAt ?? null;
  const data = {
    title: v.title, slug: await uniqueSlug(v.slug || v.title, id ?? undefined), excerpt: v.excerpt ?? null, content, coverUrl: v.coverUrl ?? null,
    tags: [...new Set(v.tags.map((t) => t.toLowerCase()))], status: v.status, publishedAt, seoTitle: v.seoTitle ?? null, seoDescription: v.seoDescription ?? null,
  };
  const post = id ? await db.blogPost.update({ where: { id }, data }) : await db.blogPost.create({ data });
  const when = v.status === "PUBLISHED" && publishedAt && publishedAt > new Date() ? `scheduled for ${publishedAt.toISOString().slice(0, 16)}` : v.status.toLowerCase();
  await audit(actor, id ? "update" : "create", "BlogPost", post.id, `${id ? "Updated" : "Created"} blog post “${post.title}” (${when})`);
  refresh();
  return { ok: true, id: post.id };
}

export async function deleteBlogPostAction(id: string): Promise<Result> {
  const actor = await assertRole();
  const p = await db.blogPost.delete({ where: { id } });
  await audit(actor, "delete", "BlogPost", id, `Deleted blog post “${p.title}”`);
  refresh();
  return { ok: true };
}
