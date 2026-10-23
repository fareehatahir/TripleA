"use client";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Check, Plus, RotateCcw, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, inputCls } from "@/components/admin/ui";
import { ConfirmDialog } from "@/components/admin/forms";
import { Dropzone } from "@/components/admin/uploader";
import { RichText } from "@/components/admin/rich-text";
import type { Leaf, Node } from "@/components/admin/content-defs";
import { cn } from "@/lib/utils";

type Data = Record<string, unknown>;
const label = "mb-1.5 block text-sm font-semibold text-charcoal dark:text-white";

function setIn(obj: unknown, path: (string | number)[], value: unknown): unknown {
  if (!path.length) return value;
  const [k, ...rest] = path;
  const copy: Record<string | number, unknown> | unknown[] = Array.isArray(obj) ? [...obj] : { ...(obj as object) };
  (copy as Record<string | number, unknown>)[k] = setIn((obj as Record<string | number, unknown>)?.[k], rest, value);
  return copy;
}

function LeafField({ f, value, onChange, id }: { f: Leaf; value: unknown; onChange: (v: unknown) => void; id: string }) {
  const str = value === undefined || value === null ? "" : String(value);
  return (
    <div>
      {f.type !== "bool" && <label htmlFor={id} className={label}>{f.label}</label>}
      {f.type === "text" || f.type === "url" || f.type === "number" ? (
        <input id={id} type={f.type === "number" ? "number" : "text"} step="any" value={str} onChange={(e) => onChange(e.target.value)} className={inputCls} />
      ) : f.type === "textarea" ? (
        <textarea id={id} rows={f.rows ?? 3} value={str} onChange={(e) => onChange(e.target.value)} className={cn(inputCls, "h-auto py-3")} />
      ) : f.type === "rich" ? (
        <RichText id={id} value={str} onChange={onChange} />
      ) : f.type === "bool" ? (
        <label className="flex cursor-pointer items-center gap-3 text-sm font-semibold text-charcoal dark:text-white">
          <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} className="h-5 w-5 accent-brand" /> {f.label}
        </label>
      ) : (
        <div>
          {str && (
            <div className="mb-3 flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={str} alt="" className="h-20 w-28 rounded-lg object-cover" />
              <button type="button" onClick={() => onChange("")} className="text-sm font-semibold text-brand hover:underline">Remove</button>
            </div>
          )}
          <Dropzone compact multiple={false} label={str ? "Replace photo" : "Drop a photo or click"} onUploaded={(a) => onChange(a[0].url)} />
        </div>
      )}
      {f.hint && <p className="mt-1 text-xs">{f.hint}</p>}
    </div>
  );
}

function Mover({ i, n, move, remove }: { i: number; n: number; move: (d: -1 | 1) => void; remove: () => void }) {
  const b = "grid h-8 w-8 place-items-center rounded-lg hover:bg-mist disabled:opacity-30 dark:hover:bg-white/10";
  return (
    <span className="flex">
      <button type="button" aria-label="Move up" disabled={i === 0} onClick={() => move(-1)} className={b}><ArrowUp className="h-4 w-4" /></button>
      <button type="button" aria-label="Move down" disabled={i === n - 1} onClick={() => move(1)} className={b}><ArrowDown className="h-4 w-4" /></button>
      <button type="button" aria-label="Remove" onClick={remove} className={cn(b, "text-brand hover:bg-brand/10")}><Trash2 className="h-4 w-4" /></button>
    </span>
  );
}

function NodeView({ node, value, path, set, uid }: { node: Node; value: unknown; path: (string | number)[]; set: (p: (string | number)[], v: unknown) => void; uid: string }) {
  const id = `${uid}-${path.join("-")}`;
  if (node.type === "group") {
    const v = (value ?? {}) as Data;
    return (
      <fieldset className="rounded-2xl border border-silver/50 p-5 dark:border-white/10">
        <legend className="px-2 font-bold text-charcoal dark:text-white">{node.label}</legend>
        <div className="space-y-4">{node.fields.map((f) => <NodeView key={f.key} node={f} value={v[f.key]} path={[...path, f.key]} set={set} uid={uid} />)}</div>
      </fieldset>
    );
  }
  if (node.type === "strings") {
    const arr = (Array.isArray(value) ? value : []) as string[];
    return (
      <div>
        <p className={label}>{node.label}</p>
        <div className="space-y-2">
          {arr.map((s, i) => (
            <div key={i} className="flex gap-2">
              <input aria-label={`${node.label} ${i + 1}`} value={s} onChange={(e) => set(path, arr.map((x, n) => (n === i ? e.target.value : x)))} className={inputCls} />
              <button type="button" aria-label="Remove" onClick={() => set(path, arr.filter((_, n) => n !== i))} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl hover:bg-brand/10 hover:text-brand"><X className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
        {arr.length < (node.max ?? 10) && <Button type="button" variant="ghost" size="sm" className="mt-2" onClick={() => set(path, [...arr, ""])}><Plus className="h-4 w-4" /> Add</Button>}
      </div>
    );
  }
  if (node.type === "list") {
    const arr = (Array.isArray(value) ? value : []) as Data[];
    const move = (i: number, d: -1 | 1) => { const c = [...arr]; [c[i], c[i + d]] = [c[i + d], c[i]]; set(path, c); };
    return (
      <div>
        <p className="text-base font-bold text-charcoal dark:text-white">{node.label}</p>
        {node.hint && <p className="mb-2 text-xs">{node.hint}</p>}
        <div className="mt-3 space-y-3">
          {arr.length === 0 && <p className="rounded-xl bg-mist p-4 text-sm dark:bg-white/5">Nothing here yet.</p>}
          {arr.map((item, i) => (
            <div key={i} className="rounded-2xl bg-mist/70 p-4 dark:bg-white/5">
              <div className="mb-3 flex items-center justify-between"><span className="text-xs font-bold uppercase tracking-wider">{node.itemLabel} {i + 1}</span><Mover i={i} n={arr.length} move={(d) => move(i, d)} remove={() => set(path, arr.filter((_, n) => n !== i))} /></div>
              <div className="grid gap-3 sm:grid-cols-2">
                {node.fields.map((f) => (
                  <div key={f.key} className={f.type === "textarea" || f.type === "image" || f.type === "rich" ? "sm:col-span-2" : undefined}>
                    <LeafField f={f} id={`${id}-${i}-${f.key}`} value={item[f.key]} onChange={(v) => set([...path, i, f.key], v)} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        {arr.length < (node.max ?? 30) && <Button type="button" variant="ghost" size="sm" className="mt-3" onClick={() => set(path, [...arr, Object.fromEntries(node.fields.map((f) => [f.key, f.type === "number" ? 0 : ""]))])}><Plus className="h-4 w-4" /> Add {node.itemLabel.toLowerCase()}</Button>}
      </div>
    );
  }
  return <LeafField f={node} id={id} value={value} onChange={(v) => set(path, v)} />;
}

export function BlockEditor({ blockKey, nodes, initial, save, reset, viewHref }: {
  blockKey: string; nodes: Node[]; initial: Data; viewHref: string;
  save: (key: string, data: unknown) => Promise<{ ok: true } | { ok: false; error: string }>;
  reset: (key: string) => Promise<{ ok: true } | { ok: false; error: string }>;
}) {
  const router = useRouter();
  const [data, setData] = useState<Data>(initial);
  const [dirty, setDirty] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [pending, start] = useTransition();
  const uid = `ce-${blockKey}`;

  const set = (p: (string | number)[], v: unknown) => { setData((d) => setIn(d, p, v) as Data); setDirty(true); setMsg(null); };
  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => dirty && (e.preventDefault(), (e.returnValue = ""));
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  return (
    <div className="pb-28">
      {msg && <p role={msg.ok ? "status" : "alert"} className={cn("mb-5 flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium", msg.ok ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-brand/10 text-brand")}>{msg.ok && <Check className="h-4 w-4" />}{msg.text}</p>}
      <Card className="space-y-6 p-6">{nodes.map((n) => <NodeView key={n.key} node={n} value={data[n.key]} path={[n.key]} set={set} uid={uid} />)}</Card>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-silver/50 bg-white/90 px-4 py-3 backdrop-blur-xl dark:border-white/10 dark:bg-[#111214]/90 lg:left-[260px]">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-3">
          <p className="text-xs">{dirty ? "Unsaved changes" : "All changes saved"}</p>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setConfirm(true)}><RotateCcw className="h-4 w-4" /> Reset to defaults</Button>
            <Button type="button" variant="ghost" size="sm" asChild><a href={viewHref} target="_blank" rel="noopener noreferrer">View page ↗</a></Button>
            <Button type="button" disabled={pending || !dirty} onClick={() => start(async () => { const r = await save(blockKey, data); setMsg({ ok: r.ok, text: r.ok ? "Saved. The website is updated." : r.error }); if (r.ok) { setDirty(false); router.refresh(); } })}>{pending ? "Saving…" : "Save changes"}</Button>
          </div>
        </div>
      </div>
      <ConfirmDialog open={confirm} title="Reset to the original text?" text="Everything you changed on this page will be replaced by the default content. This cannot be undone." confirmLabel="Reset" busy={pending} onClose={() => setConfirm(false)}
        onConfirm={() => start(async () => { const r = await reset(blockKey); setConfirm(false); if (r.ok) { setDirty(false); window.location.reload(); } else setMsg({ ok: false, text: r.error }); })} />
    </div>
  );
}
