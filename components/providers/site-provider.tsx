"use client";
import { createContext, useCallback, useContext } from "react";
import type { SiteConfig } from "@/lib/content";
import { whatsappLink } from "@/lib/site";

const Ctx = createContext<SiteConfig | null>(null);

/** Editable site details (phone, WhatsApp, social…) from Admin > Content > Site & contact. */
export function SiteProvider({ value, children }: { value: SiteConfig; children: React.ReactNode }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSite() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useSite must be used inside SiteProvider");
  return v;
}

/** wa.me link builder bound to the configured WhatsApp number. */
export function useWhatsapp() {
  const { whatsapp } = useSite();
  return useCallback((text?: string) => whatsappLink(text, whatsapp), [whatsapp]);
}
