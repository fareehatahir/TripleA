import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { db } from "@/lib/db";
import { RecordManager } from "@/components/admin/record-manager";
import { deleteTestimonialAction, moveTestimonialAction, saveTestimonialAction } from "../actions";

export const metadata = { title: "Testimonials" };

export default async function TestimonialsPage() {
  const rows = await db.testimonial.findMany({ orderBy: [{ order: "asc" }, { id: "asc" }] });
  return (
    <>
      <div className="mb-6 flex items-center gap-3">
        <Link href="/admin/content" className="grid h-10 w-10 place-items-center rounded-xl hover:bg-white dark:hover:bg-white/10" aria-label="Back to content"><ArrowLeft className="h-5 w-5" /></Link>
        <div><h1 className="text-2xl font-bold md:text-3xl">Testimonials</h1><p className="text-sm">Customer quotes on the home page. Only use quotes you have permission to publish.</p></div>
      </div>
      <RecordManager
        noun="testimonial" items={rows.map((t) => ({ id: t.id, name: t.name, role: t.role ?? "", quote: t.quote, active: t.active }))}
        columns={["name", "role", "quote", "active"]} emptyText="Add a quote from a happy buyer."
        defaults={{ name: "", role: "", quote: "", active: true }}
        fields={[
          { key: "name", label: "Name", type: "text" }, { key: "role", label: "Role and place", type: "text", hint: "e.g. Dealer, Mombasa, Kenya" },
          { key: "quote", label: "Quote", type: "textarea" }, { key: "active", label: "Visible on the website", type: "bool" },
        ]}
        onSave={saveTestimonialAction} onDelete={deleteTestimonialAction} onMove={moveTestimonialAction}
      />
    </>
  );
}
