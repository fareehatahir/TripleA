"use client";
import { useEffect } from "react";

/** Flags <html data-hydrated> once React is interactive. Lets end-to-end tests (and debugging) know clicks will register. */
export function HydrationMarker() {
  useEffect(() => {
    document.documentElement.dataset.hydrated = "true";
  }, []);
  return null;
}
