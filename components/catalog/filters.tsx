"use client";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useCatalog } from "./catalog-shell";

export type FacetData = {
  categories: { name: string; slug: string; count: number }[];
  makes: { name: string; slug: string; count: number; models: { name: string; slug: string }[] }[];
};

const field = "h-10 w-full rounded-lg border border-silver/70 bg-white px-3 text-sm text-charcoal transition hover:border-charcoal focus:border-brand";

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="border-b border-silver/40 py-5 first:pt-0 last:border-0">
      <legend className="mb-3 text-sm font-bold text-charcoal">{title}</legend>
      {children}
    </fieldset>
  );
}

function Radio({ name, checked, onChange, label, count }: { name: string; checked: boolean; onChange: () => void; label: string; count?: number }) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm hover:bg-mist">
      <input type="radio" name={name} checked={checked} onChange={onChange} className="h-4 w-4 accent-brand" />
      <span className="flex-1">{label}</span>
      {count !== undefined && <span className="text-xs text-graphite/70">{count}</span>}
    </label>
  );
}

/** Text/number input that applies after a short pause. */
function DebouncedInput({ value, onCommit, ...p }: { value: string; onCommit: (v: string) => void } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value">) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  useEffect(() => {
    if (v === value) return;
    const t = setTimeout(() => onCommit(v), 600);
    return () => clearTimeout(t);
  }, [v]); // eslint-disable-line react-hooks/exhaustive-deps
  return <input {...p} value={v} onChange={(e) => setV(e.target.value)} onBlur={() => v !== value && onCommit(v)} className={field} />;
}

const numOrUndef = (v: string) => (v === "" || Number.isNaN(Number(v)) ? undefined : Number(v));

export function FilterBody({ facets }: { facets: FacetData }) {
  const { filters: f, apply } = useCatalog();
  const make = facets.makes.find((m) => m.slug === f.make);
  const active = [f.q, f.category, f.make, f.model, f.part, f.code, f.yearMin, f.yearMax, f.dispMin, f.dispMax, f.fuel, f.transmission, f.drive, f.condition, f.inStock].some((v) => v !== undefined && v !== false);

  return (
    <div>
      {active && (
        <Button variant="ghost" size="sm" className="mb-4 w-full" onClick={() => apply({ q: undefined, category: undefined, make: undefined, model: undefined, part: undefined, code: undefined, yearMin: undefined, yearMax: undefined, dispMin: undefined, dispMax: undefined, fuel: undefined, transmission: undefined, drive: undefined, condition: undefined, inStock: false })}>
          <X className="h-4 w-4" /> Clear all filters
        </Button>
      )}
      <Group title="Category">
        <Radio name="cat" checked={!f.category} onChange={() => apply({ category: undefined })} label="All categories" />
        {facets.categories.map((c) => <Radio key={c.slug} name="cat" checked={f.category === c.slug} onChange={() => apply({ category: c.slug })} label={c.name} count={c.count} />)}
      </Group>
      <Group title="Make">
        <div className="max-h-56 overflow-y-auto pr-1">
          <Radio name="make" checked={!f.make} onChange={() => apply({ make: undefined, model: undefined })} label="All makes" />
          {facets.makes.map((m) => <Radio key={m.slug} name="make" checked={f.make === m.slug} onChange={() => apply({ make: m.slug, model: undefined })} label={m.name} count={m.count} />)}
        </div>
        {make && make.models.length > 0 && (
          <div className="mt-3">
            <label htmlFor="f-model" className="mb-1 block text-xs font-semibold">Model</label>
            <select id="f-model" className={field} value={f.model ?? ""} onChange={(e) => apply({ model: e.target.value || undefined })}>
              <option value="">All {make.name} models</option>
              {make.models.map((m) => <option key={m.slug} value={m.slug}>{m.name}</option>)}
            </select>
          </div>
        )}
      </Group>
      <Group title="Year">
        <div className="grid grid-cols-2 gap-2">
          <DebouncedInput aria-label="Year from" placeholder="From" inputMode="numeric" value={f.yearMin?.toString() ?? ""} onCommit={(v) => apply({ yearMin: numOrUndef(v) })} />
          <DebouncedInput aria-label="Year to" placeholder="To" inputMode="numeric" value={f.yearMax?.toString() ?? ""} onCommit={(v) => apply({ yearMax: numOrUndef(v) })} />
        </div>
      </Group>
      <Group title="Engine">
        <label htmlFor="f-code" className="mb-1 block text-xs font-semibold">Engine code</label>
        <DebouncedInput id="f-code" placeholder="e.g. 2GR-FE" value={f.code ?? ""} onCommit={(v) => apply({ code: v || undefined })} />
        <p className="mb-1 mt-3 text-xs font-semibold">Displacement (cc)</p>
        <div className="grid grid-cols-2 gap-2">
          <DebouncedInput aria-label="Displacement min" placeholder="Min" inputMode="numeric" value={f.dispMin?.toString() ?? ""} onCommit={(v) => apply({ dispMin: numOrUndef(v) })} />
          <DebouncedInput aria-label="Displacement max" placeholder="Max" inputMode="numeric" value={f.dispMax?.toString() ?? ""} onCommit={(v) => apply({ dispMax: numOrUndef(v) })} />
        </div>
      </Group>
      <Group title="Fuel">
        <div className="flex flex-wrap gap-2">
          {([["PETROL", "Petrol"], ["DIESEL", "Diesel"], ["HYBRID", "Hybrid"]] as const).map(([v, l]) => (
            <button key={v} aria-pressed={f.fuel === v} onClick={() => apply({ fuel: f.fuel === v ? undefined : v })} className={cn("rounded-full border px-3.5 py-1.5 text-sm font-medium transition", f.fuel === v ? "border-brand bg-brand text-white" : "border-silver hover:border-charcoal")}>{l}</button>
          ))}
        </div>
      </Group>
      <Group title="Transmission">
        <div className="flex flex-wrap gap-2">
          {([["AT", "Automatic"], ["MT", "Manual"], ["CVT", "CVT"]] as const).map(([v, l]) => (
            <button key={v} aria-pressed={f.transmission === v} onClick={() => apply({ transmission: f.transmission === v ? undefined : v })} className={cn("rounded-full border px-3.5 py-1.5 text-sm font-medium transition", f.transmission === v ? "border-brand bg-brand text-white" : "border-silver hover:border-charcoal")}>{l}</button>
          ))}
        </div>
      </Group>
      <Group title="Drive">
        <div className="flex gap-2">
          {([["TWO_WD", "2WD"], ["FOUR_WD", "4WD"]] as const).map(([v, l]) => (
            <button key={v} aria-pressed={f.drive === v} onClick={() => apply({ drive: f.drive === v ? undefined : v })} className={cn("rounded-full border px-3.5 py-1.5 text-sm font-medium transition", f.drive === v ? "border-brand bg-brand text-white" : "border-silver hover:border-charcoal")}>{l}</button>
          ))}
        </div>
      </Group>
      <Group title="Condition">
        <select aria-label="Condition" className={field} value={f.condition ?? ""} onChange={(e) => apply({ condition: e.target.value || undefined })}>
          <option value="">Any condition</option><option value="USED">Used</option><option value="REBUILT">Rebuilt</option><option value="NEW">New</option>
        </select>
        <label className="mt-4 flex cursor-pointer items-center gap-2.5 text-sm font-medium">
          <input type="checkbox" checked={!!f.inStock} onChange={(e) => apply({ inStock: e.target.checked })} className="h-4 w-4 accent-brand" /> In stock only
        </label>
      </Group>
    </div>
  );
}

const FilterSheet = dynamic(() => import("./filter-sheet").then((m) => m.FilterSheet), { ssr: false });

export function CatalogFilters({ facets, total }: { facets: FacetData; total: number }) {
  const [sheet, setSheet] = useState(false);
  return (
    <>
      <aside className="hidden lg:block" aria-label="Filters">
        <div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto rounded-2xl bg-white p-5 shadow-soft ring-1 ring-silver/40"><FilterBody facets={facets} /></div>
      </aside>

      <Button variant="ghost" className="lg:hidden" onClick={() => setSheet(true)}><SlidersHorizontal className="h-4 w-4" /> Filters</Button>
      {sheet && <FilterSheet facets={facets} total={total} onClose={() => setSheet(false)} />}
    </>
  );
}
