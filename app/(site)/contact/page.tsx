import type { Metadata } from "next";
import { Clock, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { getSiteConfig } from "@/lib/content";
import { whatsappLink } from "@/lib/site";
import { PageHero } from "@/components/layout/page-hero";
import { ContactForm } from "./contact-form";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Contact Us",
  description: "Contact Triple A International in Taiwan by form, WhatsApp, phone or email. Tell us what you need and we reply within one business day.",
  alternates: { canonical: "/contact" },
};

export default async function ContactPage() {
  const c = await getSiteConfig();
  const items = [
    { Icon: MessageCircle, label: "WhatsApp", value: `+${c.whatsapp.replace(/\D/g, "")}`, href: whatsappLink(undefined, c.whatsapp) },
    { Icon: Phone, label: "Phone", value: c.phone, href: `tel:${c.phone.replace(/[^\d+]/g, "")}` },
    { Icon: Mail, label: "Email", value: c.email, href: `mailto:${c.email}` },
    { Icon: MapPin, label: "Address", value: c.address },
    { Icon: Clock, label: "Business hours", value: c.hours },
  ];
  const ld = { "@context": "https://schema.org", "@type": "Organization", name: c.name, url: c.url, email: c.email, telephone: c.phone, address: c.address };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <PageHero eyebrow="Contact" title="Let's talk about your next container" crumbs={[{ name: "Contact" }]} />
      <div className="container grid gap-10 py-12 md:py-16 lg:grid-cols-[1fr_1.1fr]">
        <div>
          <ul className="space-y-4">
            {items.map(({ Icon, label, value, href }) => (
              <li key={label} className="flex gap-4 rounded-2xl bg-mist p-5">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-charcoal text-white"><Icon className="h-5 w-5" /></span>
                <div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-wider">{label}</p>
                  {href ? <a href={href} {...(href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})} className="break-words font-semibold text-charcoal hover:text-brand">{value}</a> : <p className="font-semibold text-charcoal">{value}</p>}
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-6 overflow-hidden rounded-2xl ring-1 ring-silver/50">
            <iframe title={`Map of ${c.mapQuery}`} loading="lazy" referrerPolicy="no-referrer-when-downgrade" className="h-72 w-full border-0" src={`https://www.google.com/maps?q=${encodeURIComponent(c.mapQuery)}&output=embed`} />
          </div>
        </div>
        <ContactForm />
      </div>
    </>
  );
}
