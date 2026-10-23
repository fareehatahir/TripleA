"use client";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUp, Check, MessageCircle } from "lucide-react";
import { useWhatsapp } from "@/components/providers/site-provider";
import { useInquiry } from "@/components/providers/inquiry-provider";

export function Floating() {
  const whatsappLink = useWhatsapp();
  const [show, setShow] = useState(false);
  const [cookie, setCookie] = useState(false);
  const { toast } = useInquiry();

  useEffect(() => {
    const on = () => setShow(window.scrollY > 600);
    window.addEventListener("scroll", on, { passive: true });
    try {
      if (!localStorage.getItem("ta-cookie")) setCookie(true);
    } catch {}
    return () => window.removeEventListener("scroll", on);
  }, []);

  const choose = (v: string) => {
    try {
      localStorage.setItem("ta-cookie", v);
    } catch {}
    setCookie(false);
  };

  return (
    <>
      <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-3">
        <AnimatePresence>
          {show && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              aria-label="Back to top"
              className="grid h-11 w-11 place-items-center rounded-full bg-charcoal text-white shadow-lift transition hover:bg-brand"
            >
              <ArrowUp className="h-5 w-5" />
            </motion.button>
          )}
        </AnimatePresence>
        <a
          href={whatsappLink()}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Chat on WhatsApp"
          className="relative grid h-14 w-14 place-items-center rounded-full bg-whatsapp text-white shadow-lift transition hover:scale-105"
        >
          <span className="absolute inset-0 rounded-full bg-whatsapp animate-pulse-ring" aria-hidden />
          <MessageCircle className="relative h-7 w-7" />
        </a>
      </div>

      <AnimatePresence>
        {toast && (
          <motion.div
            role="status"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-5 left-1/2 z-[70] flex max-w-[90vw] -translate-x-1/2 items-center gap-3 rounded-xl bg-charcoal px-5 py-3 text-sm text-white shadow-lift"
          >
            <span className="grid h-5 w-5 place-items-center rounded-full bg-brand"><Check className="h-3 w-3" /></span>
            <span className="truncate">{toast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {cookie && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            className="fixed bottom-5 left-5 z-[65] max-w-sm rounded-2xl border border-silver/60 bg-white p-5 shadow-lift"
          >
            <p className="text-sm text-graphite">We use cookies to keep the site working and understand how it is used.</p>
            <div className="mt-4 flex gap-2">
              <button onClick={() => choose("all")} className="h-9 rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-hover">Accept</button>
              <button onClick={() => choose("essential")} className="h-9 rounded-lg px-4 text-sm font-semibold text-charcoal ring-1 ring-inset ring-silver hover:bg-mist">Essential only</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
