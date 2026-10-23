"use client";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Check, Eye, ImageOff, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useInquiry } from "@/components/providers/inquiry-provider";
import type { ProductSummary } from "@/lib/catalog";
import { cn } from "@/lib/utils";
import dynamic from "next/dynamic";

// Only downloaded when someone opens a quick view (keeps the animation library out of the catalog's first load)
const QuickView = dynamic(() => import("./quick-view").then((m) => m.QuickView), { ssr: false });

/** On photos it is a solid pill; `inline` is the calmer version used on white/grey surfaces. Every colour pair passes WCAG AA. */
export function StockBadge({ stock, status, className, inline }: { stock: number; status: string; className?: string; inline?: boolean }) {
  const sold = status === "SOLD" || stock === 0;
  const low = !sold && stock <= 2;
  const tone = inline
    ? sold ? "bg-graphite text-white" : low ? "bg-brand/10 text-brand" : "bg-mist text-charcoal"
    : sold ? "bg-graphite text-white" : low ? "bg-brand text-white" : "bg-white text-charcoal shadow-soft";
  return <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", tone, className)}>{sold ? "Sold" : low ? `Only ${stock} left` : "In stock"}</span>;
}

export function CardImage({ p, sizes, className, priority }: { p: ProductSummary; sizes: string; className?: string; priority?: boolean }) {
  const img = p.images[0];
  return img ? (
    <Image
      src={img.url}
      alt={img.alt}
      fill
      sizes={sizes}
      priority={priority}
      placeholder={img.blur ? "blur" : "empty"}
      blurDataURL={img.blur ?? undefined}
      quality={68}
      className={cn("object-cover transition duration-500 group-hover:scale-105", className)}
    />
  ) : (
    <span className="absolute inset-0 grid place-items-center text-silver"><ImageOff className="h-10 w-10" aria-label="No photo" /></span>
  );
}

export function AddToInquiry({ p, size = "sm", className }: { p: ProductSummary; size?: "sm" | "md"; className?: string }) {
  const { add, has } = useInquiry();
  const sold = p.status === "SOLD" || p.stock === 0;
  const added = has(p.id);
  return (
    <Button size={size} className={className} variant={added ? "secondary" : "primary"} onClick={() => add({ id: p.id, slug: p.slug, title: p.title, sku: p.sku })}>
      {added ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />} {sold ? "Ask about similar" : added ? "Added · add more" : "Add to Inquiry"}
    </Button>
  );
}

export function ProductCard({ p, view = "grid", priority }: { p: ProductSummary; view?: "grid" | "list"; priority?: boolean }) {
  const [quick, setQuick] = useState(false);
  const list = view === "list";
  return (
    <>
      <article className={cn("group overflow-hidden rounded-2xl bg-white shadow-soft ring-1 ring-silver/40 transition duration-300 hover:-translate-y-1 hover:shadow-lift", list && "sm:flex")}>
        <div className={cn("relative aspect-[4/3] overflow-hidden bg-mist", list && "sm:aspect-auto sm:w-72 sm:shrink-0")}>
          {/* decorative duplicate of the title link below; hidden from keyboard and screen readers so each product is announced once */}
          <Link href={`/product/${p.slug}`} tabIndex={-1} aria-hidden className="absolute inset-0">
            <CardImage p={p} priority={priority} sizes={list ? "(min-width:640px) 288px, 100vw" : "(min-width:1280px) 320px, (min-width:640px) 45vw, 100vw"} />
          </Link>
          <span className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-charcoal">{p.sku}</span>
          <StockBadge stock={p.stock} status={p.status} className="absolute right-3 top-3" />
        </div>
        <div className="flex flex-1 flex-col p-5">
          {p.make && <p className="text-xs font-semibold uppercase tracking-wider text-brand">{p.make}</p>}
          <h3 className="mt-1 line-clamp-2 text-base font-bold leading-snug">
            <Link href={`/product/${p.slug}`} className="hover:text-brand">{p.title}</Link>
          </h3>
          {list && p.excerpt && <p className="mt-2 line-clamp-2 hidden text-sm sm:block">{p.excerpt}</p>}
          {p.chips.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {p.chips.slice(0, 5).map((c) => <li key={c} className="rounded-md bg-mist px-2 py-1 text-xs font-medium text-graphite">{c}</li>)}
            </ul>
          )}
          <p className="mt-3 text-sm font-semibold text-charcoal">{p.price !== null ? `${p.currency} ${p.price.toLocaleString()}` : "Price on request"}</p>
          <div className="mt-auto flex gap-2 pt-4">
            <AddToInquiry p={p} className="flex-1" />
            <Button size="sm" variant="ghost" onClick={() => setQuick(true)} aria-label={`Quick view ${p.title}`} title="Quick view" className="px-3"><Eye className="h-4 w-4" /></Button>
          </div>
        </div>
      </article>
      {quick && <QuickView p={p} onClose={() => setQuick(false)} />}
    </>
  );
}

export function ProductCardSkeleton({ list }: { list?: boolean }) {
  return (
    <div className={cn("overflow-hidden rounded-2xl bg-white ring-1 ring-silver/40", list && "sm:flex")} aria-hidden>
      <div className={cn("aspect-[4/3] animate-pulse bg-mist", list && "sm:w-72 sm:shrink-0")} />
      <div className="flex-1 space-y-3 p-5">
        <div className="h-3 w-1/4 animate-pulse rounded bg-mist" />
        <div className="h-5 w-4/5 animate-pulse rounded bg-mist" />
        <div className="flex gap-2"><div className="h-6 w-14 animate-pulse rounded bg-mist" /><div className="h-6 w-14 animate-pulse rounded bg-mist" /></div>
        <div className="h-9 w-full animate-pulse rounded-xl bg-mist" />
      </div>
    </div>
  );
}
