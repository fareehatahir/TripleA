"use client";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FilterBody, type FacetData } from "./filters";

/** Mobile bottom sheet. Loaded on demand, only after someone taps "Filters". */
export function FilterSheet({ facets, total, onClose }: { facets: FacetData; total: number; onClose: () => void }) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", h);
    };
  }, [onClose]);

  return (
    <motion.div className="fixed inset-0 z-[80] bg-charcoal/50 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={onClose}>
      <motion.div
        role="dialog" aria-modal="true" aria-label="Filters"
        initial={{ y: "100%" }} animate={{ y: 0 }} transition={{ type: "tween", duration: 0.28 }}
        onClick={(e) => e.stopPropagation()}
        className="absolute inset-x-0 bottom-0 flex max-h-[88vh] flex-col rounded-t-3xl bg-white"
      >
        <div className="flex items-center justify-between border-b border-silver/50 px-5 py-4">
          <h2 className="text-lg font-bold">Filters</h2>
          <button onClick={onClose} aria-label="Close filters" className="grid h-10 w-10 place-items-center rounded-xl hover:bg-mist"><X className="h-5 w-5" /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4"><FilterBody facets={facets} /></div>
        <div className="border-t border-silver/50 p-4"><Button size="lg" className="w-full" onClick={onClose}>Show {total} result{total === 1 ? "" : "s"}</Button></div>
      </motion.div>
    </motion.div>
  );
}
