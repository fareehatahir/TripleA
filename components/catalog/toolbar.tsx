"use client";
import { LayoutGrid, List } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCatalog } from "./catalog-shell";
import { SearchBox } from "./search-box";

export function CatalogToolbar({ filtersButton }: { filtersButton: React.ReactNode }) {
  const { filters: f, apply } = useCatalog();
  return (
    <div className="flex flex-wrap items-center gap-3">
      <SearchBox className="min-w-[14rem] flex-1" initial={f.q ?? ""} onSubmit={(q) => apply({ q: q || undefined })} />
      {filtersButton}
      <label className="flex items-center gap-2 text-sm">
        <span className="sr-only sm:not-sr-only">Sort</span>
        <select aria-label="Sort products" value={f.sort} onChange={(e) => apply({ sort: e.target.value as typeof f.sort })} className="h-12 rounded-xl border border-silver/70 bg-white px-3 text-sm font-medium text-charcoal hover:border-charcoal focus:border-brand">
          <option value="new">Newest</option><option value="az">Name A–Z</option><option value="stock">Most stock</option>
        </select>
      </label>
      <div className="flex rounded-xl border border-silver/70 bg-white p-1" role="group" aria-label="View">
        {([["grid", LayoutGrid, "Grid view"], ["list", List, "List view"]] as const).map(([v, Icon, label]) => (
          <button key={v} aria-label={label} aria-pressed={f.view === v} onClick={() => apply({ view: v, page: f.page })} className={cn("grid h-10 w-10 place-items-center rounded-lg transition", f.view === v ? "bg-charcoal text-white" : "hover:bg-mist")}><Icon className="h-4 w-4" /></button>
        ))}
      </div>
    </div>
  );
}
