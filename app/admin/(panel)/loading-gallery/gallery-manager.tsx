"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Camera, Check, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, EmptyState, inputCls } from "@/components/admin/ui";
import { ConfirmDialog } from "@/components/admin/forms";
import { Dropzone } from "@/components/admin/uploader";
import { cn } from "@/lib/utils";
import { addLoadingPhotosAction, deleteLoadingPhotosAction, updateLoadingPhotoAction } from "./actions";

type P = { id: string; url: string; thumbUrl: string | null; caption: string; destination: string; shotAt: string };

export function GalleryManager({ photos }: { photos: P[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [defs, setDefs] = useState({ caption: "", destination: "", shotAt: new Date().toISOString().slice(0, 10) });
  const [edits, setEdits] = useState<Record<string, Partial<P>>>({});
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [confirm, setConfirm] = useState<string[] | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const toggle = (id: string) => setSel((s) => (s.has(id) ? (s.delete(id), new Set(s)) : new Set(s).add(id)));

  return (
    <>
      {msg && <p role={msg.ok ? "status" : "alert"} className={cn("mb-4 rounded-xl px-4 py-3 text-sm font-medium", msg.ok ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-brand/10 text-brand")}>{msg.text}</p>}
      <Card className="mb-6 p-6">
        <h2 className="text-lg font-bold">Add photos</h2>
        <p className="mt-1 text-sm">Set the details first: they are applied to every photo you drop below. You can fine-tune each photo afterwards.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div><label htmlFor="g-cap" className="mb-1.5 block text-sm font-semibold text-charcoal dark:text-white">Caption (optional)</label><input id="g-cap" className={inputCls} value={defs.caption} onChange={(e) => setDefs({ ...defs, caption: e.target.value })} placeholder="40HQ container of engines" /></div>
          <div><label htmlFor="g-dest" className="mb-1.5 block text-sm font-semibold text-charcoal dark:text-white">Destination</label><input id="g-dest" className={inputCls} value={defs.destination} onChange={(e) => setDefs({ ...defs, destination: e.target.value })} placeholder="Mombasa, Kenya" /></div>
          <div><label htmlFor="g-date" className="mb-1.5 block text-sm font-semibold text-charcoal dark:text-white">Loading date</label><input id="g-date" type="date" className={inputCls} value={defs.shotAt} onChange={(e) => setDefs({ ...defs, shotAt: e.target.value })} /></div>
        </div>
        <div className="mt-4">
          <Dropzone label="Drop loading photos here or click to browse" onUploaded={(assets) => start(async () => {
            const r = await addLoadingPhotosAction(assets.map((a) => a.id), defs);
            setMsg({ ok: r.ok, text: r.ok ? `${assets.length} photo${assets.length === 1 ? "" : "s"} added to the gallery.` : r.error });
            router.refresh();
          })} />
        </div>
      </Card>

      {sel.size > 0 && (
        <div className="mb-4 flex items-center justify-between rounded-xl bg-charcoal px-5 py-3 text-sm text-white"><strong>{sel.size} selected</strong>
          <span className="flex gap-2"><Button size="sm" variant="ghost" className="bg-white/10 text-white ring-0 hover:bg-white/20" onClick={() => setSel(new Set())}>Clear</Button><Button size="sm" onClick={() => setConfirm([...sel])}><Trash2 className="h-4 w-4" /> Remove</Button></span>
        </div>
      )}

      {photos.length === 0 ? <Card><EmptyState icon={Camera} title="No photos yet" text="Drop your first loading photos above." /></Card> : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {photos.map((p) => {
            const e = { ...p, ...edits[p.id] };
            const dirty = !!edits[p.id];
            return (
              <li key={p.id}>
                <Card className={cn("overflow-hidden", sel.has(p.id) && "ring-2 ring-brand")}>
                  <div className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.thumbUrl ?? p.url} alt={p.caption || "Loading photo"} loading="lazy" className="aspect-[4/3] w-full object-cover" />
                    <button role="checkbox" aria-checked={sel.has(p.id)} aria-label="Select photo" onClick={() => toggle(p.id)} className={cn("absolute left-3 top-3 grid h-7 w-7 place-items-center rounded-md border-2 transition", sel.has(p.id) ? "border-brand bg-brand text-white" : "border-white bg-black/30 text-transparent hover:text-white/70")}><Check className="h-4 w-4" /></button>
                  </div>
                  <div className="space-y-2 p-4">
                    <input aria-label="Caption" placeholder="Caption" value={e.caption} onChange={(ev) => setEdits({ ...edits, [p.id]: { ...edits[p.id], caption: ev.target.value } })} className={cn(inputCls, "h-10")} />
                    <div className="grid grid-cols-2 gap-2">
                      <input aria-label="Destination" placeholder="Destination" value={e.destination} onChange={(ev) => setEdits({ ...edits, [p.id]: { ...edits[p.id], destination: ev.target.value } })} className={cn(inputCls, "h-10")} />
                      <input aria-label="Date" type="date" value={e.shotAt} onChange={(ev) => setEdits({ ...edits, [p.id]: { ...edits[p.id], shotAt: ev.target.value } })} className={cn(inputCls, "h-10")} />
                    </div>
                    <Button size="sm" variant={dirty ? "primary" : "ghost"} disabled={!dirty || pending} className="w-full" onClick={() => start(async () => {
                      const r = await updateLoadingPhotoAction(p.id, { caption: e.caption, destination: e.destination, shotAt: e.shotAt });
                      setMsg({ ok: r.ok, text: r.ok ? "Photo updated." : r.error });
                      if (r.ok) { const c = { ...edits }; delete c[p.id]; setEdits(c); router.refresh(); }
                    })}><Save className="h-4 w-4" /> {dirty ? "Save changes" : "Saved"}</Button>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
      <ConfirmDialog open={!!confirm} title={`Remove ${confirm?.length === 1 ? "this photo" : `${confirm?.length} photos`} from the gallery?`} text="They disappear from the website. The files stay in the media library, so you can add them again." confirmLabel="Remove" busy={pending} onClose={() => setConfirm(null)}
        onConfirm={() => confirm && start(async () => { const r = await deleteLoadingPhotosAction(confirm); setMsg({ ok: r.ok, text: r.ok ? "Removed from the gallery." : r.error }); setConfirm(null); setSel(new Set()); router.refresh(); })} />
    </>
  );
}
