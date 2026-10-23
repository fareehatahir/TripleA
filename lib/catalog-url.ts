import type { Filters } from "@/lib/catalog";

/** Client-safe URL builder. Category (+make) become path segments for clean, indexable URLs. */
export function buildCatalogUrl(f: Partial<Filters>) {
  const qs = new URLSearchParams();
  const set = (k: string, v: string | number | undefined | null) => v !== undefined && v !== null && v !== "" && qs.set(k, String(v));
  set("q", f.q); set("model", f.model); set("part", f.part); set("code", f.code);
  set("yearMin", f.yearMin); set("yearMax", f.yearMax); set("dispMin", f.dispMin); set("dispMax", f.dispMax);
  set("fuel", f.fuel); set("transmission", f.transmission); set("drive", f.drive); set("condition", f.condition);
  if (f.inStock) qs.set("inStock", "1");
  if (f.sort && f.sort !== "new") qs.set("sort", f.sort);
  if (f.view && f.view !== "grid") qs.set("view", f.view);
  if (f.page && f.page > 1) qs.set("page", String(f.page));
  let path = "/catalog";
  if (f.category && f.make) path += `/${f.category}/${f.make}`;
  else if (f.category) path += `/${f.category}`;
  else if (f.make) qs.set("make", f.make);
  const s = qs.toString();
  return s ? `${path}?${s}` : path;
}
