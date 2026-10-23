"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { cn } from "@/lib/utils";

type Hit = { slug: string; title: string; sku: string; make: string | null; image: string | null };

/** Debounced instant search with product suggestions. */
export function SearchBox({
  initial = "", onSubmit, autoFocus, placeholder = "Search by make, model, engine code or SKU…", className, onNavigate,
}: { initial?: string; onSubmit: (q: string) => void; autoFocus?: boolean; placeholder?: string; className?: string; onNavigate?: () => void }) {
  const [q, setQ] = useState(initial);
  const [hits, setHits] = useState<Hit[]>([]);
  const [makes, setMakes] = useState<{ name: string; slug: string }[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => setQ(initial), [initial]);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) return setHits([]), setMakes([]);
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setBusy(true);
      try {
        const r = await fetch(`/api/search?q=${encodeURIComponent(term)}`, { signal: ctrl.signal });
        const j = await r.json();
        setHits(j.results ?? []);
        setMakes(j.makes ?? []);
        setOpen(true);
      } catch {}
      setBusy(false);
    }, 250);
    return () => (clearTimeout(t), ctrl.abort());
  }, [q]);

  useEffect(() => {
    const h = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <div ref={box} className={cn("relative", className)}>
      <form role="search" onSubmit={(e) => (e.preventDefault(), setOpen(false), onSubmit(q.trim()))}>
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-graphite" />
        <input
          type="search"
          value={q}
          autoFocus={autoFocus}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => hits.length && setOpen(true)}
          onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
          placeholder={placeholder}
          aria-label="Search catalog"
          autoComplete="off"
          className="h-12 w-full rounded-xl border border-silver/70 bg-white pl-12 pr-12 text-sm text-charcoal placeholder:text-graphite/60 transition hover:border-charcoal focus:border-brand"
        />
        {busy && <Loader2 className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-graphite" />}
      </form>
      {open && (hits.length > 0 || makes.length > 0) && (
        <ul className="absolute inset-x-0 top-full z-30 mt-2 overflow-hidden rounded-2xl border border-silver/60 bg-white shadow-lift" role="listbox" aria-label="Suggestions">
          {makes.map((m) => (
            <li key={m.slug}>
              <Link href={`/catalog?make=${m.slug}`} onClick={() => (setOpen(false), onNavigate?.())} className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-mist">
                <Search className="h-4 w-4 text-graphite" /> All <strong>{m.name}</strong>
              </Link>
            </li>
          ))}
          {hits.map((h) => (
            <li key={h.slug}>
              <Link href={`/product/${h.slug}`} onClick={() => (setOpen(false), onNavigate?.())} className="flex items-center gap-3 px-4 py-2.5 hover:bg-mist">
                <span className="relative h-10 w-14 shrink-0 overflow-hidden rounded-lg bg-mist">{h.image && <Image src={h.image} alt="" fill sizes="56px" className="object-cover" />}</span>
                <span className="min-w-0"><span className="block truncate text-sm font-semibold text-charcoal">{h.title}</span><span className="text-xs">{h.sku}{h.make ? ` · ${h.make}` : ""}</span></span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
