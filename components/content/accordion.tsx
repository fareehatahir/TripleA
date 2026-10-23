"use client";
import { useId, useState } from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export function Accordion({ items }: { items: { q: string; a: React.ReactNode }[] }) {
  const [open, setOpen] = useState<number | null>(0);
  const uid = useId();
  return (
    <div className="divide-y divide-silver/50 overflow-hidden rounded-2xl bg-white ring-1 ring-silver/50">
      {items.map((it, i) => {
        const isOpen = open === i;
        return (
          <div key={i}>
            <h3>
              <button
                id={`${uid}-h${i}`}
                aria-expanded={isOpen}
                aria-controls={`${uid}-p${i}`}
                onClick={() => setOpen(isOpen ? null : i)}
                className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left font-display text-base font-semibold text-charcoal transition hover:bg-mist/60"
              >
                {it.q}
                <Plus className={cn("h-5 w-5 shrink-0 text-brand transition-transform duration-300", isOpen && "rotate-45")} />
              </button>
            </h3>
            <div id={`${uid}-p${i}`} role="region" aria-labelledby={`${uid}-h${i}`} className={cn("grid transition-all duration-300", isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
              <div className="overflow-hidden"><div className="px-6 pb-6 text-sm leading-relaxed">{it.a}</div></div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
