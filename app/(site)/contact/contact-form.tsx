"use client";
import { useCallback, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Turnstile } from "@/components/content/turnstile";
import { contactSchema, type ContactInput } from "@/lib/validation";
import { cn } from "@/lib/utils";
import { submitContactAction } from "./actions";

const input = "h-12 w-full rounded-xl border border-silver/70 bg-white px-4 text-sm text-charcoal placeholder:text-graphite/50 transition hover:border-charcoal focus:border-brand";
const E = ({ m }: { m?: string }) => (m ? <p role="alert" className="mt-1 text-xs font-medium text-brand">{m}</p> : null);
const L = ({ id, children }: { id: string; children: React.ReactNode }) => <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-charcoal">{children}</label>;

export function ContactForm() {
  const [sent, setSent] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [token, setToken] = useState("");
  const onToken = useCallback((t: string) => setToken(t), []);
  const { register, handleSubmit, setError, reset, formState: { errors, isSubmitting } } = useForm<ContactInput>({ resolver: zodResolver(contactSchema) });

  if (sent)
    return (
      <div role="status" className="grid place-items-center rounded-3xl bg-white p-10 text-center shadow-lift ring-1 ring-silver/40">
        <div>
          <motion.svg viewBox="0 0 80 80" className="mx-auto h-20 w-20" initial="hidden" animate="show" aria-hidden>
            <motion.circle cx="40" cy="40" r="36" fill="none" stroke="rgb(var(--brand-rgb))" strokeWidth="5" variants={{ hidden: { pathLength: 0 }, show: { pathLength: 1, transition: { duration: 0.6 } } }} />
            <motion.path d="M24 41 l11 11 l22 -24" fill="none" stroke="rgb(var(--brand-rgb))" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" variants={{ hidden: { pathLength: 0 }, show: { pathLength: 1, transition: { duration: 0.45, delay: 0.5 } } }} />
          </motion.svg>
          <h2 className="mt-5 text-2xl font-bold">Message sent</h2>
          <p className="mt-2">Thank you. We will reply within one business day.</p>
          <Button variant="ghost" className="mt-6" onClick={() => (reset(), setSent(false))}>Send another message</Button>
        </div>
      </div>
    );

  return (
    <form
      noValidate
      aria-label="Contact form"
      className="rounded-3xl bg-white p-6 shadow-lift ring-1 ring-silver/40 md:p-8"
      onSubmit={handleSubmit(async (v) => {
        setServerError(null);
        const r = await submitContactAction({ ...v, token });
        if (r.ok) return setSent(true);
        if (r.field && r.field in v) setError(r.field as keyof ContactInput, { message: r.error });
        setServerError(r.error);
      })}
    >
      <h2 className="text-xl font-bold">Send us a message</h2>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div><L id="c-name">Name *</L><input id="c-name" autoComplete="name" className={input} {...register("name")} /><E m={errors.name?.message} /></div>
        <div><L id="c-email">Email *</L><input id="c-email" type="email" autoComplete="email" className={input} {...register("email")} /><E m={errors.email?.message} /></div>
        <div><L id="c-phone">Phone / WhatsApp</L><input id="c-phone" type="tel" autoComplete="tel" className={input} {...register("phone")} /><E m={errors.phone?.message} /></div>
        <div><L id="c-subject">Subject *</L><input id="c-subject" className={input} {...register("subject")} /><E m={errors.subject?.message} /></div>
        <div className="sm:col-span-2"><L id="c-message">Message *</L><textarea id="c-message" rows={6} className={cn(input, "h-auto py-3")} {...register("message")} /><E m={errors.message?.message} /></div>
      </div>
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden"><label>Website<input tabIndex={-1} autoComplete="off" {...register("website")} /></label></div>
      <Turnstile onToken={onToken} />
      {serverError && <p role="alert" className="mt-4 rounded-xl bg-brand/10 px-4 py-3 text-sm font-medium text-brand">{serverError}</p>}
      <Button size="lg" className="mt-6 w-full" disabled={isSubmitting}>{isSubmitting ? "Sending…" : "Send message"}</Button>
      <p className="mt-3 text-center text-xs">We only use your details to reply. See our <a href="/privacy" className="underline hover:text-brand">privacy notice</a>.</p>
    </form>
  );
}
