"use client";
import Link from "next/link";
import { useState } from "react";
import { Check, Mail, MapPin, Phone } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { nav } from "@/lib/site";
import { useSite } from "@/components/providers/site-provider";
import { subscribeAction } from "@/app/(site)/_actions/newsletter";

export function Footer({ categories }: { categories: { name: string; slug: string }[] }) {
  const site = useSite();
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  return (
    <footer className="bg-charcoal text-silver">
      <div className="container grid gap-12 py-16 md:grid-cols-12">
        <div className="md:col-span-4">
          <Logo tone="dark" className="w-40" src={site.logoUrl || undefined} />
          <p className="mt-5 max-w-sm text-sm leading-relaxed">
            {site.footerBlurb}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {site.social.filter((s) => s.href).map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-medium transition hover:border-brand hover:bg-brand hover:text-white"
              >
                {s.label}
              </a>
            ))}
          </div>
        </div>

        <div className="md:col-span-2">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-white">Catalog</h2>
          <ul className="mt-4 space-y-2.5 text-sm">
            {categories.map((c) => (
              <li key={c.slug}>
                <Link href={`/catalog/${c.slug}`} className="transition hover:text-white">{c.name}</Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="md:col-span-2">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-white">Company</h2>
          <ul className="mt-4 space-y-2.5 text-sm">
            {[...nav, { label: "Blog", href: "/blog" }].map((n) => (
              <li key={n.href}>
                <Link href={n.href} className="transition hover:text-white">{n.label}</Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="md:col-span-4">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-white">Contact</h2>
          <ul className="mt-4 space-y-3 text-sm">
            <li className="flex gap-3"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand" />{site.address}</li>
            <li className="flex gap-3"><Phone className="mt-0.5 h-4 w-4 shrink-0 text-brand" />{site.phone}</li>
            <li className="flex gap-3"><Mail className="mt-0.5 h-4 w-4 shrink-0 text-brand" />{site.email}</li>
          </ul>
          <form
            className="mt-6"
            onSubmit={async (e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const r = await subscribeAction(String(fd.get("email") ?? ""), String(fd.get("website") ?? ""));
              setDone(r.ok);
              setErr(r.ok ? null : r.error ?? "Something went wrong");
            }}
          >
            <label htmlFor="nl" className="text-sm text-white">Stock updates &amp; freight news</label>
            <div className="mt-2 flex gap-2">
              <input name="website" tabIndex={-1} autoComplete="off" aria-hidden className="absolute -left-[9999px] h-0 w-0 opacity-0" />
              <input
                id="nl"
                name="email"
                type="email"
                required
                placeholder="you@company.com"
                className="h-11 min-w-0 flex-1 rounded-xl border border-white/15 bg-white/5 px-4 text-sm text-white placeholder:text-silver/60"
              />
              <button className="grid h-11 w-24 place-items-center rounded-xl bg-brand text-sm font-semibold text-white transition hover:bg-brand-hover">
                {done ? <Check className="h-5 w-5" /> : "Join"}
              </button>
            </div>
            {done && <p role="status" className="mt-2 text-xs text-emerald-400">Thanks, you are on the list.</p>}
            {err && <p role="alert" className="mt-2 text-xs text-red-300">{err}</p>}
          </form>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container flex flex-col items-center justify-between gap-2 py-6 text-xs sm:flex-row">
          <p>© {new Date().getFullYear()} {site.name}. All rights reserved.</p>
          <p className="flex gap-4">
            <Link href="/privacy" className="hover:text-white">Privacy</Link>
            <Link href="/terms" className="hover:text-white">Terms</Link>
            <span>tripleaint.tw</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
