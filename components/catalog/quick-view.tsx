"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ProductSummary } from "@/lib/catalog";
import { cn } from "@/lib/utils";
import { AddToInquiry, StockBadge } from "./product-card";

export function QuickView({ p, onClose }: { p: ProductSummary; onClose: () => void }) {
  const [i, setI] = useState(0);
  const close = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    close.current?.focus();
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", h);
    };
  }, [onClose]);

  const img = p.images[i];
  return createPortal(
    <div className="fixed inset-0 z-[90] grid place-items-center bg-charcoal/70 p-4 backdrop-blur-sm" onMouseDown={onClose}>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        role="dialog"
        aria-modal="true"
        aria-label={`Quick view: ${p.title}`}
        onMouseDown={(e) => e.stopPropagation()}
        className="grid max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white shadow-lift md:grid-cols-2"
      >
        <div className="bg-mist p-4">
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-white">
            {img && <Image src={img.url} alt={img.alt} fill sizes="(min-width:768px) 420px, 90vw" className="object-cover" placeholder={img.blur ? "blur" : "empty"} blurDataURL={img.blur ?? undefined} />}
          </div>
          {p.images.length > 1 && (
            <ul className="mt-3 flex gap-2 overflow-x-auto">
              {p.images.map((m, n) => (
                <li key={m.url}>
                  <button onClick={() => setI(n)} aria-label={`Photo ${n + 1}`} aria-current={n === i} className={cn("relative block h-14 w-20 overflow-hidden rounded-lg ring-2 transition", n === i ? "ring-brand" : "ring-transparent opacity-70 hover:opacity-100")}>
                    <Image src={m.thumbUrl ?? m.url} alt="" fill sizes="80px" className="object-cover" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="flex flex-col p-6 md:p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-brand">{p.make ?? p.category} · {p.sku}</p>
              <h2 className="mt-1 text-2xl font-bold leading-tight">{p.title}</h2>
            </div>
            <button ref={close} onClick={onClose} aria-label="Close quick view" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl hover:bg-mist"><X className="h-5 w-5" /></button>
          </div>
          <div className="mt-3"><StockBadge stock={p.stock} status={p.status} inline /></div>
          {p.chips.length > 0 && <ul className="mt-4 flex flex-wrap gap-1.5">{p.chips.map((c) => <li key={c} className="rounded-md bg-mist px-2 py-1 text-xs font-medium text-graphite">{c}</li>)}</ul>}
          {p.excerpt && <p className="mt-4 text-sm leading-relaxed">{p.excerpt}{p.excerpt.length >= 180 ? "…" : ""}</p>}
          <p className="mt-4 font-semibold text-charcoal">{p.price !== null ? `${p.currency} ${p.price.toLocaleString()}` : "Price on request"}</p>
          <div className="mt-auto flex flex-wrap gap-3 pt-6">
            <AddToInquiry p={p} size="md" className="flex-1" />
            <Button asChild variant="ghost"><Link href={`/product/${p.slug}`} onClick={onClose}>Full details <ArrowRight className="h-4 w-4" /></Link></Button>
          </div>
        </div>
      </motion.div>
    </div>,
    document.body
  );
}
