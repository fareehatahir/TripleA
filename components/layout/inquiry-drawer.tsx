"use client";
import Link from "next/link";
import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ClipboardList, Minus, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useInquiry } from "@/components/providers/inquiry-provider";

/** Slide-in mini list opened from the header button. */
export function InquiryDrawer() {
  const { items, drawerOpen, setDrawerOpen, setQty, remove } = useInquiry();
  useEffect(() => {
    if (!drawerOpen) return;
    const h = (e: KeyboardEvent) => e.key === "Escape" && setDrawerOpen(false);
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [drawerOpen, setDrawerOpen]);

  return (
    <AnimatePresence>
      {drawerOpen && (
        <motion.div className="fixed inset-0 z-[85] bg-charcoal/50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDrawerOpen(false)}>
          <motion.aside
            role="dialog" aria-modal="true" aria-label="Inquiry list"
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "tween", duration: 0.28 }}
            onClick={(e) => e.stopPropagation()}
            className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-white shadow-lift"
          >
            <div className="flex items-center justify-between border-b border-silver/50 px-6 py-5">
              <h2 className="text-lg font-bold">Inquiry list ({items.length})</h2>
              <button onClick={() => setDrawerOpen(false)} aria-label="Close inquiry list" className="grid h-10 w-10 place-items-center rounded-xl hover:bg-mist"><X className="h-5 w-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {items.length === 0 ? (
                <div className="grid h-full place-items-center text-center">
                  <div><ClipboardList className="mx-auto h-10 w-10 text-silver" /><p className="mt-3 font-semibold text-charcoal">Nothing here yet</p><p className="mt-1 text-sm">Use “Add to Inquiry” on any product.</p></div>
                </div>
              ) : (
                <ul className="divide-y divide-silver/40">
                  {items.map((it) => (
                    <li key={it.id} className="flex items-center gap-3 py-4">
                      <div className="min-w-0 flex-1"><Link href={`/product/${it.slug}`} onClick={() => setDrawerOpen(false)} className="line-clamp-2 text-sm font-semibold text-charcoal hover:text-brand">{it.title}</Link><p className="text-xs">{it.sku}</p></div>
                      <div className="flex items-center rounded-lg border border-silver/70">
                        <button aria-label={`Decrease ${it.title}`} onClick={() => setQty(it.id, it.qty - 1)} className="grid h-8 w-8 place-items-center hover:bg-mist"><Minus className="h-3.5 w-3.5" /></button>
                        <span className="w-8 text-center text-sm font-semibold">{it.qty}</span>
                        <button aria-label={`Increase ${it.title}`} onClick={() => setQty(it.id, it.qty + 1)} className="grid h-8 w-8 place-items-center hover:bg-mist"><Plus className="h-3.5 w-3.5" /></button>
                      </div>
                      <button aria-label={`Remove ${it.title}`} onClick={() => remove(it.id)} className="grid h-8 w-8 place-items-center rounded-lg text-brand hover:bg-brand/10"><Trash2 className="h-4 w-4" /></button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="border-t border-silver/50 p-6">
              <Button asChild size="lg" className="w-full"><Link href="/inquiry" onClick={() => setDrawerOpen(false)}>Review &amp; send inquiry</Link></Button>
            </div>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
