"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Check, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, inputCls } from "@/components/admin/ui";
import { replyToInquiryAction, saveInquiryNotesAction, setInquiryStatusAction } from "../actions";

const STATUSES = ["NEW", "CONTACTED", "QUOTED", "WON", "LOST"];

export function InquiryPanel({ id, reference, status, notes, email }: { id: string; reference: string; status: string; notes: string; email: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [n, setN] = useState(notes);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [subject, setSubject] = useState(`Re: your inquiry ${reference}`);
  const [body, setBody] = useState("");

  const flash = (ok: boolean, text: string) => setMsg({ ok, text });

  return (
    <div className="space-y-6">
      {msg && <p role={msg.ok ? "status" : "alert"} className={`rounded-xl px-4 py-3 text-sm font-medium ${msg.ok ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-brand/10 text-brand"}`}>{msg.text}</p>}

      <Card className="p-6">
        <label htmlFor="status" className="text-lg font-bold">Status</label>
        <select id="status" className={`${inputCls} mt-3`} value={status} disabled={pending} onChange={(e) => start(async () => { const r = await setInquiryStatusAction(id, e.target.value); flash(r.ok, r.ok ? "Status updated." : r.error); router.refresh(); })}>
          {STATUSES.map((s) => <option key={s} value={s}>{s[0] + s.slice(1).toLowerCase()}</option>)}
        </select>
      </Card>

      <Card className="p-6">
        <label htmlFor="notes" className="text-lg font-bold">Internal notes</label>
        <p className="mt-1 text-xs">Only your team sees this.</p>
        <textarea id="notes" rows={5} value={n} onChange={(e) => setN(e.target.value)} className={`${inputCls} mt-3 h-auto py-3`} placeholder="Quoted FOB $4,200, buyer wants Nov loading…" />
        <Button size="sm" variant="secondary" className="mt-3" disabled={pending || n === notes} onClick={() => start(async () => { const r = await saveInquiryNotesAction(id, n); flash(r.ok, r.ok ? "Notes saved." : r.error); router.refresh(); })}><Check className="h-4 w-4" /> Save notes</Button>
      </Card>

      <Card className="p-6">
        <h2 className="text-lg font-bold">Reply by email</h2>
        <p className="mt-1 text-xs">Sent to {email}. Replies are logged here, and a New inquiry becomes Contacted.</p>
        <label htmlFor="subj" className="mt-4 block text-sm font-semibold text-charcoal dark:text-white">Subject</label>
        <input id="subj" className={`${inputCls} mt-1.5`} value={subject} onChange={(e) => setSubject(e.target.value)} />
        <label htmlFor="body" className="mt-4 block text-sm font-semibold text-charcoal dark:text-white">Message</label>
        <textarea id="body" rows={6} className={`${inputCls} mt-1.5 h-auto py-3`} value={body} onChange={(e) => setBody(e.target.value)} />
        <Button className="mt-4 w-full" disabled={pending || body.trim().length < 5} onClick={() => start(async () => { const r = await replyToInquiryAction(id, { subject, body }); flash(r.ok, r.ok ? "Email sent." : r.error); if (r.ok) setBody(""); router.refresh(); })}>
          <Send className="h-4 w-4" /> {pending ? "Sending…" : "Send email"}
        </Button>
      </Card>
    </div>
  );
}
