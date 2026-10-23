/* eslint-disable @next/next/no-img-element -- QR code is a data: URL */
"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Check, Copy, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/admin/ui";
import { Field } from "@/components/admin/forms";
import { changePasswordAction, confirmTotpSetupAction, disableTotpAction, startTotpSetupAction } from "./actions";

const note = (m: { ok: boolean; text: string } | null) => m && <p role={m.ok ? "status" : "alert"} className={`mt-4 rounded-xl px-4 py-3 text-sm font-medium ${m.ok ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-brand/10 text-brand"}`}>{m.text}</p>;

function PasswordCard() {
  const [cur, setCur] = useState(""), [next, setNext] = useState(""), [again, setAgain] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  return (
    <Card className="p-6">
      <h2 className="text-lg font-bold">Change password</h2>
      <form className="mt-4 space-y-4" onSubmit={(e) => { e.preventDefault(); if (next !== again) return setMsg({ ok: false, text: "The new passwords do not match." }); start(async () => { const r = await changePasswordAction(cur, next); setMsg({ ok: r.ok, text: r.ok ? "Password changed." : r.error }); if (r.ok) { setCur(""); setNext(""); setAgain(""); } }); }}>
        <Field label="Current password" type="password" autoComplete="current-password" value={cur} onChange={(e) => setCur(e.target.value)} />
        <Field label="New password" type="password" autoComplete="new-password" hint="At least 10 characters, with a letter and a number." value={next} onChange={(e) => setNext(e.target.value)} />
        <Field label="Repeat new password" type="password" autoComplete="new-password" value={again} onChange={(e) => setAgain(e.target.value)} />
        <Button disabled={pending || !cur || !next}>{pending ? "Saving…" : "Change password"}</Button>
      </form>
      {note(msg)}
    </Card>
  );
}

function TwoFactorCard({ enabled, backupLeft }: { enabled: boolean; backupLeft: number }) {
  const router = useRouter();
  const [setup, setSetup] = useState<{ qr: string; secret: string } | null>(null);
  const [codes, setCodes] = useState<string[] | null>(null);
  const [code, setCode] = useState(""), [pw, setPw] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();

  if (codes)
    return (
      <Card className="p-6">
        <h2 className="flex items-center gap-2 text-lg font-bold"><ShieldCheck className="h-5 w-5 text-emerald-600" /> Two-factor authentication is on</h2>
        <p className="mt-2 text-sm">Save these backup codes somewhere safe. Each works once if you lose your phone. <strong className="text-charcoal dark:text-white">They will not be shown again.</strong></p>
        <ul className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-mist p-4 font-mono text-sm dark:bg-white/5">{codes.map((c) => <li key={c}>{c}</li>)}</ul>
        <div className="mt-4 flex gap-2">
          <Button variant="ghost" size="sm" onClick={async () => { try { await navigator.clipboard.writeText(codes.join("\n")); setCopied(true); } catch {} }}>{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? "Copied" : "Copy codes"}</Button>
          <Button size="sm" onClick={() => (setCodes(null), router.refresh())}>I have saved them</Button>
        </div>
      </Card>
    );

  if (enabled)
    return (
      <Card className="p-6">
        <h2 className="flex items-center gap-2 text-lg font-bold"><ShieldCheck className="h-5 w-5 text-emerald-600" /> Two-factor authentication is on</h2>
        <p className="mt-2 text-sm">{backupLeft} backup code{backupLeft === 1 ? "" : "s"} left.</p>
        <form className="mt-4 space-y-4" onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await disableTotpAction(pw, code); if (r.ok) { setPw(""); setCode(""); router.refresh(); } else setMsg({ ok: false, text: r.error }); }); }}>
          <p className="text-sm">To turn it off, confirm your password and a current code.</p>
          <Field label="Password" type="password" autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} />
          <Field label="Authentication or backup code" inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value)} />
          <Button variant="ghost" disabled={pending || !pw || !code}>Turn off two-factor</Button>
        </form>
        {note(msg)}
      </Card>
    );

  return (
    <Card className="p-6">
      <h2 className="text-lg font-bold">Two-factor authentication</h2>
      <p className="mt-2 text-sm">Adds a 6-digit code from your phone to every sign-in. Strongly recommended for anyone who can change products or settings.</p>
      {!setup ? (
        <Button className="mt-4" disabled={pending} onClick={() => start(async () => { const r = await startTotpSetupAction(); if (r.ok) { setSetup({ qr: r.qr, secret: r.secret }); setMsg(null); } else setMsg({ ok: false, text: r.error }); })}>Set up</Button>
      ) : (
        <div className="mt-5 space-y-4">
          <ol className="list-decimal space-y-1 pl-5 text-sm"><li>Open an authenticator app (Google Authenticator, Authy, 1Password…).</li><li>Scan this code, or type the key by hand.</li><li>Enter the 6-digit code it shows.</li></ol>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={setup.qr} alt="QR code to scan with your authenticator app" width={220} height={220} className="rounded-xl border border-silver/60 bg-white p-2" />
          <p className="text-xs">Manual key: <code className="select-all rounded bg-mist px-1.5 py-0.5 font-mono text-charcoal dark:bg-white/10 dark:text-white">{setup.secret}</code></p>
          <form className="flex items-end gap-3" onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await confirmTotpSetupAction(code); if (r.ok) { setCodes(r.backupCodes); setSetup(null); setCode(""); } else setMsg({ ok: false, text: r.error }); }); }}>
            <Field label="6-digit code" inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value)} className="max-w-[12rem]" />
            <Button disabled={pending || code.length < 6}>Turn on</Button>
          </form>
        </div>
      )}
      {note(msg)}
    </Card>
  );
}

export function AccountForms({ totpEnabled, backupLeft }: { totpEnabled: boolean; backupLeft: number }) {
  return <div className="grid gap-6 xl:grid-cols-2"><PasswordCard /><TwoFactorCard enabled={totpEnabled} backupLeft={backupLeft} /></div>;
}
