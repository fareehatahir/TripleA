"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";

const partTypes = ["Engine", "Gearbox", "Alternator", "Compressor", "Headlight", "Bumper", "Suspension", "Radiator"];
const field = "h-12 w-full rounded-xl border border-silver/70 bg-white px-4 text-sm text-charcoal placeholder:text-graphite/60 transition hover:border-charcoal focus:border-brand";

export function QuickFinder({ makes }: { makes: { name: string; slug: string }[] }) {
  const router = useRouter();
  const [v, setV] = useState({ make: "", model: "", part: "", code: "", q: "" });
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setV({ ...v, [k]: e.target.value });

  return (
    <div className="container relative z-20 -mt-28 lg:-mt-32">
      <form
        className="rounded-3xl border border-silver/50 bg-white p-5 shadow-lift md:p-7"
        onSubmit={(e) => {
          e.preventDefault();
          const p = new URLSearchParams();
          Object.entries(v).forEach(([k, val]) => val && p.set(k, val));
          router.push(`/catalog?${p.toString()}`);
        }}
        role="search"
        aria-label="Quick finder"
      >
        <p className="mb-4 font-display text-lg font-bold text-charcoal">Find what you need</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <select aria-label="Make" className={field} value={v.make} onChange={set("make")}>
            <option value="">Any make</option>
            {makes.map((m) => <option key={m.slug} value={m.slug}>{m.name}</option>)}
          </select>
          <input aria-label="Model" className={field} placeholder="Model (e.g. Hilux)" value={v.model} onChange={set("model")} />
          <select aria-label="Part type" className={field} value={v.part} onChange={set("part")}>
            <option value="">Any part type</option>
            {partTypes.map((p) => <option key={p}>{p}</option>)}
          </select>
          <input aria-label="Engine code" className={field} placeholder="Engine code (e.g. 2GR-FE)" value={v.code} onChange={set("code")} />
          <input aria-label="Search" className={field} placeholder="Keyword or SKU" value={v.q} onChange={set("q")} />
          <Button size="lg" className="h-12 w-full"><Search className="h-4 w-4" /> Search</Button>
        </div>
      </form>
    </div>
  );
}
