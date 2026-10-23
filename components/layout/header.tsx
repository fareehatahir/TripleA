"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, ClipboardList, Menu, Search, X, Globe } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { useInquiry } from "@/components/providers/inquiry-provider";
import { categories as categoryBlurbs, languages, nav } from "@/lib/site";
import type { NavData } from "@/lib/nav-data";
import { useSite } from "@/components/providers/site-provider";
import { SearchBox } from "@/components/catalog/search-box";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

export function Header({ categories, makes }: NavData) {
  const router = useRouter();
  const site = useSite();
  const [searchOpen, setSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [mega, setMega] = useState<string | null>(null);
  const [mobile, setMobile] = useState(false);
  const [lang, setLang] = useState(false);
  const { count, setDrawerOpen } = useInquiry();

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 12);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobile ? "hidden" : "";
  }, [mobile]);

  const active = categories.find((c) => c.slug === mega);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b transition-all duration-300",
        scrolled ? "border-silver/50 bg-white/75 shadow-soft backdrop-blur-xl" : "border-transparent bg-white/90 backdrop-blur-md"
      )}
      onMouseLeave={() => setMega(null)}
    >
      <div className="container flex h-[72px] items-center justify-between gap-6">
        <Link href="/" className="shrink-0" aria-label="Triple A International – home">
          <Logo className="w-[132px] md:w-[156px]" src={site.logoUrl || undefined} priority />
        </Link>

        <nav className="hidden items-center gap-5 xl:gap-7 lg:flex" aria-label="Main">
          {categories.map((c) => (
            <Link
              key={c.slug}
              href={`/catalog/${c.slug}`}
              onMouseEnter={() => setMega(c.slug)}
              onFocus={() => setMega(c.slug)}
              className="link-underline flex items-center gap-1 whitespace-nowrap text-sm font-semibold text-charcoal"
            >
              {c.name}
              <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", mega === c.slug && "rotate-180")} />
            </Link>
          ))}
          {nav.map((n) => (
            <Link key={n.href} href={n.href} onMouseEnter={() => setMega(null)} className="link-underline whitespace-nowrap text-sm font-medium text-graphite hover:text-charcoal">
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <div className="relative hidden sm:block">
            <button
              onClick={() => setLang((v) => !v)}
              className="flex h-10 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-charcoal hover:bg-mist"
              aria-haspopup="listbox"
              aria-expanded={lang}
            >
              <Globe className="h-4 w-4" /> EN
            </button>
            <AnimatePresence>
              {lang && (
                <motion.ul
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  className="absolute right-0 top-12 w-40 rounded-xl border border-silver/50 bg-white p-1.5 shadow-lift"
                  role="listbox"
                >
                  {languages.map((l) => (
                    <li key={l.code}>
                      <button
                        disabled={!l.enabled}
                        onClick={() => setLang(false)}
                        className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm hover:bg-mist disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        {l.label}
                        {!l.enabled && <span className="text-[10px] uppercase tracking-wider">soon</span>}
                      </button>
                    </li>
                  ))}
                </motion.ul>
              )}
            </AnimatePresence>
          </div>

          <button onClick={() => setSearchOpen(true)} aria-label="Search catalog" className="grid h-10 w-10 place-items-center rounded-xl text-charcoal hover:bg-mist">
            <Search className="h-5 w-5" />
          </button>

          <Button size="sm" className="hidden sm:inline-flex" onClick={() => setDrawerOpen(true)} aria-label={`Inquiry list, ${count} items`}>
            <ClipboardList className="h-4 w-4" />
            Inquiry List
            <span className="ml-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-white px-1 text-xs font-bold text-brand">{count}</span>
          </Button>
          <button onClick={() => setDrawerOpen(true)} aria-label={`Inquiry list, ${count} items`} className="relative grid h-10 w-10 place-items-center rounded-xl text-charcoal hover:bg-mist sm:hidden">
            <ClipboardList className="h-5 w-5" />
            {count > 0 && <span className="absolute right-0.5 top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-brand px-1 text-[10px] font-bold text-white">{count}</span>}
          </button>

          <button
            className="grid h-10 w-10 place-items-center rounded-xl text-charcoal hover:bg-mist lg:hidden"
            onClick={() => setMobile(true)}
            aria-label="Open menu"
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {searchOpen && (
          <motion.div className="fixed inset-0 z-[70] bg-charcoal/60 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSearchOpen(false)} onKeyDown={(e) => e.key === "Escape" && setSearchOpen(false)}>
            <div role="dialog" aria-modal="true" aria-label="Search" className="container pt-24" onClick={(e) => e.stopPropagation()}>
              <div className="mx-auto max-w-2xl rounded-3xl bg-white p-4 shadow-lift">
                <SearchBox autoFocus onNavigate={() => setSearchOpen(false)} onSubmit={(q) => { setSearchOpen(false); router.push(q ? `/catalog?q=${encodeURIComponent(q)}` : "/catalog"); }} />
                <p className="mt-3 px-1 text-xs">Press Enter to see all results · Esc to close</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mega menu */}
      <AnimatePresence>
        {active && (
          <motion.div
            key="mega"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="absolute inset-x-0 top-full hidden border-b border-silver/50 bg-white shadow-lift lg:block"
          >
            <div className="container grid grid-cols-12 gap-10 py-8">
              <div className="col-span-4">
                <p className="eyebrow">{active.name}</p>
                <h3 className="mt-3 text-2xl font-bold">{categoryBlurbs.find((c) => c.slug === active.slug)?.blurb ?? "Browse the full range."}</h3>
                <Button asChild variant="ghost" size="sm" className="mt-5">
                  <Link href={`/catalog/${active.slug}`} onClick={() => setMega(null)}>View all {active.name.toLowerCase()}</Link>
                </Button>
              </div>
              <ul className="col-span-8 grid grid-cols-3 gap-x-8 gap-y-1">
                {makes.map((m) => (
                  <li key={m.slug}>
                    <Link
                      href={`/catalog/${active.slug}/${m.slug}`}
                      onClick={() => setMega(null)}
                      className="block rounded-lg px-3 py-2 text-sm font-medium text-graphite transition hover:bg-mist hover:text-brand"
                    >
                      {m.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobile && (
          <motion.div
            className="fixed inset-0 z-[60] bg-charcoal/50 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobile(false)}
          >
            <motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "tween", duration: 0.28 }}
              className="absolute right-0 top-0 flex h-full w-[86%] max-w-sm flex-col bg-white p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <Logo className="w-28" src={site.logoUrl || undefined} />
                <button onClick={() => setMobile(false)} aria-label="Close menu" className="grid h-10 w-10 place-items-center rounded-xl hover:bg-mist">
                  <X className="h-6 w-6" />
                </button>
              </div>
              <div className="mt-8 flex-1 space-y-1 overflow-y-auto">
                {[...categories.map((c) => ({ label: c.name, href: `/catalog/${c.slug}` })), ...nav].map((n) => (
                  <Link
                    key={n.href}
                    href={n.href}
                    onClick={() => setMobile(false)}
                    className="block rounded-xl px-3 py-3 font-display text-lg font-semibold text-charcoal hover:bg-mist"
                  >
                    {n.label}
                  </Link>
                ))}
              </div>
              <Button asChild size="lg" className="w-full">
                <Link href="/inquiry" onClick={() => setMobile(false)}>
                  <ClipboardList className="h-5 w-5" /> Inquiry List ({count})
                </Link>
              </Button>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
