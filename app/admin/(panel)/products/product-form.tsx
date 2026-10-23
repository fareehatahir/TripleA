"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Check, GripVertical, Plus, Star, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, inputCls } from "@/components/admin/ui";
import { Field } from "@/components/admin/forms";
import { Dropzone, type UploadedAsset } from "@/components/admin/uploader";
import { RichText } from "@/components/admin/rich-text";
import { productSchema, type ProductInput } from "@/lib/validation";
import { slugify } from "@/lib/slug";
import { cn } from "@/lib/utils";
import { saveProductAction } from "./actions";

export type Taxonomy = {
  categories: { id: string; name: string }[];
  makes: { id: string; name: string; models: { id: string; name: string }[] }[];
};

const label = "mb-1.5 block text-sm font-semibold text-charcoal dark:text-white";
const select = inputCls;

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <Card className="p-6">
      <h2 className="text-lg font-bold">{title}</h2>
      {hint && <p className="mt-1 text-sm">{hint}</p>}
      <div className="mt-5">{children}</div>
    </Card>
  );
}

function Toggle({ checked, onChange, label: l, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className={cn("relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition", checked ? "bg-brand" : "bg-silver dark:bg-white/20")}>
        <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all", checked ? "left-[22px]" : "left-0.5")} />
      </button>
      <span>
        <span className="block text-sm font-semibold text-charcoal dark:text-white">{l}</span>
        {hint && <span className="block text-xs">{hint}</span>}
      </span>
    </label>
  );
}

export function ProductForm({ id, initial, taxonomy, created }: { id: string | null; initial: ProductInput; taxonomy: Taxonomy; created?: boolean }) {
  const currency = String(initial.currency ?? "USD");
  const router = useRouter();
  const draftKey = `ta-draft-product-${id ?? "new"}`;
  const [serverError, setServerError] = useState<string | null>(null);
  const [saved, setSaved] = useState(!!created); // arrives true after the redirect that follows creating a product
  const [draft, setDraft] = useState<ProductInput | null>(null);
  const [autosaved, setAutosaved] = useState<string | null>(null);
  const slugTouched = useRef(!!initial.slug);
  const dragFrom = useRef<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  const form = useForm<ProductInput>({ resolver: zodResolver(productSchema), defaultValues: initial });
  const { register, control, handleSubmit, watch, setValue, setError, reset, formState } = form;
  const { errors, isSubmitting, isDirty } = formState;
  const specs = useFieldArray({ control, name: "specs" });
  const images = watch("images") ?? [];
  const makeId = watch("makeId") as string | undefined;
  const status = watch("status");
  const models = useMemo(() => taxonomy.makes.find((m) => m.id === makeId)?.models ?? [], [taxonomy, makeId]);
  const err = (k: keyof ProductInput) => (errors[k] as { message?: string } | undefined)?.message;

  // ----- autosave draft to this browser -----
  useEffect(() => {
    try {
      const raw = localStorage.getItem(draftKey);
      if (raw) setDraft(JSON.parse(raw));
    } catch {}
  }, [draftKey]);
  useEffect(() => {
    const sub = watch((values) => {
      const t = setTimeout(() => {
        try {
          localStorage.setItem(draftKey, JSON.stringify(values));
          setAutosaved(new Date().toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit" }));
        } catch {}
      }, 1500);
      return () => clearTimeout(t);
    });
    return () => sub.unsubscribe();
  }, [watch, draftKey]);
  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => isDirty && !saved && (e.preventDefault(), (e.returnValue = ""));
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [isDirty, saved]);

  const addImages = (assets: UploadedAsset[]) => {
    const have = new Set(images.map((i) => i.mediaId));
    const fresh = assets.filter((a) => !have.has(a.id)).map((a) => ({ mediaId: a.id, url: a.url, thumbUrl: a.thumbUrl, blur: a.blur, alt: "" }));
    setValue("images", [...images, ...fresh], { shouldDirty: true });
  };
  const moveImage = (from: number, to: number) => {
    if (from === to || to < 0 || to >= images.length) return;
    const next = [...images];
    next.splice(to, 0, next.splice(from, 1)[0]);
    setValue("images", next, { shouldDirty: true });
  };

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    const res = await saveProductAction(id, values);
    if (!res.ok) {
      if (res.field) setError(res.field as keyof ProductInput, { message: res.error });
      setServerError(res.error);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    try { localStorage.removeItem(draftKey); } catch {}
    setSaved(true);
    reset(values);
    if (!id) router.replace(`/admin/products/${res.id}?created=1`);
    else router.refresh();
  });

  const submitWith = (s: "DRAFT" | "PUBLISHED") => () => {
    setValue("status", s, { shouldDirty: true });
    return onSubmit();
  };

  return (
    <form onSubmit={onSubmit} noValidate className="pb-28">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/admin/products" className="grid h-10 w-10 place-items-center rounded-xl hover:bg-white dark:hover:bg-white/10" aria-label="Back to products"><ArrowLeft className="h-5 w-5" /></Link>
        <h1 className="text-2xl font-bold md:text-3xl">{id ? "Edit product" : "New product"}</h1>
      </div>

      {draft && (
        <div role="status" className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-amber-500/10 px-5 py-4 text-sm text-amber-900 dark:text-amber-200">
          <span>You have unsaved changes from an earlier session in this browser.</span>
          <span className="flex gap-2">
            <Button type="button" size="sm" onClick={() => (reset(draft), slugTouched.current = !!draft.slug, setDraft(null))}>Restore</Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => (localStorage.removeItem(draftKey), setDraft(null))}>Discard</Button>
          </span>
        </div>
      )}
      {serverError && <p role="alert" className="mb-6 rounded-xl bg-brand/10 px-4 py-3 text-sm font-medium text-brand">{serverError}</p>}
      {saved && !serverError && <p role="status" className="mb-6 flex items-center gap-2 rounded-xl bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-700 dark:text-emerald-300"><Check className="h-4 w-4" /> Saved.{created && " Your product has been created."}</p>}

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Section title="Basics">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Title"
                className="sm:col-span-2"
                placeholder="e.g. Mercedes-Benz C280 Sedan"
                error={err("title")}
                {...register("title", { onChange: (e) => !slugTouched.current && setValue("slug", slugify(e.target.value)) })}
              />
              <Field label="SKU / code" placeholder="CAR-0001" error={err("sku")} {...register("sku")} />
              <Field label="URL name (slug)" hint="Used in the web address. Auto-filled from the title." error={err("slug")} {...register("slug", { onChange: () => (slugTouched.current = true) })} />
              <div>
                <label htmlFor="categoryId" className={label}>Category</label>
                <select id="categoryId" className={select} {...register("categoryId")}>
                  <option value="">Choose…</option>
                  {taxonomy.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                {err("categoryId") && <p role="alert" className="mt-1 text-xs font-medium text-brand">{err("categoryId")}</p>}
              </div>
              <div>
                <label htmlFor="makeId" className={label}>Make</label>
                <select id="makeId" className={select} {...register("makeId", { onChange: () => setValue("modelId", "") })}>
                  <option value="">—</option>
                  {taxonomy.makes.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="modelId" className={label}>Model</label>
                <select id="modelId" className={select} disabled={!makeId} {...register("modelId")}>
                  <option value="">{makeId ? (models.length ? "—" : "No models yet (add in Taxonomy)") : "Choose a make first"}</option>
                  {models.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
                {err("modelId") && <p role="alert" className="mt-1 text-xs font-medium text-brand">{err("modelId")}</p>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Year from" type="number" inputMode="numeric" error={err("yearFrom")} {...register("yearFrom")} />
                <Field label="Year to" type="number" inputMode="numeric" error={err("yearTo")} {...register("yearTo")} />
              </div>
            </div>
          </Section>

          <Section title="Photos" hint="The first photo is the cover. Drag to reorder, or use the star to make one the cover.">
            <Dropzone onUploaded={addImages} />
            {images.length === 0 ? (
              <p className="mt-4 rounded-xl bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-200">No photos yet. Products without photos look untrustworthy to buyers.</p>
            ) : (
              <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {images.map((img, i) => (
                  <li
                    key={img.mediaId}
                    draggable
                    onDragStart={() => (dragFrom.current = i)}
                    onDragOver={(e) => (e.preventDefault(), setDragOver(i))}
                    onDragEnd={() => (dragFrom.current = null, setDragOver(null))}
                    onDrop={() => (dragFrom.current !== null && moveImage(dragFrom.current, i), setDragOver(null))}
                    className={cn("group relative overflow-hidden rounded-xl border bg-mist dark:bg-white/5", dragOver === i ? "border-brand ring-2 ring-brand" : "border-silver/60 dark:border-white/10")}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.thumbUrl ?? img.url} alt={`Photo ${i + 1}`} className="aspect-[4/3] w-full object-cover" draggable={false} />
                    {i === 0 && <span className="absolute left-2 top-2 rounded-full bg-brand px-2 py-0.5 text-[11px] font-bold text-white">Cover</span>}
                    <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/70 to-transparent p-2 text-white opacity-100 sm:opacity-0 sm:transition sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                      <GripVertical className="h-4 w-4 cursor-grab" aria-hidden />
                      <span className="flex gap-1">
                        {i !== 0 && <button type="button" aria-label="Make cover" title="Make cover" onClick={() => moveImage(i, 0)} className="grid h-7 w-7 place-items-center rounded-md hover:bg-white/25"><Star className="h-4 w-4" /></button>}
                        <button type="button" aria-label="Remove photo" title="Remove" onClick={() => setValue("images", images.filter((_, n) => n !== i), { shouldDirty: true })} className="grid h-7 w-7 place-items-center rounded-md hover:bg-brand"><Trash2 className="h-4 w-4" /></button>
                      </span>
                    </div>
                    <div className="absolute right-2 top-2 flex gap-1 sm:hidden">
                      {i > 0 && <button type="button" aria-label="Move earlier" onClick={() => moveImage(i, i - 1)} className="grid h-7 w-7 place-items-center rounded-md bg-black/60 text-white">‹</button>}
                      {i < images.length - 1 && <button type="button" aria-label="Move later" onClick={() => moveImage(i, i + 1)} className="grid h-7 w-7 place-items-center rounded-md bg-black/60 text-white">›</button>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {err("images") && <p role="alert" className="mt-2 text-xs font-medium text-brand">{err("images")}</p>}
            <div className="mt-5"><Field label="Video URL (optional)" placeholder="https://youtube.com/watch?v=…" error={err("videoUrl")} {...register("videoUrl")} /></div>
          </Section>

          <Section title="Specifications">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Engine code" placeholder="2GR-FE" error={err("engineCode")} {...register("engineCode")} />
              <Field label="Displacement (cc)" type="number" inputMode="numeric" error={err("displacement")} {...register("displacement")} />
              <div>
                <label htmlFor="condition" className={label}>Condition</label>
                <select id="condition" className={select} {...register("condition")}>
                  <option value="USED">Used</option><option value="REBUILT">Rebuilt</option><option value="NEW">New</option>
                </select>
              </div>
              <div>
                <label htmlFor="fuel" className={label}>Fuel</label>
                <select id="fuel" className={select} {...register("fuel")}>
                  <option value="">—</option><option value="PETROL">Petrol</option><option value="DIESEL">Diesel</option><option value="HYBRID">Hybrid</option><option value="ELECTRIC">Electric</option>
                </select>
              </div>
              <div>
                <label htmlFor="transmission" className={label}>Transmission</label>
                <select id="transmission" className={select} {...register("transmission")}>
                  <option value="">—</option><option value="AT">Automatic (AT)</option><option value="MT">Manual (MT)</option><option value="CVT">CVT</option>
                </select>
              </div>
              <div>
                <label htmlFor="drive" className={label}>Drive</label>
                <select id="drive" className={select} {...register("drive")}>
                  <option value="">—</option><option value="TWO_WD">2WD</option><option value="FOUR_WD">4WD</option>
                </select>
              </div>
              <Field label="Weight (kg)" type="number" step="any" inputMode="decimal" error={err("weightKg")} {...register("weightKg")} />
              <Field label="Mileage (km)" type="number" inputMode="numeric" error={err("mileageKm")} {...register("mileageKm")} />
            </div>

            <div className="mt-6">
              <p className={label}>Extra specifications</p>
              <p className="mb-3 text-xs">Anything else buyers should know, e.g. “Compatible with” → “Toyota Camry 2012–2017”.</p>
              <div className="space-y-2">
                {specs.fields.map((f, i) => (
                  <div key={f.id} className="flex gap-2">
                    <input aria-label={`Spec name ${i + 1}`} placeholder="Name" className={cn(inputCls, "w-2/5")} {...register(`specs.${i}.key`)} />
                    <input aria-label={`Spec value ${i + 1}`} placeholder="Value" className={inputCls} {...register(`specs.${i}.value`)} />
                    <button type="button" aria-label="Remove spec" onClick={() => specs.remove(i)} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl hover:bg-brand/10 hover:text-brand"><X className="h-4 w-4" /></button>
                  </div>
                ))}
              </div>
              <Button type="button" variant="ghost" size="sm" className="mt-3" onClick={() => specs.append({ key: "", value: "" })}><Plus className="h-4 w-4" /> Add specification</Button>
            </div>
          </Section>

          <Section title="Description">
            <Controller control={control} name="description" render={({ field }) => <RichText value={(field.value as string) ?? ""} onChange={field.onChange} />} />
            <div className="mt-5">
              <label htmlFor="included" className={label}>What is included</label>
              <textarea id="included" rows={3} className={cn(inputCls, "h-auto py-3")} placeholder="Alternator, A/C compressor, wiring harness, ECU…" {...register("included")} />
            </div>
          </Section>

          <Section title="Search engine listing" hint="Optional. Leave blank to use the title and description.">
            <div className="space-y-4">
              <div>
                <Field label="SEO title" error={err("seoTitle")} {...register("seoTitle")} />
                <p className="mt-1 text-xs">{String(watch("seoTitle") ?? "").length}/70</p>
              </div>
              <div>
                <label htmlFor="seoDescription" className={label}>SEO description</label>
                <textarea id="seoDescription" rows={2} className={cn(inputCls, "h-auto py-3")} {...register("seoDescription")} />
                <p className="mt-1 text-xs">{String(watch("seoDescription") ?? "").length}/170</p>
                {err("seoDescription") && <p role="alert" className="text-xs font-medium text-brand">{err("seoDescription")}</p>}
              </div>
            </div>
          </Section>
        </div>

        <div className="space-y-6">
          <Section title="Publishing">
            <label htmlFor="status" className={label}>Status</label>
            <select id="status" className={select} {...register("status")}>
              <option value="DRAFT">Draft (hidden)</option>
              <option value="PUBLISHED">Published (visible)</option>
              <option value="SOLD">Sold (shown as sold)</option>
              <option value="ARCHIVED">Archived (hidden)</option>
            </select>
            <div className="mt-5"><Controller control={control} name="featured" render={({ field }) => <Toggle checked={!!field.value} onChange={field.onChange} label="Featured" hint="Shows on the home page carousel." />} /></div>
          </Section>

          <Section title="Stock & price">
            <Field label="Quantity in stock" type="number" inputMode="numeric" error={err("stock")} {...register("stock")} />
            <div className="mt-5"><Controller control={control} name="showPrice" render={({ field }) => <Toggle checked={!!field.value} onChange={field.onChange} label="Show price publicly" hint="Off = “Price on request”. Most export buyers expect to ask." />} /></div>
            <div className="mt-4"><Field label={`Price (${currency})`} type="number" step="any" inputMode="decimal" error={err("price")} {...register("price")} /></div>
          </Section>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-silver/50 bg-white/90 px-4 py-3 backdrop-blur-xl dark:border-white/10 dark:bg-[#111214]/90 lg:left-[260px]">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-3">
          <p className="text-xs">{autosaved ? `Draft kept in this browser · ${autosaved}` : isDirty ? "Unsaved changes" : "All changes saved"}</p>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" asChild><Link href="/admin/products">Cancel</Link></Button>
            <Button type="button" variant="secondary" disabled={isSubmitting} onClick={submitWith("DRAFT")}>Save as draft</Button>
            <Button type="button" disabled={isSubmitting} onClick={status === "PUBLISHED" ? onSubmit : submitWith("PUBLISHED")}>{isSubmitting ? "Saving…" : status === "PUBLISHED" ? "Save changes" : "Publish"}</Button>
          </div>
        </div>
      </div>
    </form>
  );
}
