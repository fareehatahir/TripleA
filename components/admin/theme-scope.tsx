"use client";
import { createContext, useCallback, useContext, useState } from "react";
import { cn } from "@/lib/utils";

type Theme = "light" | "dark";
const Ctx = createContext<{ theme: Theme; toggle: () => void }>({ theme: "light", toggle: () => {} });
export const useAdminTheme = () => useContext(Ctx);

/** Theme is kept in a cookie so the server renders the right class (no flash). Scoped to /admin only. */
export function ThemeScope({ initial, children }: { initial: Theme; children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(initial);
  const toggle = useCallback(() => {
    setTheme((t) => {
      const next = t === "dark" ? "light" : "dark";
      document.cookie = `ta-admin-theme=${next}; path=/admin; max-age=31536000; samesite=lax`;
      return next;
    });
  }, []);
  return (
    <Ctx.Provider value={{ theme, toggle }}>
      <div className={cn("min-h-screen bg-mist text-graphite dark:bg-[#111214] dark:text-silver", theme === "dark" && "dark")}>{children}</div>
    </Ctx.Provider>
  );
}
