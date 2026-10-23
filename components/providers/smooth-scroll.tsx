"use client";
import { useEffect } from "react";

export function SmoothScroll({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    let destroy: (() => void) | undefined;
    let cancelled = false;
    // Loaded lazily so the smooth-scroll library is not part of the initial JavaScript.
    const start = async () => {
      const { default: Lenis } = await import("lenis");
      if (cancelled) return;
      const lenis = new Lenis({ duration: 1.1, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)) });
      const loop = (time: number) => {
        lenis.raf(time);
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
      destroy = () => lenis.destroy();
    };
    const idle = (window as unknown as { requestIdleCallback?: (cb: () => void) => number }).requestIdleCallback;
    const t = idle ? idle(start) : window.setTimeout(start, 600);
    return () => {
      cancelled = true;
      if (!idle) clearTimeout(t);
      cancelAnimationFrame(raf);
      destroy?.();
    };
  }, []);
  return <>{children}</>;
}
