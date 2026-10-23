import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Mail, MapPin, MessageCircle, Phone, Ship } from "lucide-react";
import { db } from "@/lib/db";
import { Badge, Card } from "@/components/admin/ui";
import { InquiryPanel } from "./inquiry-panel";

export const metadata = { title: "Inquiry" };

export default async function InquiryDetail(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const q = await db.inquiry.findUnique({
    where: { id: params.id },
    include: { items: { include: { product: { select: { id: true, slug: true } } } }, replies: { orderBy: { createdAt: "desc" } } },
  });
  if (!q) notFound();
  const wa = `https://wa.me/${q.phone.replace(/\D/g, "")}`;

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Link href="/admin/inquiries" className="grid h-10 w-10 place-items-center rounded-xl hover:bg-white dark:hover:bg-white/10" aria-label="Back to inquiries"><ArrowLeft className="h-5 w-5" /></Link>
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">{q.reference}</h1>
          <p className="text-sm">Received {q.createdAt.toLocaleString("en", { dateStyle: "long", timeStyle: "short" })}</p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Card className="p-6">
            <h2 className="text-lg font-bold">Buyer</h2>
            <p className="mt-3 text-xl font-semibold text-charcoal dark:text-white">{q.name}{q.company && <span className="font-normal"> · {q.company}</span>}</p>
            <ul className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <li className="flex items-center gap-2"><MapPin className="h-4 w-4 text-brand" />{q.country}</li>
              <li className="flex items-center gap-2"><Ship className="h-4 w-4 text-brand" />{q.port || "No port given"}</li>
              <li className="flex items-center gap-2"><Phone className="h-4 w-4 text-brand" />{q.phone} <a href={wa} target="_blank" rel="noopener noreferrer" className="ml-1 inline-flex items-center gap-1 font-semibold text-emerald-600 hover:underline"><MessageCircle className="h-4 w-4" />WhatsApp</a></li>
              <li className="flex items-center gap-2"><Mail className="h-4 w-4 text-brand" /><a href={`mailto:${q.email}`} className="hover:text-brand hover:underline">{q.email}</a></li>
            </ul>
            {q.message && <p className="mt-5 whitespace-pre-wrap rounded-xl bg-mist p-4 text-sm dark:bg-white/5">{q.message}</p>}
          </Card>

          <Card>
            <h2 className="p-6 pb-3 text-lg font-bold">Items ({q.items.length})</h2>
            {q.items.length === 0 ? <p className="px-6 pb-6 text-sm">General inquiry. No specific items were selected.</p> : (
              <ul className="divide-y divide-silver/40 dark:divide-white/10">
                {q.items.map((i) => (
                  <li key={i.id} className="flex items-start justify-between gap-4 px-6 py-4">
                    <div className="min-w-0">
                      {i.product ? <Link href={`/admin/products/${i.product.id}`} className="font-semibold text-charcoal hover:text-brand dark:text-white">{i.title}</Link> : <span className="font-semibold text-charcoal dark:text-white">{i.title}</span>}
                      <p className="text-xs">SKU {i.sku}{!i.product && " · product no longer in catalog"}</p>
                      {i.note && <p className="mt-1 text-sm">“{i.note}”</p>}
                    </div>
                    <Badge tone="dark">× {i.qty}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {q.replies.length > 0 && (
            <Card className="p-6">
              <h2 className="text-lg font-bold">Emails sent</h2>
              <ul className="mt-4 space-y-4">
                {q.replies.map((r) => (
                  <li key={r.id} className="rounded-xl bg-mist p-4 text-sm dark:bg-white/5">
                    <p className="font-semibold text-charcoal dark:text-white">{r.subject}</p>
                    <p className="text-xs">{r.sentBy} · {r.createdAt.toLocaleString("en", { dateStyle: "medium", timeStyle: "short" })}</p>
                    <p className="mt-2 whitespace-pre-wrap">{r.body}</p>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>

        <InquiryPanel id={q.id} reference={q.reference} status={q.status} notes={q.notes ?? ""} email={q.email} />
      </div>
    </>
  );
}
