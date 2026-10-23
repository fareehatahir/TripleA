import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getContentFresh, contentSchemas, type ContentKey } from "@/lib/content";
import { blocks } from "@/components/admin/content-defs";
import { BlockEditor } from "@/components/admin/block-editor";
import { saveContentAction, resetContentAction } from "../actions";

export async function generateMetadata(props: { params: Promise<{ block: string }> }) {
  const params = await props.params;
  return { title: blocks[params.block]?.title ?? "Content" };
}

export default async function EditBlock(props: { params: Promise<{ block: string }> }) {
  const params = await props.params;
  const def = blocks[params.block];
  if (!def || !(params.block in contentSchemas)) notFound();
  const initial = await getContentFresh(params.block as ContentKey);
  return (
    <>
      <div className="mb-6 flex items-center gap-3">
        <Link href="/admin/content" className="grid h-10 w-10 place-items-center rounded-xl hover:bg-white dark:hover:bg-white/10" aria-label="Back to content"><ArrowLeft className="h-5 w-5" /></Link>
        <div><h1 className="text-2xl font-bold md:text-3xl">{def.title}</h1><p className="text-sm">{def.description}</p></div>
      </div>
      <BlockEditor blockKey={params.block} nodes={def.nodes} initial={initial as Record<string, unknown>} viewHref={def.viewHref} save={saveContentAction} reset={resetContentAction} />
    </>
  );
}
