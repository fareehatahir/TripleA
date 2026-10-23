/* eslint-disable @next/next/no-img-element -- admin thumbnails are small local files */
"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, inputCls } from "@/components/admin/ui";
import { Dropzone } from "@/components/admin/uploader";
import { RichText } from "@/components/admin/rich-text";
import { slugify } from "@/lib/slug";
import { cn } from "@/lib/utils";
import { saveBlogPostAction } from "./actions";

export type PostValues = { title: string; slug: string; excerpt: string; content: string; coverUrl: string; tags: string[]; status: "DRAFT" | "PUBLISHED"; publishedAt: string; seoTitle: string; seoDescription: string };
const label = "mb-1.5 block text-sm font-semibold text-charcoal dark:text-white";

export function PostForm({ id, initial }: { id: string | null; initial: PostValues }) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [tag, setTag] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<{ text: string; field?: string } | null>(null);
  const [slugTouched, setSlugTouched] = useState(!!initial.slug);
  const set = <K extends keyof PostValues>(k: K, val: PostValues[K]) => setV((x) => ({ ...x, [k]: val }));
  const future = !!v.publishedAt && new Date(v.publishedAt) > new Date();
  const fe = (f: string) => err?.field === f && <p role="alert" className="mt-1 text-xs font-medium text-brand">{err.text}</p>;

  const addTag = () => { const t = tag.trim().replace(/^#/, ""); if (t && !v.tags.includes(t) && v.tags.length < 10) set("tags", [...v.tags, t]); setTag(""); };

  const save = async (status: "DRAFT" | "PUBLISHED") => {
    setBusy(true); setErr(null);
    const r = await saveBlogPostAction(id, { ...v, status, publishedAt: v.publishedAt || undefined });
    setBusy(false);
    if (!r.ok) return setErr({ text: r.error, field: r.field });
    router.push(id ? `/admin/blog/${id}?saved=1` : `/admin/blog/${r.id}?saved=1`);
    router.refresh();
  };

  return (
    <div className="pb-28">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/admin/blog" className="grid h-10 w-10 place-items-center rounded-xl hover:bg-white dark:hover:bg-white/10" aria-label="Back to blog"><ArrowLeft className="h-5 w-5" /></Link>
        <h1 className="text-2xl font-bold md:text-3xl">{id ? "Edit post" : "New post"}</h1>
      </div>
      {err && !err.field && <p role="alert" className="mb-5 rounded-xl bg-brand/10 px-4 py-3 text-sm font-medium text-brand">{err.text}</p>}

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Card className="space-y-5 p-6">
            <div><label htmlFor="title" className={label}>Title</label><input id="title" className={inputCls} value={v.title} onChange={(e) => { set("title", e.target.value); if (!slugTouched) set("slug", slugify(e.target.value)); }} />{fe("title")}</div>
            <div><label htmlFor="excerpt" className={label}>Short summary</label><textarea id="excerpt" rows={2} className={cn(inputCls, "h-auto py-3")} value={v.excerpt} onChange={(e) => set("excerpt", e.target.value)} /><p className="mt-1 text-xs">Shown on the blog list and in search results. {v.excerpt.length}/300</p>{fe("excerpt")}</div>
            <div><p className={label}>Article</p><RichText value={v.content} onChange={(h) => set("content", h)} />{fe("content")}</div>
          </Card>
          <Card className="space-y-4 p-6">
            <h2 className="text-lg font-bold">Search engine listing</h2>
            <div><label htmlFor="seot" className={label}>SEO title</label><input id="seot" className={inputCls} value={v.seoTitle} onChange={(e) => set("seoTitle", e.target.value)} /><p className="mt-1 text-xs">{v.seoTitle.length}/70</p>{fe("seoTitle")}</div>
            <div><label htmlFor="seod" className={label}>SEO description</label><textarea id="seod" rows={2} className={cn(inputCls, "h-auto py-3")} value={v.seoDescription} onChange={(e) => set("seoDescription", e.target.value)} /><p className="mt-1 text-xs">{v.seoDescription.length}/170</p>{fe("seoDescription")}</div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="space-y-4 p-6">
            <h2 className="text-lg font-bold">Publishing</h2>
            <div><label htmlFor="pub" className={label}>Publish date and time</label><input id="pub" type="datetime-local" className={inputCls} value={v.publishedAt} onChange={(e) => set("publishedAt", e.target.value)} /><p className="mt-1 text-xs">Leave empty to publish immediately. A future date schedules the post.</p>{fe("publishedAt")}</div>
            {future && <p role="status" className="rounded-xl bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-900 dark:text-amber-200">This post will go live automatically on the date above.</p>}
            <div><label htmlFor="slug" className={label}>URL name</label><input id="slug" className={inputCls} value={v.slug} onChange={(e) => (setSlugTouched(true), set("slug", e.target.value))} /></div>
          </Card>
          <Card className="space-y-3 p-6">
            <h2 className="text-lg font-bold">Cover image</h2>
            {v.coverUrl && <div className="flex items-center gap-3">{/* eslint-disable-next-line @next/next/no-img-element */}<img src={v.coverUrl} alt="" className="h-24 w-36 rounded-lg object-cover" /><button type="button" className="text-sm font-semibold text-brand hover:underline" onClick={() => set("coverUrl", "")}>Remove</button></div>}
            <Dropzone compact multiple={false} label={v.coverUrl ? "Replace cover" : "Drop a cover image"} onUploaded={(a) => set("coverUrl", a[0].url)} />{fe("coverUrl")}
          </Card>
          <Card className="space-y-3 p-6">
            <h2 className="text-lg font-bold">Tags</h2>
            <div className="flex gap-2"><input aria-label="Add a tag" className={inputCls} value={tag} onChange={(e) => setTag(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())} placeholder="shipping, engines…" /><Button type="button" variant="ghost" onClick={addTag}>Add</Button></div>
            <ul className="flex flex-wrap gap-2">{v.tags.map((t) => <li key={t} className="flex items-center gap-1 rounded-full bg-mist py-1 pl-3 pr-1 text-sm dark:bg-white/10">#{t}<button type="button" aria-label={`Remove tag ${t}`} onClick={() => set("tags", v.tags.filter((x) => x !== t))} className="grid h-6 w-6 place-items-center rounded-full hover:bg-brand hover:text-white"><X className="h-3 w-3" /></button></li>)}</ul>
          </Card>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-silver/50 bg-white/90 px-4 py-3 backdrop-blur-xl dark:border-white/10 dark:bg-[#111214]/90 lg:left-[260px]">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-3">
          <p className="text-xs">{id && initial.status === "PUBLISHED" ? "This post is live" : "Not published yet"}</p>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" asChild><Link href="/admin/blog">Cancel</Link></Button>
            <Button type="button" variant="secondary" disabled={busy} onClick={() => save("DRAFT")}>Save as draft</Button>
            <Button type="button" disabled={busy} onClick={() => save("PUBLISHED")}>{busy ? "Saving…" : future ? "Schedule" : initial.status === "PUBLISHED" && id ? "Update" : "Publish"}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
