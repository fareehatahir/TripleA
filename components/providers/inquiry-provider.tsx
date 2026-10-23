"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type InquiryItem = { id: string; slug: string; title: string; sku: string; qty: number; note: string };
type NewItem = Omit<InquiryItem, "qty" | "note">;

type Ctx = {
  items: InquiryItem[];
  count: number;
  add: (item: NewItem, qty?: number, note?: string) => void;
  remove: (id: string) => void;
  setQty: (id: string, qty: number) => void;
  setNote: (id: string, note: string) => void;
  clear: () => void;
  has: (id: string) => boolean;
  toast: string | null;
  drawerOpen: boolean;
  setDrawerOpen: (v: boolean) => void;
};

const InquiryContext = createContext<Ctx | null>(null);
const KEY = "ta-inquiry-v2";

export function InquiryProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<InquiryItem[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {}
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(items));
    } catch {}
  }, [items, ready]);

  // Keep several tabs in sync
  useEffect(() => {
    const h = (e: StorageEvent) => {
      if (e.key === KEY && e.newValue) setItems(JSON.parse(e.newValue));
    };
    window.addEventListener("storage", h);
    return () => window.removeEventListener("storage", h);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const add = useCallback((item: NewItem, qty = 1, note = "") => {
    setItems((prev) => {
      const found = prev.find((p) => p.id === item.id);
      if (found) return prev.map((p) => (p.id === item.id ? { ...p, qty: Math.min(9999, p.qty + qty), note: note || p.note } : p));
      return [...prev, { ...item, qty, note }];
    });
    setToast(`Added “${item.title}” to your inquiry list`);
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      items,
      count: items.reduce((n, i) => n + i.qty, 0),
      add,
      remove: (id) => setItems((p) => p.filter((i) => i.id !== id)),
      setQty: (id, qty) => setItems((p) => p.map((i) => (i.id === id ? { ...i, qty: Math.min(9999, Math.max(1, Math.floor(qty) || 1)) } : i))),
      setNote: (id, note) => setItems((p) => p.map((i) => (i.id === id ? { ...i, note: note.slice(0, 500) } : i))),
      clear: () => setItems([]),
      has: (id) => items.some((i) => i.id === id),
      toast,
      drawerOpen,
      setDrawerOpen,
    }),
    [items, add, toast, drawerOpen]
  );

  return <InquiryContext.Provider value={value}>{children}</InquiryContext.Provider>;
}

export function useInquiry() {
  const ctx = useContext(InquiryContext);
  if (!ctx) throw new Error("useInquiry must be used inside InquiryProvider");
  return ctx;
}
