"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { LogOut, Menu, Moon, Search, Sun, X } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { useAdminTheme } from "@/components/admin/theme-scope";
import { adminNav } from "@/lib/admin-nav";
import { cn } from "@/lib/utils";

type U = { name: string; email: string; role: "SUPER_ADMIN" | "EDITOR" };

function Nav({ role, onNavigate }: { role: U["role"]; onNavigate?: () => void }) {
  const path = usePathname();
  return (
    <nav aria-label="Admin" className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
      {adminNav.map((g) => {
        const items = g.items.filter((i) => !i.roles || i.roles.includes(role));
        if (!items.length) return null;
        return (
          <div key={g.title}>
            <p className="px-3 text-[11px] font-semibold uppercase tracking-widest text-silver/60">{g.title}</p>
            <ul className="mt-2 space-y-0.5">
              {items.map((i) => {
                const active = i.href === "/admin" ? path === "/admin" : path.startsWith(i.href);
                return (
                  <li key={i.href}>
                    <Link
                      href={i.href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                        active ? "bg-brand text-white shadow-glow" : "text-silver hover:bg-white/10 hover:text-white"
                      )}
                    >
                      <i.icon className="h-[18px] w-[18px]" />
                      {i.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}

export function AdminShell({ user, logout, children }: { user: U; logout: () => Promise<void>; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const { theme, toggle } = useAdminTheme();
  const search = useRef<HTMLInputElement>(null);
  const path = usePathname();

  useEffect(() => setOpen(false), [path]);

  // "/" or Cmd/Ctrl+K focuses search
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      const typing = t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable;
      if ((e.key === "/" && !typing) || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k")) {
        e.preventDefault();
        search.current?.focus();
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const sidebar = (
    <div className="flex h-full flex-col bg-charcoal">
      <div className="flex h-16 shrink-0 items-center justify-between px-5">
        <Link href="/admin"><Logo tone="dark" className="w-28" /></Link>
        <button className="grid h-9 w-9 place-items-center rounded-lg text-silver hover:bg-white/10 lg:hidden" onClick={() => setOpen(false)} aria-label="Close menu"><X className="h-5 w-5" /></button>
      </div>
      <Nav role={user.role} onNavigate={() => setOpen(false)} />
      <div className="border-t border-white/10 p-3">
        <Link href="/" target="_blank" className="block rounded-xl px-3 py-2 text-sm text-silver hover:bg-white/10 hover:text-white">View public site ↗</Link>
      </div>
    </div>
  );

  return (
    <div className="lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="sticky top-0 hidden h-screen lg:block">{sidebar}</aside>
      {open && (
        <div className="fixed inset-0 z-[70] lg:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-charcoal/60" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 shadow-lift">{sidebar}</div>
        </div>
      )}

      <div className="min-w-0">
        <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-silver/50 bg-white/80 px-4 backdrop-blur-xl dark:border-white/10 dark:bg-[#111214]/80 md:px-8">
          <button className="grid h-10 w-10 place-items-center rounded-xl hover:bg-mist dark:hover:bg-white/10 lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu"><Menu className="h-5 w-5" /></button>
          <div className="relative max-w-md flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2" />
            <input
              ref={search}
              type="search"
              placeholder="Search products, SKUs, inquiries…"
              aria-label="Search"
              className="h-10 w-full rounded-xl border border-silver/60 bg-mist/60 pl-10 pr-12 text-sm text-charcoal placeholder:text-graphite/60 focus:border-brand dark:border-white/10 dark:bg-white/5 dark:text-white"
            />
            <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-silver/70 px-1.5 text-[11px] font-semibold sm:block dark:border-white/20">/</kbd>
          </div>
          <div className="ml-auto flex items-center gap-1">
            <button onClick={toggle} aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"} className="grid h-10 w-10 place-items-center rounded-xl hover:bg-mist dark:hover:bg-white/10">
              {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
            <Link href="/admin/account" title="My account" className="hidden rounded-xl px-3 py-1 text-right leading-tight hover:bg-mist dark:hover:bg-white/10 sm:block">
              <span className="block text-sm font-semibold text-charcoal dark:text-white">{user.name}</span>
              <span className="block text-xs">{user.role === "SUPER_ADMIN" ? "Super admin" : "Editor"}</span>
            </Link>
            <form action={logout}>
              <button aria-label="Sign out" title="Sign out" className="grid h-10 w-10 place-items-center rounded-xl hover:bg-mist dark:hover:bg-white/10"><LogOut className="h-5 w-5" /></button>
            </form>
          </div>
        </header>
        <main className="p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
