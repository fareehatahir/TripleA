"use client";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, ImageOff, Maximize2, PlayCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type Img = { url: string; thumbUrl: string | null; blur: string | null; alt: string; caption?: string | null };

export function youtubeId(url: string) {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
  return m?.[1] ?? null;
}

export function Lightbox({ images, index, onIndex, onClose }: { images: Img[]; index: number; onIndex: (i: number) => void; onClose: () => void }) {
  const start = useRef<number | null>(null);
  const go = useCallback((d: number) => onIndex((index + d + images.length) % images.length), [index, images.length, onIndex]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const h = (e: KeyboardEvent) => (e.key === "Escape" ? onClose() : e.key === "ArrowRight" ? go(1) : e.key === "ArrowLeft" && go(-1));
    window.addEventListener("keydown", h);
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", h); };
  }, [go, onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-[95] flex flex-col bg-black/95"
      role="dialog" aria-modal="true" aria-label="Photo viewer"
      onPointerDown={(e) => (start.current = e.clientX)}
      onPointerUp={(e) => { if (start.current !== null && Math.abs(e.clientX - start.current) > 60) go(e.clientX < start.current ? 1 : -1); start.current = null; }}
    >
      <div className="flex items-center justify-between p-4 text-white">
        <span className="text-sm">{index + 1} / {images.length}</span>
        <button onClick={onClose} aria-label="Close viewer" autoFocus className="grid h-11 w-11 place-items-center rounded-full bg-white/10 hover:bg-white/25"><X className="h-6 w-6" /></button>
      </div>
      <div className="relative flex-1" onClick={onClose}>
        <Image src={images[index].url} alt={images[index].alt} fill sizes="100vw" className="object-contain" priority onClick={(e) => e.stopPropagation()} draggable={false} />
      </div>
      {images[index].caption && <p className="px-6 pb-5 text-center text-sm text-white/90">{images[index].caption}</p>}
      {images.length > 1 && (
        <>
          <button onClick={() => go(-1)} aria-label="Previous photo" className="absolute left-3 top-1/2 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white hover:bg-white/25"><ChevronLeft className="h-6 w-6" /></button>
          <button onClick={() => go(1)} aria-label="Next photo" className="absolute right-3 top-1/2 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white hover:bg-white/25"><ChevronRight className="h-6 w-6" /></button>
        </>
      )}
    </div>,
    document.body
  );
}

export function Gallery({ images, video, title }: { images: Img[]; video?: string | null; title: string }) {
  const [i, setI] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);
  const [showVideo, setShowVideo] = useState(false);
  const yt = video ? youtubeId(video) : null;
  const img = images[i];

  if (!img && !video)
    return <div className="grid aspect-[4/3] place-items-center rounded-3xl bg-mist text-silver"><ImageOff className="h-16 w-16" aria-label="No photo available" /></div>;

  return (
    <div>
      <div
        className="group relative aspect-[4/3] cursor-zoom-in overflow-hidden rounded-3xl bg-mist"
        onMouseMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 }); }}
        onMouseLeave={() => setZoom(null)}
        onClick={() => (showVideo ? undefined : img && setLightbox(true))}
      >
        {showVideo && yt ? (
          <iframe className="absolute inset-0 h-full w-full" src={`https://www.youtube-nocookie.com/embed/${yt}?rel=0`} title={`${title} video`} allow="accelerometer; encrypted-media; picture-in-picture" allowFullScreen />
        ) : (
          img && (
            <Image
              src={img.url} alt={img.alt} fill priority quality={70} sizes="(min-width:1024px) 55vw, 100vw"
              placeholder={img.blur ? "blur" : "empty"} blurDataURL={img.blur ?? undefined}
              className="object-cover transition-transform duration-200 will-change-transform"
              style={zoom ? { transform: "scale(1.8)", transformOrigin: `${zoom.x}% ${zoom.y}%` } : undefined}
            />
          )
        )}
        {!showVideo && img && (
          <button onClick={(e) => (e.stopPropagation(), setLightbox(true))} aria-label="Open full-screen viewer" className="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-full bg-white/90 shadow-soft transition hover:bg-white"><Maximize2 className="h-5 w-5" /></button>
        )}
      </div>

      {(images.length > 1 || video) && (
        <ul className="mt-3 flex gap-2 overflow-x-auto pb-1" aria-label="Photos">
          {images.map((m, n) => (
            <li key={m.url}>
              <button onClick={() => (setShowVideo(false), setI(n))} aria-label={`Show photo ${n + 1}`} aria-current={!showVideo && n === i} className={cn("relative block h-16 w-24 overflow-hidden rounded-xl ring-2 transition", !showVideo && n === i ? "ring-brand" : "opacity-70 ring-transparent hover:opacity-100")}>
                <Image src={m.thumbUrl ?? m.url} alt="" fill sizes="96px" className="object-cover" />
              </button>
            </li>
          ))}
          {video && (
            <li>
              {yt ? (
                <button onClick={() => setShowVideo(true)} aria-label="Play video" aria-current={showVideo} className={cn("grid h-16 w-24 place-items-center rounded-xl bg-charcoal text-white ring-2 transition", showVideo ? "ring-brand" : "ring-transparent hover:bg-graphite")}><PlayCircle className="h-7 w-7" /></button>
              ) : (
                <a href={video} target="_blank" rel="noopener noreferrer" aria-label="Watch video (opens in a new tab)" className="grid h-16 w-24 place-items-center rounded-xl bg-charcoal text-white hover:bg-graphite"><PlayCircle className="h-7 w-7" /></a>
              )}
            </li>
          )}
        </ul>
      )}
      {lightbox && <Lightbox images={images} index={i} onIndex={setI} onClose={() => setLightbox(false)} />}
    </div>
  );
}
