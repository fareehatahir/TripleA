"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Download, Mail, MailOpen, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, EmptyState } from "@/components/admin/ui";
import { ConfirmDialog, Modal } from "@/components/admin/forms";
import { cn } from "@/lib/utils";
import { deleteMessagesAction, deleteSubscriberAction, setMessageReadAction } from "./actions";

type M = { id: string; name: string; email: string; phone: string | null; subject: string; message: string; isRead: boolean; createdAt: string };
type S = { id: string; email: string; createdAt: string };
const when = (d: string) => new Date(d).toLocaleString("en", { dateStyle: "medium", timeStyle: "short" });

export function MessagesManager({ tab, messages, subscribers, openId }: { tab: "messages" | "subscribers"; messages: M[]; subscribers: S[]; openId?: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState<M | null>(messages.find((m) => m.id === openId) ?? null);
  const [del, setDel] = useState<M | null>(null);
  const [unread, setUnread] = useState<"all" | "unread">("all");
  const shown = unread === "unread" ? messages.filter((m) => !m.isRead) : messages;

  const view = (m: M) => { setOpen(m); if (!m.isRead) start(async () => { await setMessageReadAction(m.id, true); router.refresh(); }); };

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" className="inline-flex rounded-xl bg-white p-1 shadow-soft dark:bg-charcoal">
          {(["messages", "subscribers"] as const).map((t) => (
            <button key={t} role="tab" aria-selected={tab === t} onClick={() => router.push(t === "messages" ? "/admin/messages" : "/admin/messages?tab=subscribers")} className={cn("rounded-lg px-5 py-2 text-sm font-semibold capitalize transition", tab === t ? "bg-charcoal text-white dark:bg-brand" : "hover:bg-mist dark:hover:bg-white/10")}>{t}</button>
          ))}
        </div>
        {tab === "subscribers" ? <Button asChild variant="ghost" size="sm"><a href="/api/admin/subscribers/export"><Download className="h-4 w-4" /> Export CSV</a></Button>
          : <div className="flex gap-2">{(["all", "unread"] as const).map((f) => <button key={f} onClick={() => setUnread(f)} aria-pressed={unread === f} className={cn("rounded-full px-4 py-1.5 text-sm font-semibold capitalize", unread === f ? "bg-charcoal text-white dark:bg-brand" : "bg-white hover:bg-silver/40 dark:bg-white/10")}>{f}</button>)}</div>}
      </div>

      {tab === "messages" ? (
        <Card>
          {shown.length === 0 ? <EmptyState icon={Mail} title={unread === "unread" ? "No unread messages" : "No messages yet"} text="Messages from the Contact page appear here and are emailed to you." /> : (
            <ul className="divide-y divide-silver/40 dark:divide-white/10">
              {shown.map((m) => (
                <li key={m.id}>
                  <button onClick={() => view(m)} className="flex w-full items-start gap-4 px-5 py-4 text-left transition hover:bg-mist/60 dark:hover:bg-white/5">
                    <span className={cn("mt-2 h-2.5 w-2.5 shrink-0 rounded-full", m.isRead ? "bg-transparent" : "bg-brand")} aria-label={m.isRead ? "Read" : "Unread"} />
                    <span className="min-w-0 flex-1">
                      <span className={cn("block truncate text-charcoal dark:text-white", !m.isRead && "font-bold")}>{m.subject}</span>
                      <span className="block truncate text-sm">{m.name} · {m.email}</span>
                      <span className="mt-0.5 line-clamp-1 text-sm">{m.message}</span>
                    </span>
                    <span className="shrink-0 text-xs">{when(m.createdAt)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      ) : (
        <Card>
          {subscribers.length === 0 ? <EmptyState icon={Mail} title="No subscribers yet" text="People who join the newsletter in the website footer appear here." /> : (
            <ul className="divide-y divide-silver/40 dark:divide-white/10">
              {subscribers.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-4 px-5 py-3 text-sm"><span className="font-medium text-charcoal dark:text-white">{s.email}</span><span className="flex items-center gap-3"><span className="text-xs">{when(s.createdAt)}</span><button aria-label={`Remove ${s.email}`} onClick={() => start(async () => { await deleteSubscriberAction(s.id); router.refresh(); })} className="grid h-8 w-8 place-items-center rounded-lg text-brand hover:bg-brand/10"><Trash2 className="h-4 w-4" /></button></span></li>
              ))}
            </ul>
          )}
        </Card>
      )}

      <Modal open={!!open} onClose={() => setOpen(null)} title={open?.subject ?? ""}>
        {open && (
          <div className="space-y-4 text-sm">
            <p><strong className="text-charcoal dark:text-white">{open.name}</strong> · <a className="text-brand hover:underline" href={`mailto:${open.email}`}>{open.email}</a>{open.phone && <> · {open.phone}</>}<br /><span className="text-xs">{when(open.createdAt)}</span></p>
            <p className="max-h-72 overflow-y-auto whitespace-pre-wrap rounded-xl bg-mist p-4 dark:bg-white/5">{open.message}</p>
            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm"><a href={`mailto:${open.email}?subject=${encodeURIComponent(`Re: ${open.subject}`)}`}><Mail className="h-4 w-4" /> Reply by email</a></Button>
              <Button size="sm" variant="ghost" disabled={pending} onClick={() => start(async () => { await setMessageReadAction(open.id, false); setOpen(null); router.refresh(); })}><MailOpen className="h-4 w-4" /> Mark unread</Button>
              <Button size="sm" variant="ghost" className="text-brand" onClick={() => (setDel(open), setOpen(null))}><Trash2 className="h-4 w-4" /> Delete</Button>
            </div>
          </div>
        )}
      </Modal>
      <ConfirmDialog open={!!del} title="Delete this message?" text="This cannot be undone." busy={pending} onClose={() => setDel(null)} onConfirm={() => del && start(async () => { await deleteMessagesAction([del.id]); setDel(null); router.refresh(); })} />
    </>
  );
}
