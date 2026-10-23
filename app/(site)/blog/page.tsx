import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { db } from "@/lib/db";
import { livePost, readingMinutes, tagsOf } from "@/lib/blog";
import { PageHero } from "@/components/layout/page-hero";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Blog: Used Car & Parts Export Guides",
  description: "Guides and news on importing used cars, engines and parts from Taiwan: shipping, engine codes, inspections and market updates.",
  alternates: { canonical: "/blog" },
};
const PAGE = 9;

export default async function BlogPage(props: { searchParams: Promise<{ tag?: string; page?: string }> }) {
  const searchParams = await props.searchParams;
  const page = Math.max(1, Number(searchParams.page) || 1);
  const everything = await db.blogPost.findMany({ where: livePost(), orderBy: { publishedAt: "desc" } });
  const tags = [...new Set(everything.flatMap((p) => tagsOf(p.tags)))].sort();
  const tag = tags.find((t) => t === searchParams.tag);
  const filtered = tag ? everything.filter((p) => tagsOf(p.tags).includes(tag)) : everything;
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const posts = filtered.slice((page - 1) * PAGE, page * PAGE);
  const href = (o: { tag?: string; page?: number }) => {
    const sp = new URLSearchParams();
    const t = "tag" in o ? o.tag : tag;
    if (t) sp.set("tag", t);
    if (o.page && o.page > 1) sp.set("page", String(o.page));
    return `/blog${sp.size ? `?${sp}` : ""}`;
  };

  return (
    <>
      <PageHero eyebrow="Blog" title="Know before you import" crumbs={[{ name: "Blog" }]} />
      <div className="container py-12 md:py-16">
        {tags.length > 0 && (
          <div className="mb-8 flex flex-wrap gap-2" aria-label="Filter by tag">
            <Link href="/blog" className={cn("rounded-full px-4 py-2 text-sm font-semibold", !tag ? "bg-charcoal text-white" : "bg-mist hover:bg-silver/50")}>All</Link>
            {tags.map((t) => <Link key={t} href={href({ tag: t })} className={cn("rounded-full px-4 py-2 text-sm font-semibold", t === tag ? "bg-charcoal text-white" : "bg-mist hover:bg-silver/50")}>{t}</Link>)}
          </div>
        )}
        {posts.length === 0 ? (
          <p className="rounded-3xl bg-mist px-6 py-16 text-center">No articles yet. Check back soon.</p>
        ) : (
          <ul className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {posts.map((p) => (
              <li key={p.id}>
                <article className="group h-full overflow-hidden rounded-2xl bg-white shadow-soft ring-1 ring-silver/40 transition duration-300 hover:-translate-y-1 hover:shadow-lift">
                  <Link href={`/blog/${p.slug}`} className="block">
                    <div className="relative aspect-[16/10] overflow-hidden bg-mist">
                      {p.coverUrl && <Image src={p.coverUrl} alt="" fill sizes="(min-width:1024px) 33vw, (min-width:768px) 50vw, 100vw" className="object-cover transition duration-500 group-hover:scale-105" />}
                    </div>
                    <div className="p-6">
                      <p className="text-xs">{p.publishedAt?.toLocaleDateString("en", { dateStyle: "medium" })} · {readingMinutes(p.content)} min read</p>
                      <h2 className="mt-2 text-xl font-bold leading-snug group-hover:text-brand">{p.title}</h2>
                      {p.excerpt && <p className="mt-2 line-clamp-3 text-sm">{p.excerpt}</p>}
                    </div>
                  </Link>
                </article>
              </li>
            ))}
          </ul>
        )}
        {pages > 1 && (
          <nav aria-label="Pagination" className="mt-10 flex justify-center gap-2">
            {page > 1 && <Button asChild variant="ghost" size="sm"><Link href={href({ page: page - 1 })}>Previous</Link></Button>}
            <span className="grid place-items-center px-3 text-sm">Page {page} of {pages}</span>
            {page < pages && <Button asChild variant="ghost" size="sm"><Link href={href({ page: page + 1 })}>Next</Link></Button>}
          </nav>
        )}
      </div>
    </>
  );
}
