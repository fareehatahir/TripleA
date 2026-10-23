"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { Check, ClipboardList, MessageCircle, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useInquiry } from "@/components/providers/inquiry-provider";
import { useWhatsapp } from "@/components/providers/site-provider";

export function QuotePanel({ p, priceLabel, url }: { p: { id: string; slug: string; title: string; sku: string; stock: number; sold: boolean }; priceLabel: string; url: string }) {
  const whatsappLink = useWhatsapp();
  const uid = useId(); // the panel is rendered twice (mobile + desktop); ids must stay unique
  const router = useRouter();
  const { add, has } = useInquiry();
  const [qty, setQty] = useState(1);
  const [msg, setMsg] = useState("");
  const max = p.stock > 0 ? p.stock : 9999;
  const item = { id: p.id, slug: p.slug, title: p.title, sku: p.sku };
  const wa = whatsappLink(`Hello Triple A, I am interested in ${p.title} (SKU ${p.sku}) × ${qty}.${msg ? `\n${msg}` : ""}\n${url}`);

  return (
    <div className="rounded-3xl bg-white p-6 shadow-lift ring-1 ring-silver/40">
      <p className="text-xs font-semibold uppercase tracking-wider text-brand">Request a quote</p>
      <p className="mt-2 font-display text-2xl font-bold text-charcoal">{priceLabel}</p>
      <p className="mt-1 text-sm">{p.sold ? "This unit is sold. Ask us about similar stock." : p.stock > 0 ? `${p.stock} in stock · FOB Taiwan` : "Available to order"}</p>

      <div className="mt-5">
        <label htmlFor={`${uid}-qty`} className="text-sm font-semibold text-charcoal">Quantity</label>
        <div className="mt-1.5 flex w-fit items-center rounded-xl border border-silver/70">
          <button type="button" aria-label="Decrease quantity" onClick={() => setQty((q) => Math.max(1, q - 1))} className="grid h-11 w-11 place-items-center rounded-l-xl hover:bg-mist"><Minus className="h-4 w-4" /></button>
          <input id={`${uid}-qty`} inputMode="numeric" value={qty} onChange={(e) => setQty(Math.min(max, Math.max(1, Number(e.target.value.replace(/\D/g, "")) || 1)))} className="h-11 w-14 border-x border-silver/70 text-center text-sm font-semibold focus:outline-none" />
          <button type="button" aria-label="Increase quantity" onClick={() => setQty((q) => Math.min(max, q + 1))} className="grid h-11 w-11 place-items-center rounded-r-xl hover:bg-mist"><Plus className="h-4 w-4" /></button>
        </div>
      </div>
      <div className="mt-4">
        <label htmlFor={`${uid}-msg`} className="text-sm font-semibold text-charcoal">Message (optional)</label>
        <textarea id={`${uid}-msg`} rows={3} maxLength={500} value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Destination port, VIN for fitment, questions…" className="mt-1.5 w-full rounded-xl border border-silver/70 px-4 py-3 text-sm text-charcoal placeholder:text-graphite/60 hover:border-charcoal focus:border-brand" />
      </div>

      <div className="mt-5 space-y-3">
        <Button size="lg" className="w-full" onClick={() => (add(item, qty, msg), router.push("/inquiry"))}><ClipboardList className="h-5 w-5" /> Send inquiry</Button>
        <Button size="lg" variant="ghost" className="w-full" onClick={() => add(item, qty, msg)}>{has(p.id) ? <Check className="h-5 w-5" /> : <Plus className="h-5 w-5" />} {has(p.id) ? "In your list · add more" : "Add to Inquiry List"}</Button>
        <Button size="lg" asChild className="w-full bg-whatsapp shadow-none hover:bg-whatsapp-hover"><a href={wa} target="_blank" rel="noopener noreferrer"><MessageCircle className="h-5 w-5" /> Chat on WhatsApp</a></Button>
      </div>
      <p className="mt-4 text-center text-xs">Reply within one business day. <Link href="/shipping" className="underline hover:text-brand">Shipping info</Link></p>
    </div>
  );
}
