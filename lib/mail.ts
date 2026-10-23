import nodemailer from "nodemailer";
import { getAppSetting } from "@/lib/app-settings";
import { decryptSecret } from "@/lib/secrets";

type Mail = { to: string | string[]; subject: string; text: string; html?: string; replyTo?: string };

/**
 * Sends email using, in order: Admin > Settings (SMTP or Resend), then SMTP_* environment variables,
 * then prints to the server console (development) so nothing is silently lost.
 */
export async function sendMail(mail: Mail) {
  const cfg = await getAppSetting("email");
  const to = [mail.to].flat();
  const from = cfg.from || process.env.MAIL_FROM || "Triple A International <info@tripleaint.tw>";

  if (cfg.provider === "resend") {
    const key = decryptSecret(cfg.resendKeyEnc);
    if (!key) throw new Error("Resend is selected but no API key is saved in Settings");
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, subject: mail.subject, text: mail.text, html: mail.html, reply_to: mail.replyTo }),
    });
    if (!res.ok) throw new Error(`Resend error ${res.status}: ${(await res.text()).slice(0, 200)}`);
    return;
  }

  const smtp =
    cfg.provider === "smtp"
      ? { host: cfg.smtpHost, port: cfg.smtpPort, user: cfg.smtpUser, pass: decryptSecret(cfg.smtpPassEnc) ?? "" }
      : process.env.SMTP_HOST
        ? { host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT ?? 587), user: process.env.SMTP_USER ?? "", pass: process.env.SMTP_PASS ?? "" }
        : null;

  if (!smtp?.host) {
    console.log(`\n[mail:dev] To: ${to.join(", ")}\n[mail:dev] Subject: ${mail.subject}\n${mail.text}\n`);
    return;
  }
  const transport = nodemailer.createTransport({ host: smtp.host, port: smtp.port, secure: smtp.port === 465, auth: smtp.user ? { user: smtp.user, pass: smtp.pass } : undefined });
  await transport.sendMail({ from, to, subject: mail.subject, text: mail.text, html: mail.html, replyTo: mail.replyTo });
}
