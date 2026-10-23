"use client";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { ClipboardList, MessageCircle, Minus, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useInquiry } from "@/components/providers/inquiry-provider";
import { countries } from "@/lib/countries";
import { inquirySchema, type InquiryInput } from "@/lib/validation";
import { useWhatsapp } from "@/components/providers/site-provider";
import { cn } from "@/lib/utils";
import { submitInquiryAction } from "./actions";

const input = "h-12 w-full rounded-xl border border-silver/70 bg-white px-4 text-sm text-charcoal placeholder:text-graphite/50 transition hover:border-charcoal focus:border-brand";
const err = (m?: string) => m && <p role="alert" className="mt-1 text-xs font-medium text-brand">{m}</p>;

function Lbl({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-semibold text-charcoal">{children}</label>;
}

function Success({ reference, summary }: { reference: string; summary: string }) {
  const whatsappLink = useWhatsapp();
  return (
    <div className="container grid min-h-[60vh] place-items-center py-20 text-center" role="status">
      <div>
        <motion.svg viewBox="0 0 80 80" className="mx-auto h-24 w-24" initial="hidden" animate="show" aria-hidden>
          <motion.circle cx="40" cy="40" r="36" fill="none" stroke="rgb(var(--brand-rgb))" strokeWidth="5" variants={{ hidden: { pathLength: 0 }, show: { pathLength: 1, transition: { duration: 0.6 } } }} />
          <motion.path d="M24 41 l11 11 l22 -24" fill="none" stroke="rgb(var(--brand-rgb))" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" variants={{ hidden: { pathLength: 0 }, show: { pathLength: 1, transition: { duration: 0.45, delay: 0.5 } } }} />
        </motion.svg>
        <motion.h1 initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }} className="mt-6 text-3xl font-bold md:text-4xl">Inquiry sent</motion.h1>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1 }}>
          <p className="mt-3">Your reference is <strong className="text-charcoal">{reference}</strong>. We have emailed you a confirmation and will reply within one business day.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild className="bg-whatsapp shadow-none hover:bg-whatsapp-hover"><a href={whatsappLink(`Hello Triple A, I just sent inquiry ${reference}.${summary ? ` Items: ${summary}` : ""}`)} target="_blank" rel="noopener noreferrer"><MessageCircle className="h-5 w-5" /> Also send via WhatsApp</a></Button>
            <Button asChild variant="ghost"><Link href="/catalog">Keep browsing</Link></Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export function InquiryClient() {
  const whatsappLink = useWhatsapp();
  const { items, setQty, setNote, remove, clear } = useInquiry();
  const [done, setDone] = useState<{ reference: string; summary: string } | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<InquiryInput>({
    resolver: zodResolver(inquirySchema),
    defaultValues: { items: [], country: "", consent: undefined, website: "" },
  });

  if (done) return <Success {...done} />;

  const onSubmit = handleSubmit(async (v) => {
    setServerError(null);
    const res = await submitInquiryAction({ ...v, items: items.map((i) => ({ productId: i.id, qty: i.qty, note: i.note })) });
    if (!res.ok) {
      if (res.field && res.field in v) setError(res.field as keyof InquiryInput, { message: res.error });
      return setServerError(res.error);
    }
    clear();
    setDone({ reference: res.reference, summary: res.summary });
    window.scrollTo({ top: 0 });
  });

  const waText = `Hello Triple A, I would like a quote for:\n${items.map((i) => `- ${i.title} (${i.sku}) × ${i.qty}`).join("\n") || "(general inquiry)"}`;

  return (
    <div className="container py-10 md:py-16">
      <p className="eyebrow">Inquiry</p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight md:text-5xl">Your inquiry list</h1>
      <p className="mt-3 max-w-2xl">Tell us what you need and where it is going. We reply with availability, photos and a freight quote.</p>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_28rem]">
        <section aria-labelledby="items-h">
          <h2 id="items-h" className="text-xl font-bold">Items ({items.length})</h2>
          {items.length === 0 ? (
            <div className="mt-4 grid place-items-center rounded-3xl bg-mist px-6 py-14 text-center">
              <ClipboardList className="h-10 w-10 text-graphite" />
              <p className="mt-3 font-semibold text-charcoal">Your list is empty</p>
              <p className="mt-1 max-w-sm text-sm">Add products from the catalog, or just describe what you need in the message box and we will source it.</p>
              <Button asChild className="mt-5"><Link href="/catalog">Browse catalog</Link></Button>
            </div>
          ) : (
            <ul className="mt-4 space-y-3">
              {items.map((it) => (
                <li key={it.id} className="rounded-2xl bg-white p-4 shadow-soft ring-1 ring-silver/40">
                  <div className="flex flex-wrap items-start gap-4">
                    <div className="min-w-0 flex-1">
                      <Link href={`/product/${it.slug}`} className="font-semibold text-charcoal hover:text-brand">{it.title}</Link>
                      <p className="text-xs">SKU {it.sku}</p>
                    </div>
                    <div className="flex items-center rounded-xl border border-silver/70">
                      <button type="button" aria-label={`Decrease quantity of ${it.title}`} onClick={() => setQty(it.id, it.qty - 1)} className="grid h-10 w-10 place-items-center rounded-l-xl hover:bg-mist"><Minus className="h-4 w-4" /></button>
                      <input aria-label={`Quantity of ${it.title}`} inputMode="numeric" value={it.qty} onChange={(e) => setQty(it.id, Number(e.target.value.replace(/\D/g, "")))} className="h-10 w-12 border-x border-silver/70 text-center text-sm font-semibold focus:outline-none" />
                      <button type="button" aria-label={`Increase quantity of ${it.title}`} onClick={() => setQty(it.id, it.qty + 1)} className="grid h-10 w-10 place-items-center rounded-r-xl hover:bg-mist"><Plus className="h-4 w-4" /></button>
                    </div>
                    <button type="button" onClick={() => remove(it.id)} aria-label={`Remove ${it.title}`} className="grid h-10 w-10 place-items-center rounded-xl text-brand hover:bg-brand/10"><Trash2 className="h-5 w-5" /></button>
                  </div>
                  <input aria-label={`Note for ${it.title}`} value={it.note} onChange={(e) => setNote(it.id, e.target.value)} placeholder="Note for this item (optional)" className="mt-3 h-10 w-full rounded-lg border border-silver/60 px-3 text-sm placeholder:text-graphite/50 hover:border-charcoal focus:border-brand" />
                </li>
              ))}
            </ul>
          )}
        </section>

        <form onSubmit={onSubmit} noValidate className="h-fit rounded-3xl bg-white p-6 shadow-lift ring-1 ring-silver/40 md:p-8" aria-label="Contact details">
          <h2 className="text-xl font-bold">Your details</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2"><Lbl htmlFor="name">Full name *</Lbl><input id="name" autoComplete="name" className={input} {...register("name")} />{err(errors.name?.message)}</div>
            <div className="sm:col-span-2"><Lbl htmlFor="company">Company</Lbl><input id="company" autoComplete="organization" className={input} {...register("company")} />{err(errors.company?.message)}</div>
            <div className="sm:col-span-2">
              <Lbl htmlFor="country">Country *</Lbl>
              <select id="country" autoComplete="country-name" className={input} {...register("country")}>
                <option value="">Select your country</option>
                {countries.map((c) => <option key={c.code} value={c.name}>{c.flag}  {c.name}</option>)}
              </select>
              {err(errors.country?.message)}
            </div>
            <div><Lbl htmlFor="phone">Phone / WhatsApp *</Lbl><input id="phone" type="tel" autoComplete="tel" placeholder="+254 700 000 000" className={input} {...register("phone")} />{err(errors.phone?.message)}</div>
            <div><Lbl htmlFor="email">Email *</Lbl><input id="email" type="email" autoComplete="email" className={input} {...register("email")} />{err(errors.email?.message)}</div>
            <div className="sm:col-span-2"><Lbl htmlFor="port">Destination port</Lbl><input id="port" placeholder="e.g. Mombasa" className={input} {...register("port")} />{err(errors.port?.message)}</div>
            <div className="sm:col-span-2"><Lbl htmlFor="message">Message</Lbl><textarea id="message" rows={4} placeholder="Anything we should know: VINs, target prices, container size…" className={cn(input, "h-auto py-3")} {...register("message")} />{err(errors.message?.message)}</div>
          </div>

          {/* Honeypot: hidden from people and assistive tech */}
          <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden"><label>Website<input tabIndex={-1} autoComplete="off" {...register("website")} /></label></div>

          <label className="mt-5 flex cursor-pointer items-start gap-3 text-sm">
            <input type="checkbox" className="mt-0.5 h-4 w-4 accent-brand" {...register("consent")} />
            <span>I agree that Triple A International may contact me about this inquiry. See the <Link href="/privacy" className="font-semibold text-brand hover:underline">privacy notice</Link>.</span>
          </label>
          {err(errors.consent?.message)}
          {serverError && <p role="alert" className="mt-4 rounded-xl bg-brand/10 px-4 py-3 text-sm font-medium text-brand">{serverError}</p>}

          <Button size="lg" className="mt-6 w-full" disabled={isSubmitting}>{isSubmitting ? "Sending…" : "Send inquiry"}</Button>
          <Button asChild size="lg" variant="ghost" className="mt-3 w-full"><a href={whatsappLink(waText)} target="_blank" rel="noopener noreferrer"><MessageCircle className="h-5 w-5 text-whatsapp" /> Send via WhatsApp instead</a></Button>
        </form>
      </div>
    </div>
  );
}
