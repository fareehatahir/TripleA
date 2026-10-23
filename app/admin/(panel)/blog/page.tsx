/* eslint-disable @next/next/no-img-element -- admin thumbnails are small local files */
import Link from "next/link";
import { Newspaper, Plus } from "lucide-react";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Badge, Card, EmptyState, PageHeader } from "@/components/admin/ui";
import { DeletePostButton } from "./delete-post";

export const metadata = { title: "Blog" };

export default async function BlogAdminPage() {
  const posts = await db.blogPost.findMany({ orderBy: { updatedAt: "desc" } });
  const now = new Date();
  const state = (p: (typeof posts)[number]) => (p.status !== "PUBLISHED" ? { t: "Draft", tone: "gray" as const } : p.publishedAt && p.publishedAt > now ? { t: `Scheduled ${p.publishedAt.toLocaleDateString("en", { dateStyle: "medium" })}`, tone: "amber" as const } : { t: "Published", tone: "green" as const });
  return (
    <>
      <PageHeader title="Blog" description="Articles that help buyers and bring visitors from Google." actions={<Button asChild><Link href="/admin/blog/new"><Plus className="h-4 w-4" /> New post</Link></Button>} />
      <Card>
        {posts.length === 0 ? <EmptyState icon={Newspaper} title="No posts yet" text="Write your first guide, for example “How to import a used engine from Taiwan”." action={<Button asChild><Link href="/admin/blog/new">Write a post</Link></Button>} /> : (
          <ul className="divide-y divide-silver/40 dark:divide-white/10">
            {posts.map((p) => { const s = state(p); return (
              <li key={p.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
                {p.coverUrl ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={p.coverUrl} alt="" className="h-14 w-20 rounded-lg object-cover" /> : <span className="grid h-14 w-20 place-items-center rounded-lg bg-mist dark:bg-white/10"><Newspaper className="h-5 w-5" /></span>}
                <div className="min-w-0 flex-1"><Link href={`/admin/blog/${p.id}`} className="font-semibold text-charcoal hover:text-brand dark:text-white">{p.title}</Link><p className="text-xs">/{p.slug} · updated {p.updatedAt.toLocaleDateString("en", { dateStyle: "medium" })}</p></div>
                <Badge tone={s.tone}>{s.t}</Badge>
                <div className="flex gap-1"><Button asChild size="sm" variant="ghost"><Link href={`/admin/blog/${p.id}`}>Edit</Link></Button><DeletePostButton id={p.id} title={p.title} /></div>
              </li>
            ); })}
          </ul>
        )}
      </Card>
    </>
  );
}
