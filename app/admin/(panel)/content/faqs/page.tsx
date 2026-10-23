import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { db } from "@/lib/db";
import { RecordManager } from "@/components/admin/record-manager";
import { deleteFaqAction, moveFaqAction, saveFaqAction } from "../actions";

export const metadata = { title: "FAQs" };

export default async function FaqsPage() {
  const faqs = await db.faq.findMany({ orderBy: [{ order: "asc" }, { id: "asc" }] });
  return (
    <>
      <div className="mb-6 flex items-center gap-3">
        <Link href="/admin/content" className="grid h-10 w-10 place-items-center rounded-xl hover:bg-white dark:hover:bg-white/10" aria-label="Back to content"><ArrowLeft className="h-5 w-5" /></Link>
        <div><h1 className="text-2xl font-bold md:text-3xl">FAQs</h1><p className="text-sm">Shown as an accordion on the Shipping page. Drag order: use the arrows.</p></div>
      </div>
      <RecordManager
        noun="FAQ" items={faqs.map((f) => ({ id: f.id, question: f.question, answer: f.answer, group: f.group, active: f.active }))}
        columns={["question", "group", "active"]} emptyText="Add the questions buyers ask most: payment, inspection, shipping times."
        defaults={{ question: "", answer: "", group: "shipping", active: true }}
        fields={[
          { key: "question", label: "Question", type: "text" }, { key: "answer", label: "Answer", type: "textarea" },
          { key: "group", label: "Shown on", type: "select", options: [{ value: "shipping", label: "Shipping" }, { value: "general", label: "General" }] },
          { key: "active", label: "Visible on the website", type: "bool" },
        ]}
        onSave={saveFaqAction} onDelete={deleteFaqAction} onMove={moveFaqAction}
      />
    </>
  );
}
