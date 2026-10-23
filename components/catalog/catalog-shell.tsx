"use client";
import { createContext, useCallback, useContext, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Filters } from "@/lib/catalog";
import { buildCatalogUrl } from "@/lib/catalog-url";
import { ProductCardSkeleton } from "./product-card";

type Ctx = { pending: boolean; filters: Filters; apply: (patch: Partial<Filters>) => void };
const C = createContext<Ctx | null>(null);
export const useCatalog = () => {
  const c = useContext(C);
  if (!c) throw new Error("useCatalog outside CatalogShell");
  return c;
};

/** Holds filter state (mirrored in the URL) and a pending flag so results can show skeletons while the server re-renders. */
export function CatalogShell({ filters, children }: { filters: Filters; children: React.ReactNode }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const apply = useCallback(
    (patch: Partial<Filters>) => {
      const next = { ...filters, ...patch };
      if (!("page" in patch)) next.page = 1;
      if ("category" in patch && patch.category !== filters.category) next.make = patch.make ?? filters.make;
      start(() => router.replace(buildCatalogUrl(next), { scroll: false }));
    },
    [filters, router]
  );
  return <C.Provider value={{ pending, filters, apply }}>{children}</C.Provider>;
}

export function ResultsFrame({ children }: { children: React.ReactNode }) {
  const { pending, filters } = useCatalog();
  if (pending)
    return (
      <div aria-busy="true" aria-label="Loading products" className={filters.view === "list" ? "space-y-5" : "grid gap-5 sm:grid-cols-2 xl:grid-cols-3"}>
        {Array.from({ length: 6 }).map((_, i) => <ProductCardSkeleton key={i} list={filters.view === "list"} />)}
      </div>
    );
  return <>{children}</>;
}
