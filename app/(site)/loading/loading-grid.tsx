"use client";
import Image from "next/image";
import { useState } from "react";
import { Lightbox } from "@/components/catalog/gallery";

export type LoadingItem = { id: string; url: string; thumbUrl: string | null; caption: string | null; destination: string | null; date: string; width: number; height: number };

export function LoadingGrid({ items }: { items: LoadingItem[] }) {
  const [open, setOpen] = useState<number | null>(null);
  const imgs = items.map((i) => ({ url: i.url, thumbUrl: i.thumbUrl, blur: null, alt: i.caption ?? "Container loading", caption: [i.caption, i.destination, new Date(i.date).toLocaleDateString("en", { month: "long", year: "numeric" })].filter(Boolean).join(" · ") }));
  return (
    <>
      <ul className="columns-2 gap-4 md:columns-3 lg:columns-4 [&>li]:mb-4">
        {items.map((it, i) => (
          <li key={it.id} className="break-inside-avoid">
            <button onClick={() => setOpen(i)} className="group relative block w-full overflow-hidden rounded-2xl bg-mist" aria-label={`Open photo: ${it.caption ?? it.destination ?? "container loading"}`}>
              <Image src={it.thumbUrl ?? it.url} alt={it.caption ?? "Container loading"} width={it.width} height={it.height} sizes="(min-width:1024px) 25vw, (min-width:768px) 33vw, 50vw" loading={i < 4 ? "eager" : "lazy"} className="h-auto w-full transition duration-500 group-hover:scale-105" />
              {(it.destination || it.caption) && (
                <span className="absolute inset-x-0 bottom-0 translate-y-2 bg-gradient-to-t from-black/75 to-transparent p-3 text-left text-xs font-medium text-white opacity-0 transition group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:opacity-100">
                  {it.destination ?? it.caption}
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>
      {open !== null && <Lightbox images={imgs} index={open} onIndex={setOpen} onClose={() => setOpen(null)} />}
    </>
  );
}
