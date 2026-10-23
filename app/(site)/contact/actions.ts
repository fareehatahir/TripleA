"use server";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { getSiteConfig } from "@/lib/content";
import { sendMail } from "@/lib/mail";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { getNotifyEmails } from "@/lib/settings";
import { verifyTurnstile } from "@/lib/turnstile";
import { contactSchema } from "@/lib/validation";

type Result = { ok: true } | { ok: false; error: string; field?: string };

export async function submitContactAction(input: unknown): Promise<Result> {
  const parsed = contactSchema.safeParse(input);
  if (!parsed.success) {
    const i = parsed.error.issues[0];
    return { ok: false, error: i.message, field: String(i.path[0] ?? "") };
  }
  const v = parsed.data;
  if (v.website) return { ok: true }; // honeypot

  const ip = clientIp(await headers());
  if (!rateLimit(`contact:ip:${ip}`, 5, 60 * 60_000).ok) return { ok: false, error: "Too many messages from your connection. Please try again later." };
  if (!(await verifyTurnstile(v.token, ip))) return { ok: false, error: "Spam check failed. Please reload the page and try again." };

  const m = await db.contactMessage.create({ data: { name: v.name, email: v.email, phone: v.phone || null, subject: v.subject, message: v.message } });
  try {
    await sendMail({
      to: await getNotifyEmails(), replyTo: v.email, subject: `Contact form: ${v.subject}`,
      text: `From: ${v.name} <${v.email}>${v.phone ? `\nPhone: ${v.phone}` : ""}\n\n${v.message}\n\nOpen in admin: ${(await getSiteConfig()).url}/admin/messages?open=${m.id}`,
    });
  } catch (e) {
    console.error("[contact] email failed", e);
  }
  return { ok: true };
}
