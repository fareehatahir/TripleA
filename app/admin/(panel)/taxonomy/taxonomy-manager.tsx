"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge, Card, EmptyState } from "@/components/admin/ui";
import { ConfirmDialog, Field, Modal } from "@/components/admin/forms";
import { Dropzone } from "@/components/admin/uploader";
import { deleteTaxonomyAction, moveTaxonomyAction, saveCategoryAction, saveMakeAction, saveModelAction } from "./actions";
import { cn } from "@/lib/utils";

type Cat = { id: string; name: string; slug: string; image: string | null; count: number };
type Model = { id: string; name: string; slug: string; count: number };
type Make = { id: string; name: string; slug: string; logo: string | null; count: number; models: Model[] };
type Edit = { kind: "category" | "make" | "model"; id: string | null; name: string; slug: string; image: string | null; makeId?: string } | null;
type Del = { kind: "category" | "make" | "model"; id: string; name: string } | null;

export function TaxonomyManager({ categories, makes }: { categories: Cat[]; makes: Make[] }) {
  const router = useRouter();
  const [tab, setTab] = useState<"categories" | "makes">("categories");
  const [openMake, setOpenMake] = useState<string | null>(null);
  const [edit, setEdit] = useState<Edit>(null);
  const [del, setDel] = useState<Del>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, after?: () => void) =>
    start(async () => {
      const r = await fn();
      if (!r.ok) return setError(r.error ?? "Something went wrong");
      setError(null);
      after?.();
      router.refresh();
    });

  const submit = () => {
    if (!edit) return;
    const { kind, id, name, slug, image, makeId } = edit;
    run(
      () => (kind === "category" ? saveCategoryAction(id, { name, slug: slug || undefined, image }) : kind === "make" ? saveMakeAction(id, { name, slug: slug || undefined, logo: image }) : saveModelAction(id, { makeId, name, slug: slug || undefined })),
      () => setEdit(null)
    );
  };

  const Thumb = ({ src, name }: { src: string | null; name: string }) =>
    src ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt="" className="h-10 w-10 rounded-lg bg-mist object-contain p-0.5 dark:bg-white/10" />
    ) : (
      <span className="grid h-10 w-10 place-items-center rounded-lg bg-mist text-sm font-bold text-graphite dark:bg-white/10 dark:text-silver">{name[0]}</span>
    );

  const Mover = ({ kind, id, i, n }: { kind: "category" | "make"; id: string; i: number; n: number }) => (
    <span className="flex">
      <button aria-label="Move up" disabled={i === 0 || pending} onClick={() => run(() => moveTaxonomyAction(kind, id, -1))} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-mist disabled:opacity-30 dark:hover:bg-white/10"><ArrowUp className="h-4 w-4" /></button>
      <button aria-label="Move down" disabled={i === n - 1 || pending} onClick={() => run(() => moveTaxonomyAction(kind, id, 1))} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-mist disabled:opacity-30 dark:hover:bg-white/10"><ArrowDown className="h-4 w-4" /></button>
    </span>
  );

  const Actions = ({ onEdit, onDelete, label }: { onEdit: () => void; onDelete: () => void; label: string }) => (
    <span className="flex">
      <button aria-label={`Edit ${label}`} onClick={onEdit} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-mist dark:hover:bg-white/10"><Pencil className="h-4 w-4" /></button>
      <button aria-label={`Delete ${label}`} onClick={onDelete} className="grid h-8 w-8 place-items-center rounded-lg text-brand hover:bg-brand/10"><Trash2 className="h-4 w-4" /></button>
    </span>
  );

  return (
    <>
      {error && <p role="alert" className="mb-4 rounded-xl bg-brand/10 px-4 py-3 text-sm font-medium text-brand">{error}</p>}
      <div role="tablist" className="mb-5 inline-flex rounded-xl bg-white p-1 shadow-soft dark:bg-charcoal">
        {(["categories", "makes"] as const).map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={cn("rounded-lg px-5 py-2 text-sm font-semibold capitalize transition", tab === t ? "bg-charcoal text-white dark:bg-brand" : "hover:bg-mist dark:hover:bg-white/10")}>
            {t === "makes" ? "Makes & models" : t}
          </button>
        ))}
      </div>

      {tab === "categories" ? (
        <Card>
          <div className="flex items-center justify-between p-5">
            <p className="text-sm">{categories.length} categories · shown in this order in menus</p>
            <Button size="sm" onClick={() => setEdit({ kind: "category", id: null, name: "", slug: "", image: null })}><Plus className="h-4 w-4" /> Add category</Button>
          </div>
          {categories.length === 0 ? <EmptyState icon={Plus} title="No categories" text="Add Cars, Engines, Parts…" /> : (
            <ul className="divide-y divide-silver/40 border-t border-silver/40 dark:divide-white/10 dark:border-white/10">
              {categories.map((c, i) => (
                <li key={c.id} className="flex items-center gap-4 px-5 py-3">
                  <Thumb src={c.image} name={c.name} />
                  <div className="min-w-0 flex-1"><p className="font-semibold text-charcoal dark:text-white">{c.name}</p><p className="text-xs">/{c.slug}</p></div>
                  <Badge>{c.count} product{c.count === 1 ? "" : "s"}</Badge>
                  <Mover kind="category" id={c.id} i={i} n={categories.length} />
                  <Actions label={c.name} onEdit={() => setEdit({ kind: "category", id: c.id, name: c.name, slug: c.slug, image: c.image })} onDelete={() => setDel({ kind: "category", id: c.id, name: c.name })} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      ) : (
        <Card>
          <div className="flex items-center justify-between p-5">
            <p className="text-sm">{makes.length} makes · click a make to manage its models</p>
            <Button size="sm" onClick={() => setEdit({ kind: "make", id: null, name: "", slug: "", image: null })}><Plus className="h-4 w-4" /> Add make</Button>
          </div>
          <ul className="divide-y divide-silver/40 border-t border-silver/40 dark:divide-white/10 dark:border-white/10">
            {makes.map((m, i) => (
              <li key={m.id}>
                <div className="flex items-center gap-4 px-5 py-3">
                  <button className="flex min-w-0 flex-1 items-center gap-4 text-left" aria-expanded={openMake === m.id} onClick={() => setOpenMake(openMake === m.id ? null : m.id)}>
                    <ChevronRight className={cn("h-4 w-4 shrink-0 transition", openMake === m.id && "rotate-90")} />
                    <Thumb src={m.logo} name={m.name} />
                    <span className="min-w-0"><span className="block font-semibold text-charcoal dark:text-white">{m.name}</span><span className="text-xs">{m.models.length} model{m.models.length === 1 ? "" : "s"}</span></span>
                  </button>
                  <Badge>{m.count} product{m.count === 1 ? "" : "s"}</Badge>
                  <Mover kind="make" id={m.id} i={i} n={makes.length} />
                  <Actions label={m.name} onEdit={() => setEdit({ kind: "make", id: m.id, name: m.name, slug: m.slug, image: m.logo })} onDelete={() => setDel({ kind: "make", id: m.id, name: m.name })} />
                </div>
                {openMake === m.id && (
                  <div className="bg-mist/50 px-5 py-4 pl-[4.5rem] dark:bg-white/5">
                    {m.models.length === 0 && <p className="mb-3 text-sm">No models yet.</p>}
                    <ul className="mb-3 flex flex-wrap gap-2">
                      {m.models.map((x) => (
                        <li key={x.id} className="flex items-center gap-1 rounded-full bg-white py-1 pl-4 pr-1 text-sm shadow-soft dark:bg-charcoal">
                          {x.name} <span className="text-xs">({x.count})</span>
                          <button aria-label={`Rename ${x.name}`} onClick={() => setEdit({ kind: "model", id: x.id, name: x.name, slug: x.slug, image: null, makeId: m.id })} className="grid h-7 w-7 place-items-center rounded-full hover:bg-mist dark:hover:bg-white/10"><Pencil className="h-3.5 w-3.5" /></button>
                          <button aria-label={`Delete ${x.name}`} onClick={() => setDel({ kind: "model", id: x.id, name: x.name })} className="grid h-7 w-7 place-items-center rounded-full text-brand hover:bg-brand/10"><Trash2 className="h-3.5 w-3.5" /></button>
                        </li>
                      ))}
                    </ul>
                    <Button size="sm" variant="ghost" onClick={() => setEdit({ kind: "model", id: null, name: "", slug: "", image: null, makeId: m.id })}><Plus className="h-4 w-4" /> Add model to {m.name}</Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Modal open={!!edit} onClose={() => setEdit(null)} title={`${edit?.id ? "Edit" : "Add"} ${edit?.kind ?? ""}`}>
        {edit && (
          <form className="space-y-4" onSubmit={(e) => (e.preventDefault(), submit())}>
            <Field label="Name" autoFocus value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
            <Field label="URL name (optional)" hint="Auto-created from the name." value={edit.slug} onChange={(e) => setEdit({ ...edit, slug: e.target.value })} />
            {edit.kind !== "model" && (
              <div>
                <p className="mb-1.5 text-sm font-semibold text-charcoal dark:text-white">{edit.kind === "make" ? "Logo" : "Image"} (optional)</p>
                {edit.image && (
                  <div className="mb-3 flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={edit.image} alt="" className="h-14 w-14 rounded-lg bg-mist object-contain p-1 dark:bg-white/10" />
                    <button type="button" className="text-sm font-semibold text-brand hover:underline" onClick={() => setEdit({ ...edit, image: null })}>Remove</button>
                  </div>
                )}
                <Dropzone compact multiple={false} label="Drop an image or click" onUploaded={(a) => setEdit({ ...edit, image: a[0].url })} />
              </div>
            )}
            {error && <p role="alert" className="text-sm font-medium text-brand">{error}</p>}
            <Button className="w-full" disabled={pending}>{pending ? "Saving…" : "Save"}</Button>
          </form>
        )}
      </Modal>
      <ConfirmDialog
        open={!!del}
        title={`Delete ${del?.kind} “${del?.name}”?`}
        text="This cannot be undone. It is blocked if any product still uses it."
        busy={pending}
        onClose={() => (setDel(null), setError(null))}
        onConfirm={() => del && run(() => deleteTaxonomyAction(del.kind, del.id), () => setDel(null))}
      />
    </>
  );
}
