"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform } from "framer-motion";
import { ArrowRight, MessageCircle, ShieldCheck } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Magnetic } from "@/components/ui/magnetic";
import { GlobeArt } from "@/components/brand/globe-art";
import { CarSilhouette } from "@/components/brand/car-silhouette";
import type { Content } from "@/lib/content";
import { useWhatsapp } from "@/components/providers/site-provider";

export function Hero({ c }: { c: Content<"home">["hero"] }) {
  const whatsappLink = useWhatsapp();
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const [slide, setSlide] = useState(0);
  const slides = c.slides.filter((x) => x.url);

  // mouse parallax (-0.5..0.5) smoothed with springs
  const mx = useSpring(useMotionValue(0), { stiffness: 60, damping: 20 });
  const my = useSpring(useMotionValue(0), { stiffness: 60, damping: 20 });
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });

  const globeX = useTransform(mx, [-0.5, 0.5], [-18, 18]);
  const globeY = useTransform([my, scrollYProgress], ([m, s]) => (m as number) * -14 + (s as number) * 120);
  const carX = useTransform(mx, [-0.5, 0.5], [30, -30]);
  const carY = useTransform(scrollYProgress, [0, 1], [0, 90]);
  const textY = useTransform(scrollYProgress, [0, 1], [0, 60]);

  useEffect(() => {
    if (reduce) return;
    const t = setInterval(() => setSlide((s) => (s + 1) % Math.max(1, slides.length || 2)), 7000);
    return () => clearInterval(t);
  }, [reduce, slides.length]);

  const headline = [c.line1, c.line2, c.line3];

  return (
    <section
      ref={ref}
      className="relative overflow-hidden bg-gradient-to-b from-white via-white to-mist"
      onMouseMove={(e) => {
        if (reduce) return;
        mx.set(e.clientX / window.innerWidth - 0.5);
        my.set(e.clientY / window.innerHeight - 0.5);
      }}
    >
      {/* background slides: slow zoom (photo if provided, tonal gradient otherwise) */}
      <div className="absolute inset-0" aria-hidden>
        <AnimatePresence mode="sync">
          <motion.div
            key={slide}
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.6 }}
          >
            <div className="absolute inset-0 animate-slow-zoom">
              {slides[slide]?.url ? (
                <Image src={slides[slide].url} alt={slides[slide].alt} fill priority sizes="100vw" className="object-cover opacity-25" />
              ) : (
                <div
                  className="h-full w-full"
                  style={{
                    background: [
                      "radial-gradient(60% 50% at 82% 30%, rgba(200,16,46,0.08), transparent 70%)",
                      "radial-gradient(50% 50% at 10% 90%, rgba(201,205,210,0.45), transparent 70%)",
                    ][slide % 2],
                  }}
                />
              )}
            </div>
          </motion.div>
        </AnimatePresence>
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(31,33,36,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(31,33,36,0.04)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(70%_60%_at_60%_40%,#000,transparent)]" />
      </div>

      <div className="container relative grid min-h-[min(calc(100svh-72px),820px)] items-center gap-10 pb-40 pt-16 lg:grid-cols-12 lg:pb-48">
        <motion.div className="relative z-10 lg:col-span-7" style={reduce ? undefined : { y: textY }}>
          <p className="eyebrow rise" style={{ "--d": "0s" } as React.CSSProperties}>
            {c.eyebrow}
          </p>

          <h1 className="display-italic mt-5 text-[2.5rem] leading-[1.06] sm:text-6xl xl:text-[4.25rem]">
            {headline.map((line, i) => (
              <span key={line} className={`rise block pb-1 ${i === 2 ? "text-brand" : ""}`} style={{ "--d": `${0.05 + i * 0.09}s` } as React.CSSProperties}>
                {line}
              </span>
            ))}
          </h1>

          <p className="rise mt-6 max-w-xl text-lg leading-relaxed text-graphite" style={{ "--d": "0.3s" } as React.CSSProperties}>
            {c.subtext}
          </p>

          <div className="rise mt-9 flex flex-wrap items-center gap-4" style={{ "--d": "0.4s" } as React.CSSProperties}>
            <Magnetic>
              <Button asChild size="lg">
                <Link href="/catalog">
                  {c.primaryCta} <ArrowRight className="h-5 w-5" />
                </Link>
              </Button>
            </Magnetic>
            <Magnetic>
              <Button asChild size="lg" variant="ghost">
                <Link href="/inquiry">{c.secondaryCta}</Link>
              </Button>
            </Magnetic>
            <a
              href={whatsappLink()}
              target="_blank"
              rel="noopener noreferrer"
              className="link-underline hidden items-center gap-2 text-sm font-semibold text-charcoal sm:inline-flex"
            >
              <MessageCircle className="h-4 w-4 text-whatsapp" /> Chat on WhatsApp
            </a>
          </div>

          <ul className="rise mt-10 flex flex-wrap gap-x-8 gap-y-3 text-sm font-medium text-graphite" style={{ "--d": "0.5s" } as React.CSSProperties}>
            {c.badges.map((t) => (
              <li key={t} className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-brand" /> {t}
              </li>
            ))}
          </ul>
        </motion.div>

        {/* Parallax art */}
        <div className="relative hidden h-[560px] lg:col-span-5 lg:block" aria-hidden>
          <motion.div className="absolute -right-10 top-0 w-[560px]" style={reduce ? undefined : { x: globeX, y: globeY }}>
            <div className="rise-scale">
              <GlobeArt className="w-full" />
            </div>
          </motion.div>
          <motion.div className="absolute -left-32 bottom-2 w-[620px]" style={reduce ? undefined : { x: carX, y: carY }}>
            <div className="drive-in">
              <CarSilhouette className="w-full drop-shadow-[0_24px_30px_rgba(31,33,36,0.25)]" />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
