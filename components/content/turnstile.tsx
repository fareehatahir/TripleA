"use client";
import { useEffect, useRef } from "react";

declare global {
  interface Window { turnstile?: { render: (el: HTMLElement, o: { sitekey: string; callback: (t: string) => void; "expired-callback": () => void }) => string; remove: (id: string) => void } }
}

/** Renders the Turnstile widget when a site key is configured; otherwise nothing. */
export function Turnstile({ onToken }: { onToken: (t: string) => void }) {
  const key = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!key || !box.current) return;
    let id: string | undefined;
    const mount = () => { if (box.current && window.turnstile && !id) id = window.turnstile.render(box.current, { sitekey: key, callback: onToken, "expired-callback": () => onToken("") }); };
    if (window.turnstile) mount();
    else {
      const s = document.createElement("script");
      s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      s.async = true;
      s.onload = mount;
      document.head.appendChild(s);
    }
    return () => { if (id) window.turnstile?.remove(id); };
  }, [key, onToken]);
  return key ? <div ref={box} className="mt-4" /> : null;
}
