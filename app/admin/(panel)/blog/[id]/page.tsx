import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { tagsOf } from "@/lib/blog";
import { PostForm } from "../post-form";

export const metadata = { title: "Edit post" };

// datetime-local wants local wall-clock time without a zone
const local = (d: Date | null) => (d ? new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "");

export default async function EditPost(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const p = await db.blogPost.findUnique({ where: { id: params.id } });
  if (!p) notFound();
  return (
    <PostForm id={p.id} initial={{ title: p.title, slug: p.slug, excerpt: p.excerpt ?? "", content: p.content, coverUrl: p.coverUrl ?? "", tags: tagsOf(p.tags), status: p.status === "PUBLISHED" ? "PUBLISHED" : "DRAFT", publishedAt: local(p.publishedAt), seoTitle: p.seoTitle ?? "", seoDescription: p.seoDescription ?? "" }} />
  );
}
