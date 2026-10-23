"use client";
import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Shows the optimised logo built from /public/brand/logo.png by scripts/make-brand-assets.mjs.
 * Falls back to a text wordmark if the file is missing.
 */
export function Logo({ className, tone = "light", src, priority }: { className?: string; tone?: "light" | "dark"; src?: string; priority?: boolean }) {
  const [failed, setFailed] = useState(false);

  if (src) {
    // Owner-uploaded logo (Admin > Settings): shown whole, not cropped.
    return (
      <span className={cn("relative block aspect-[1230/696]", tone === "dark" && "rounded-lg bg-white p-1", className)} aria-label="Logo">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="Logo" className="h-full w-full object-contain object-left" />
      </span>
    );
  }

  if (failed) {
    return (
      <span className={cn("inline-flex flex-col leading-none", className)} aria-label="Triple A International">
        <span className="font-display text-2xl font-extrabold italic tracking-tight">
          <span className={tone === "dark" ? "text-white" : "text-charcoal"}>Triple</span>
          <span className="text-brand">A</span>
        </span>
        <span className={cn("mt-1 text-[10px] font-semibold uppercase tracking-[0.35em]", tone === "dark" ? "text-silver" : "text-graphite")}>
          International
        </span>
      </span>
    );
  }

  return (
    <span className={cn("relative block aspect-[1230/696]", tone === "dark" && "rounded-lg bg-white p-1", className)} aria-label="Triple A International">
      <Image
        src="/brand/logo-wide.webp"
        alt="Triple A International – Used Cars, Parts, Export"
        fill
        priority={priority}
        sizes="(min-width: 768px) 160px, 132px"
        onError={() => setFailed(true)}
        className="object-contain"
      />
    </span>
  );
}
