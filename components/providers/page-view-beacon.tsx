"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

/** Sends one anonymous page-view per navigation. Not rendered for signed-in admins. */
export function PageViewBeacon() {
  const path = usePathname();
  useEffect(() => {
    const body = JSON.stringify({ path });
    if (navigator.sendBeacon) navigator.sendBeacon("/api/track", new Blob([body], { type: "application/json" }));
    else fetch("/api/track", { method: "POST", body, headers: { "Content-Type": "application/json" }, keepalive: true }).catch(() => {});
  }, [path]);
  return null;
}
