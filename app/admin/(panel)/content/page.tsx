import Link from "next/link";
import { ArrowUpRight, FileText, HelpCircle, Home, Info, Layers, Quote, Scale, Settings2, Ship } from "lucide-react";
import { PageHeader } from "@/components/admin/ui";
import { blocks } from "@/components/admin/content-defs";

export const metadata = { title: "Content (CMS)" };

const icons = { home: Home, about: Info, services: Layers, shipping: Ship, site: Settings2, legal: Scale } as const;
const extra = [
  { href: "/admin/content/faqs", title: "FAQs", description: "Questions and answers shown on the Shipping page.", Icon: HelpCircle },
  { href: "/admin/content/testimonials", title: "Testimonials", description: "Customer quotes shown on the home page.", Icon: Quote },
  { href: "/admin/shipping-rates", title: "Freight rates", description: "The rate table on the Shipping page.", Icon: FileText },
];

export default function ContentPage() {
  const cards = [
    ...Object.entries(blocks).map(([k, b]) => ({ href: `/admin/content/${k}`, title: b.title, description: b.description, Icon: icons[k as keyof typeof icons] })),
    ...extra,
  ];
  return (
    <>
      <PageHeader title="Content (CMS)" description="Edit the words, photos and details on your website. Changes go live as soon as you save." />
      <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cards.map(({ href, title, description, Icon }) => (
          <li key={href}>
            <Link href={href} className="group flex h-full gap-4 rounded-2xl border border-silver/50 bg-white p-5 shadow-soft transition hover:-translate-y-0.5 hover:border-brand hover:shadow-lift dark:border-white/10 dark:bg-charcoal">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-mist text-charcoal transition group-hover:bg-brand group-hover:text-white dark:bg-white/10 dark:text-white"><Icon className="h-6 w-6" /></span>
              <span className="min-w-0"><span className="flex items-center gap-1 font-bold text-charcoal dark:text-white">{title}<ArrowUpRight className="h-4 w-4 opacity-0 transition group-hover:opacity-100" /></span><span className="mt-1 block text-sm">{description}</span></span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
