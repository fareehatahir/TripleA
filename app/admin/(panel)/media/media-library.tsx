"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Check, ImageIcon, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge, Card, EmptyState } from "@/components/admin/ui";
import { ConfirmDialog, Modal } from "@/components/admin/forms";
import { Dropzone } from "@/components/admin/uploader";
import { cn } from "@/lib/utils";
import { deleteMediaAction } from "./actions";

type Asset = {
  id: string; url: string; thumbUrl: string | null; filename: string; size: number; width: number | null; height: number | null; createdAt: string;
  usage: { products: { id: string; title: string }[]; gallery: boolean };
};

const kb = (n: number) => (n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.round(n / 1024)} KB`);
const usedCount = (a: Asset) => a.usage.products.length + (a.usage.gallery ? 1 : 0);

export function MediaLibrary({ assets, searching }: { assets: Asset[]; searching: boolean }) {
  const router = useRouter();
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState<Asset | null>(null);
  const [confirm, setConfirm] = useState<string[] | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const toggle = (id: string) => setSel((s) => (s.has(id) ? (s.delete(id), new Set(s)) : new Set(s).add(id)));
  const inUse = (confirm ?? []).reduce((n, id) => n + (usedCount(assets.find((a) => a.id === id)!) > 0 ? 1 : 0), 0);

  return (
    <>
      <div className="mb-6"><Dropzone onUploaded={() => router.refresh()} /></div>
      {msg && <p role="status" className="mb-4 rounded-xl bg-mist px-4 py-3 text-sm dark:bg-white/10">{msg}</p>}
      {sel.size > 0 && (
        <div className="mb-4 flex items-center justify-between rounded-xl bg-charcoal px-5 py-3 text-sm text-white">
          <strong>{sel.size} selected</strong>
          <span className="flex gap-2">
            <Button size="sm" variant="ghost" className="bg-white/10 text-white ring-0 hover:bg-white/20" onClick={() => setSel(new Set())}>Clear</Button>
            <Button size="sm" onClick={() => setConfirm([...sel])}><Trash2 className="h-4 w-4" /> Delete</Button>
          </span>
        </div>
      )}

      {assets.length === 0 ? (
        <Card><EmptyState icon={ImageIcon} title={searching ? "No files match your search" : "No files yet"} text={searching ? "Try another name." : "Drop photos above to start your library."} /></Card>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
          {assets.map((a) => (
            <li key={a.id} className={cn("group relative overflow-hidden rounded-xl border bg-white dark:bg-charcoal", sel.has(a.id) ? "border-brand ring-2 ring-brand" : "border-silver/50 dark:border-white/10")}>
              <button onClick={() => setOpen(a)} className="block w-full text-left" aria-label={`Open ${a.filename}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={a.thumbUrl ?? a.url} alt="" loading="lazy" className="aspect-square w-full object-cover" />
                <span className="block truncate px-3 pb-2 pt-2 text-xs">{a.filename}</span>
              </button>
              <button onClick={() => toggle(a.id)} role="checkbox" aria-checked={sel.has(a.id)} aria-label={`Select ${a.filename}`} className={cn("absolute left-2 top-2 grid h-6 w-6 place-items-center rounded-md border-2 transition", sel.has(a.id) ? "border-brand bg-brand text-white" : "border-white bg-black/30 text-transparent group-hover:text-white/60")}>
                <Check className="h-4 w-4" />
              </button>
              {usedCount(a) > 0 && <span className="absolute right-2 top-2"><Badge tone="dark">Used {usedCount(a)}×</Badge></span>}
            </li>
          ))}
        </ul>
      )}

      <Modal open={!!open} onClose={() => setOpen(null)} title="File details">
        {open && (
          <div className="space-y-4 text-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={open.url} alt={open.filename} className="max-h-72 w-full rounded-xl bg-mist object-contain dark:bg-white/5" />
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
              <dt>Name</dt><dd className="break-all font-medium text-charcoal dark:text-white">{open.filename}</dd>
              <dt>Size</dt><dd>{kb(open.size)}{open.width ? ` · ${open.width}×${open.height}px` : ""}</dd>
              <dt>Uploaded</dt><dd>{new Date(open.createdAt).toLocaleString("en", { dateStyle: "medium", timeStyle: "short" })}</dd>
              <dt>URL</dt><dd className="break-all text-xs">{open.url}</dd>
            </dl>
            <div>
              <p className="font-semibold text-charcoal dark:text-white">Used in</p>
              {usedCount(open) === 0 ? <p>Not used anywhere. Safe to delete.</p> : (
                <ul className="mt-1 list-disc pl-5">
                  {open.usage.products.map((p) => <li key={p.id}><Link className="text-brand hover:underline" href={`/admin/products/${p.id}`}>{p.title}</Link></li>)}
                  {open.usage.gallery && <li>Loading gallery</li>}
                </ul>
              )}
            </div>
            <Button variant="ghost" className="w-full text-brand" onClick={() => (setConfirm([open.id]), setOpen(null))}><Trash2 className="h-4 w-4" /> Delete file</Button>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!confirm}
        title={`Delete ${confirm?.length === 1 ? "this file" : `${confirm?.length} files`}?`}
        text={inUse > 0 ? `${inUse} of these ${inUse === 1 ? "is" : "are"} used on products or the gallery. They will be removed from there too. This cannot be undone.` : "This permanently removes the files. This cannot be undone."}
        busy={pending}
        onClose={() => setConfirm(null)}
        onConfirm={() => confirm && start(async () => {
          const r = await deleteMediaAction(confirm);
          setMsg(r.ok ? `${r.count} file${r.count === 1 ? "" : "s"} deleted.` : r.error);
          setConfirm(null);
          setSel(new Set());
          router.refresh();
        })}
      />
    </>
  );
}
