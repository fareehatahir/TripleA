"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { replyEmail } from "@/lib/email-templates";
import { sendMail } from "@/lib/mail";
import { getSiteConfig } from "@/lib/content";
import { assertRole } from "@/lib/session";
import { replySchema } from "@/lib/validation";

type Result = { ok: true } | { ok: false; error: string };
const STATUSES = ["NEW", "CONTACTED", "QUOTED", "WON", "LOST"] as const;

export async function setInquiryStatusAction(id: string, status: string): Promise<Result> {
  const actor = await assertRole();
  if (!(STATUSES as readonly string[]).includes(status)) return { ok: false, error: "Invalid status" };
  const q = await db.inquiry.update({ where: { id }, data: { status: status as (typeof STATUSES)[number] } });
  await audit(actor, "update", "Inquiry", id, `Inquiry ${q.reference} → ${status}`);
  revalidatePath("/admin/inquiries");
  revalidatePath("/admin");
  return { ok: true };
}

export async function saveInquiryNotesAction(id: string, notes: string): Promise<Result> {
  const actor = await assertRole();
  if (notes.length > 5000) return { ok: false, error: "Notes are limited to 5,000 characters" };
  const q = await db.inquiry.update({ where: { id }, data: { notes: notes.trim() || null } });
  await audit(actor, "update", "Inquiry", id, `Edited internal notes on ${q.reference}`);
  return { ok: true };
}

export async function replyToInquiryAction(id: string, input: unknown): Promise<Result> {
  const actor = await assertRole();
  const p = replySchema.safeParse(input);
  if (!p.success) return { ok: false, error: p.error.issues[0].message };
  const q = await db.inquiry.findUnique({ where: { id } });
  if (!q) return { ok: false, error: "Inquiry not found" };
  const mail = replyEmail(q.name, p.data.body, q.reference, await getSiteConfig());
  try {
    await sendMail({ to: q.email, subject: p.data.subject, ...mail });
  } catch (e) {
    console.error("[inquiry] reply failed", e);
    return { ok: false, error: "Could not send the email. Check the SMTP settings and try again." };
  }
  await db.inquiryReply.create({ data: { inquiryId: id, subject: p.data.subject, body: p.data.body, sentBy: actor.email } });
  if (q.status === "NEW") await db.inquiry.update({ where: { id }, data: { status: "CONTACTED" } });
  await audit(actor, "update", "Inquiry", id, `Replied by email to ${q.reference}`);
  revalidatePath(`/admin/inquiries/${id}`);
  revalidatePath("/admin/inquiries");
  return { ok: true };
}
