"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge, Card, EmptyState, inputCls } from "@/components/admin/ui";
import { ConfirmDialog, Modal } from "@/components/admin/forms";
import { cn } from "@/lib/utils";

export type FieldDef = { key: string; label: string; type: "text" | "textarea" | "number" | "date" | "select" | "bool"; options?: { value: string; label: string }[]; hint?: string; wide?: boolean };
type Row = { id: string } & Record<string, unknown>;
type Res = { ok: true } | { ok: false; error: string };

const fmt = (f: FieldDef, v: unknown) => {
  if (v === null || v === undefined || v === "") return "—";
  if (f.type === "bool") return v ? "Yes" : "No";
  if (f.type === "date") return new Date(String(v)).toLocaleDateString("en", { day: "2-digit", month: "short", year: "numeric" });
  if (f.type === "select") return f.options?.find((o) => o.value === v)?.label ?? String(v);
  return String(v);
};

/** Generic add / edit / delete / reorder table used for FAQs, testimonials and freight rates. */
export function RecordManager({ noun, items, fields, columns, defaults, expiredKey, onSave, onDelete, onMove, emptyText, toolbar }: {
  noun: string; items: Row[]; fields: FieldDef[]; columns: string[]; defaults: Record<string, unknown>; expiredKey?: string; emptyText: string; toolbar?: React.ReactNode;
  onSave: (id: string | null, data: Record<string, unknown>) => Promise<Res>;
  onDelete: (id: string) => Promise<Res>;
  onMove?: (id: string, dir: -1 | 1) => Promise<Res>;
}) {
  const router = useRouter();
  const [edit, setEdit] = useState<{ id: string | null; values: Record<string, unknown> } | null>(null);
  const [del, setDel] = useState<Row | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const cols = columns.map((k) => fields.find((f) => f.key === k)!);
  const now = Date.now();

  const run = (fn: () => Promise<Res>, after?: () => void) => start(async () => {
    const r = await fn();
    if (!r.ok) return setError(r.error);
    setError(null); after?.(); router.refresh();
  });

  return (
    <>
      {error && !edit && <p role="alert" className="mb-4 rounded-xl bg-brand/10 px-4 py-3 text-sm font-medium text-brand">{error}</p>}
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 p-5">
          <p className="text-sm">{items.length} {noun}{items.length === 1 ? "" : "s"}</p>
          <div className="flex flex-wrap gap-2">{toolbar}<Button size="sm" onClick={() => (setError(null), setEdit({ id: null, values: { ...defaults } }))}><Plus className="h-4 w-4" /> Add {noun}</Button></div>
        </div>
        {items.length === 0 ? <EmptyState icon={Plus} title={`No ${noun}s yet`} text={emptyText} /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-y border-silver/40 text-xs uppercase tracking-wider dark:border-white/10"><tr>{cols.map((c) => <th key={c.key} className="px-5 py-3">{c.label}</th>)}<th className="px-5 py-3 text-right">Actions</th></tr></thead>
              <tbody className="divide-y divide-silver/40 dark:divide-white/10">
                {items.map((r, i) => {
                  const expired = expiredKey && new Date(String(r[expiredKey])).getTime() < now;
                  return (
                    <tr key={r.id} className={expired ? "bg-amber-500/10" : undefined}>
                      {cols.map((c, ci) => (
                        <td key={c.key} className={cn("max-w-xs px-5 py-3", ci === 0 && "font-semibold text-charcoal dark:text-white")}>
                          <span className="line-clamp-2">{fmt(c, r[c.key])}</span>
                          {expired && c.key === expiredKey && <span className="ml-2"><Badge tone="amber">Expired</Badge></span>}
                        </td>
                      ))}
                      <td className="px-5 py-3">
                        <div className="flex justify-end gap-0.5">
                          {onMove && <>
                            <button aria-label="Move up" disabled={i === 0 || pending} onClick={() => run(() => onMove(r.id, -1))} className="grid h-9 w-9 place-items-center rounded-lg hover:bg-mist disabled:opacity-30 dark:hover:bg-white/10"><ArrowUp className="h-4 w-4" /></button>
                            <button aria-label="Move down" disabled={i === items.length - 1 || pending} onClick={() => run(() => onMove(r.id, 1))} className="grid h-9 w-9 place-items-center rounded-lg hover:bg-mist disabled:opacity-30 dark:hover:bg-white/10"><ArrowDown className="h-4 w-4" /></button>
                          </>}
                          <button aria-label={`Edit ${noun}`} onClick={() => (setError(null), setEdit({ id: r.id, values: Object.fromEntries(fields.map((f) => [f.key, f.type === "date" && r[f.key] ? String(r[f.key]).slice(0, 10) : r[f.key] ?? ""])) }))} className="grid h-9 w-9 place-items-center rounded-lg hover:bg-mist dark:hover:bg-white/10"><Pencil className="h-4 w-4" /></button>
                          <button aria-label={`Delete ${noun}`} onClick={() => setDel(r)} className="grid h-9 w-9 place-items-center rounded-lg text-brand hover:bg-brand/10"><Trash2 className="h-4 w-4" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={!!edit} onClose={() => setEdit(null)} title={`${edit?.id ? "Edit" : "Add"} ${noun}`}>
        {edit && (
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); run(() => onSave(edit.id, edit.values), () => setEdit(null)); }}>
            {fields.map((f) => {
              const v = edit.values[f.key];
              const set = (x: unknown) => setEdit({ ...edit, values: { ...edit.values, [f.key]: x } });
              const id = `rm-${f.key}`;
              return (
                <div key={f.key}>
                  {f.type === "bool" ? (
                    <label className="flex cursor-pointer items-center gap-3 text-sm font-semibold text-charcoal dark:text-white"><input type="checkbox" checked={!!v} onChange={(e) => set(e.target.checked)} className="h-5 w-5 accent-brand" /> {f.label}</label>
                  ) : (
                    <>
                      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-charcoal dark:text-white">{f.label}</label>
                      {f.type === "textarea" ? <textarea id={id} rows={4} value={String(v ?? "")} onChange={(e) => set(e.target.value)} className={cn(inputCls, "h-auto py-3")} />
                        : f.type === "select" ? <select id={id} value={String(v ?? "")} onChange={(e) => set(e.target.value)} className={inputCls}>{f.options!.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
                        : <input id={id} type={f.type === "number" ? "number" : f.type === "date" ? "date" : "text"} step="any" value={String(v ?? "")} onChange={(e) => set(e.target.value)} className={inputCls} />}
                    </>
                  )}
                  {f.hint && <p className="mt-1 text-xs">{f.hint}</p>}
                </div>
              );
            })}
            {error && <p role="alert" className="text-sm font-medium text-brand">{error}</p>}
            <Button className="w-full" disabled={pending}>{pending ? "Saving…" : "Save"}</Button>
          </form>
        )}
      </Modal>
      <ConfirmDialog open={!!del} title={`Delete this ${noun}?`} text="This cannot be undone." busy={pending} onClose={() => setDel(null)} onConfirm={() => del && run(() => onDelete(del.id), () => setDel(null))} />
    </>
  );
}
