/* eslint-disable @next/next/no-img-element -- small admin previews of uploaded files */
"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Check, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, inputCls } from "@/components/admin/ui";
import { Dropzone } from "@/components/admin/uploader";
import { cn } from "@/lib/utils";
import { saveEmailAction, saveGeneralAction, saveMaintenanceAction, saveNotificationsAction, sendTestEmailAction } from "./actions";

type Res = { ok: true } | { ok: false; error: string };
const lbl = "mb-1.5 block text-sm font-semibold text-charcoal dark:text-white";

function Section({ title, hint, children, onSave, savedLabel = "Settings saved." }: { title: string; hint?: string; children: React.ReactNode; onSave: () => Promise<Res>; savedLabel?: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  return (
    <Card className="p-6">
      <h2 className="text-lg font-bold">{title}</h2>
      {hint && <p className="mt-1 text-sm">{hint}</p>}
      <div className="mt-5 space-y-4">{children}</div>
      {msg && <p role={msg.ok ? "status" : "alert"} className={cn("mt-4 flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium", msg.ok ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-brand/10 text-brand")}>{msg.ok && <Check className="h-4 w-4" />}{msg.text}</p>}
      <Button className="mt-5" disabled={pending} onClick={() => start(async () => { const r = await onSave(); setMsg({ ok: r.ok, text: r.ok ? savedLabel : r.error }); if (r.ok) router.refresh(); })}>{pending ? "Saving…" : "Save"}</Button>
    </Card>
  );
}

type General = { siteName: string; logoUrl: string; faviconUrl: string; brandColor: string; defaultCurrency: string; watermark: boolean };
type EmailState = { provider: "env" | "smtp" | "resend"; from: string; smtpHost: string; smtpPort: number; smtpUser: string; hasSmtpPass: boolean; hasResendKey: boolean; envSmtp: boolean };

export function SettingsForms({ general, notifications, email, maintenance }: { general: General; notifications: string[]; email: EmailState; maintenance: { enabled: boolean; message: string } }) {
  const [g, setG] = useState(general);
  const [emails, setEmails] = useState(notifications.join("\n"));
  const [em, setEm] = useState({ ...email, smtpPass: "", resendKey: "", clearSecrets: false });
  const [mt, setMt] = useState(maintenance);
  const [testTo, setTestTo] = useState("");
  const [testMsg, setTestMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  const picture = (key: "logoUrl" | "faviconUrl", title: string, hint: string) => (
    <div>
      <p className={lbl}>{title}</p>
      {g[key] && <div className="mb-3 flex items-center gap-3">{/* eslint-disable-next-line @next/next/no-img-element */}<img src={g[key]} alt="" className="h-14 max-w-[10rem] rounded-lg bg-mist object-contain p-1 dark:bg-white/10" /><button type="button" className="text-sm font-semibold text-brand hover:underline" onClick={() => setG({ ...g, [key]: "" })}>Remove</button></div>}
      <Dropzone compact multiple={false} label={g[key] ? "Replace image" : "Drop an image or click"} onUploaded={(a) => setG({ ...g, [key]: a[0].url })} />
      <p className="mt-1 text-xs">{hint}</p>
    </div>
  );

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Section title="Site identity" hint="Name, logo, favicon, brand colour and defaults." onSave={() => saveGeneralAction(g)}>
        <div><label htmlFor="sn" className={lbl}>Site name</label><input id="sn" className={inputCls} value={g.siteName} onChange={(e) => setG({ ...g, siteName: e.target.value })} /></div>
        {picture("logoUrl", "Logo", "Leave empty to use the built-in Triple A logo. A wide image on a transparent or white background works best.")}
        {picture("faviconUrl", "Favicon (browser tab icon)", "A square image, at least 256×256 pixels.")}
        <div>
          <label htmlFor="bc" className={lbl}>Brand colour</label>
          <div className="flex items-center gap-3">
            <input type="color" aria-label="Pick brand colour" value={/^#[0-9a-f]{6}$/i.test(g.brandColor) ? g.brandColor : "#C8102E"} onChange={(e) => setG({ ...g, brandColor: e.target.value.toUpperCase() })} className="h-11 w-14 cursor-pointer rounded-lg border border-silver/70 bg-white p-1" />
            <input id="bc" className={cn(inputCls, "max-w-[9rem] font-mono")} value={g.brandColor} onChange={(e) => setG({ ...g, brandColor: e.target.value })} />
            <button type="button" className="text-sm font-semibold text-brand hover:underline" onClick={() => setG({ ...g, brandColor: "#C8102E" })}>Reset</button>
          </div>
          <p className="mt-1 text-xs">Used for buttons, links and accents across the website and admin. Pick a colour dark enough for white text.</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div><label htmlFor="cur" className={lbl}>Default currency</label><input id="cur" maxLength={3} className={cn(inputCls, "uppercase")} value={g.defaultCurrency} onChange={(e) => setG({ ...g, defaultCurrency: e.target.value.toUpperCase() })} /><p className="mt-1 text-xs">For new products, e.g. USD.</p></div>
        </div>
        <label className="flex cursor-pointer items-start gap-3 text-sm"><input type="checkbox" checked={g.watermark} onChange={(e) => setG({ ...g, watermark: e.target.checked })} className="mt-0.5 h-5 w-5 accent-brand" /><span><strong className="text-charcoal dark:text-white">Stamp the logo on new product photos</strong><br />Applies to photos uploaded from now on.</span></label>
      </Section>

      <div className="space-y-6">
        <Section title="Notifications" hint="Who receives an email when a buyer sends an inquiry or a contact message." onSave={() => saveNotificationsAction({ emails: emails.split(/[\s,;]+/).filter(Boolean) })}>
          <div><label htmlFor="ne" className={lbl}>Email addresses (one per line)</label><textarea id="ne" rows={3} className={cn(inputCls, "h-auto py-3")} value={emails} onChange={(e) => setEmails(e.target.value)} placeholder="sales@tripleaint.tw" /><p className="mt-1 text-xs">Leave empty to use the default address.</p></div>
        </Section>

        <Section title="Email delivery" hint="How the website sends email. Passwords and keys are stored encrypted." onSave={() => saveEmailAction({ ...em, smtpPass: em.smtpPass || undefined, resendKey: em.resendKey || undefined })}>
          <div><label htmlFor="ep" className={lbl}>Send email using</label>
            <select id="ep" className={inputCls} value={em.provider} onChange={(e) => setEm({ ...em, provider: e.target.value as EmailState["provider"] })}>
              <option value="env">Server defaults{em.envSmtp ? " (SMTP configured)" : " (none: emails are printed to the server log)"}</option>
              <option value="smtp">SMTP server</option><option value="resend">Resend</option>
            </select></div>
          <div><label htmlFor="ef" className={lbl}>From address</label><input id="ef" className={inputCls} value={em.from} onChange={(e) => setEm({ ...em, from: e.target.value })} placeholder="Triple A International <info@tripleaint.tw>" /></div>
          {em.provider === "smtp" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div><label htmlFor="sh" className={lbl}>SMTP host</label><input id="sh" className={inputCls} value={em.smtpHost} onChange={(e) => setEm({ ...em, smtpHost: e.target.value })} /></div>
              <div><label htmlFor="sp" className={lbl}>Port</label><input id="sp" type="number" className={inputCls} value={em.smtpPort} onChange={(e) => setEm({ ...em, smtpPort: Number(e.target.value) })} /></div>
              <div><label htmlFor="su" className={lbl}>Username</label><input id="su" autoComplete="off" className={inputCls} value={em.smtpUser} onChange={(e) => setEm({ ...em, smtpUser: e.target.value })} /></div>
              <div><label htmlFor="sw" className={lbl}>Password</label><input id="sw" type="password" autoComplete="new-password" className={inputCls} value={em.smtpPass} onChange={(e) => setEm({ ...em, smtpPass: e.target.value })} placeholder={em.hasSmtpPass ? "•••••••• saved (leave blank to keep)" : ""} /></div>
            </div>
          )}
          {em.provider === "resend" && <div><label htmlFor="rk" className={lbl}>Resend API key</label><input id="rk" type="password" autoComplete="new-password" className={inputCls} value={em.resendKey} onChange={(e) => setEm({ ...em, resendKey: e.target.value })} placeholder={em.hasResendKey ? "•••••••• saved (leave blank to keep)" : "re_…"} /></div>}
          {(em.hasSmtpPass || em.hasResendKey) && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={em.clearSecrets} onChange={(e) => setEm({ ...em, clearSecrets: e.target.checked })} className="h-4 w-4 accent-brand" /> Remove the saved password / key</label>}
          <div className="rounded-xl bg-mist p-4 dark:bg-white/5">
            <label htmlFor="tt" className={lbl}>Send a test email (save first)</label>
            <div className="flex gap-2"><input id="tt" type="email" className={inputCls} value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="you@example.com" /><Button type="button" variant="secondary" disabled={pending || !testTo} onClick={() => start(async () => { const r = await sendTestEmailAction(testTo); setTestMsg({ ok: r.ok, text: r.ok ? "Test email sent." : r.error }); })}><Send className="h-4 w-4" /> Send</Button></div>
            {testMsg && <p role={testMsg.ok ? "status" : "alert"} className={cn("mt-2 text-sm font-medium", testMsg.ok ? "text-emerald-700 dark:text-emerald-300" : "text-brand")}>{testMsg.text}</p>}
          </div>
        </Section>

        <Section title="Maintenance mode" hint="Show visitors a “back soon” page. You stay signed in and can still see and edit the site." onSave={() => saveMaintenanceAction(mt)}>
          <label className="flex cursor-pointer items-center gap-3 text-sm font-semibold text-charcoal dark:text-white"><input type="checkbox" checked={mt.enabled} onChange={(e) => setMt({ ...mt, enabled: e.target.checked })} className="h-5 w-5 accent-brand" /> Turn maintenance mode on</label>
          <div><label htmlFor="mm" className={lbl}>Message</label><textarea id="mm" rows={3} className={cn(inputCls, "h-auto py-3")} value={mt.message} onChange={(e) => setMt({ ...mt, message: e.target.value })} /></div>
        </Section>
      </div>
    </div>
  );
}
