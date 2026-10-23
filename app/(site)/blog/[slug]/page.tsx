import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { livePost, readingMinutes, tagsOf } from "@/lib/blog";
import { stripHtml } from "@/lib/sanitize";
import { site } from "@/lib/site";
import { RichHtml } from "@/components/content/rich-html";
import { ShareButtons } from "@/components/content/share-buttons";
import { PageHero } from "@/components/layout/page-hero";
import { CtaBand } from "@/components/home/sections";

export const dynamic = "force-dynamic";
const load = (slug: string) => db.blogPost.findFirst({ where: { slug, ...livePost() } });

export async function generateMetadata(props: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const params = await props.params;
  const p = await load(params.slug);
  if (!p) return { title: "Article not found" };
  const desc = p.seoDescription ?? p.excerpt ?? stripHtml(p.content).slice(0, 160);
  return {
    title: p.seoTitle ?? p.title, description: desc, alternates: { canonical: `/blog/${p.slug}` },
    openGraph: { type: "article", title: p.seoTitle ?? p.title, description: desc, publishedTime: p.publishedAt?.toISOString(), images: p.coverUrl ? [{ url: p.coverUrl }] : undefined },
  };
}

export default async function PostPage(props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  const p = await load(params.slug);
  if (!p) notFound();
  const related = await db.blogPost.findMany({ where: { ...livePost(), id: { not: p.id } }, orderBy: { publishedAt: "desc" }, take: 3 });
  const url = `${site.url}/blog/${p.slug}`;
  const ld = {
    "@context": "https://schema.org", "@type": "Article", headline: p.title, datePublished: p.publishedAt?.toISOString(), dateModified: p.updatedAt.toISOString(),
    image: p.coverUrl ? [p.coverUrl.startsWith("http") ? p.coverUrl : `${site.url}${p.coverUrl}`] : undefined,
    author: { "@type": "Organization", name: site.name }, publisher: { "@type": "Organization", name: site.name, logo: { "@type": "ImageObject", url: `${site.url}/brand/logo.png` } }, mainEntityOfPage: url,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <PageHero title={p.title} crumbs={[{ name: "Blog", href: "/blog" }, { name: p.title }]} />
      <article className="container max-w-3xl py-10 md:py-14">
        <p className="text-sm">{p.publishedAt?.toLocaleDateString("en", { dateStyle: "long" })} · {readingMinutes(p.content)} min read</p>
        {p.coverUrl && <div className="relative mt-6 aspect-[16/9] overflow-hidden rounded-3xl bg-mist"><Image src={p.coverUrl} alt="" fill priority sizes="(min-width:768px) 768px, 100vw" className="object-cover" /></div>}
        <RichHtml html={p.content} className="mt-8 text-lg text-graphite" />
        {tagsOf(p.tags).length > 0 && <ul className="mt-8 flex flex-wrap gap-2">{tagsOf(p.tags).map((t) => <li key={t}><Link href={`/blog?tag=${encodeURIComponent(t)}`} className="rounded-full bg-mist px-3 py-1 text-sm font-medium hover:bg-silver/50">#{t}</Link></li>)}</ul>}
        <div className="mt-8 border-t border-silver/50 pt-6"><ShareButtons url={url} title={p.title} /></div>
      </article>
      {related.length > 0 && (
        <section className="container pb-16"><h2 className="text-2xl font-bold">More articles</h2>
          <ul className="mt-6 grid gap-5 md:grid-cols-3">{related.map((r) => <li key={r.id}><Link href={`/blog/${r.slug}`} className="block rounded-2xl bg-white p-6 shadow-soft ring-1 ring-silver/40 transition hover:-translate-y-1 hover:shadow-lift"><p className="text-xs">{r.publishedAt?.toLocaleDateString("en", { dateStyle: "medium" })}</p><h3 className="mt-2 font-bold hover:text-brand">{r.title}</h3></Link></li>)}</ul>
        </section>
      )}
      <CtaBand title="Looking for stock?" text="Browse the catalog or send us your list." />
    </>
  );
}
