"use server";
import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { getAppSettingFresh, settingsSchemas } from "@/lib/app-settings";
import { sendMail } from "@/lib/mail";
import { encryptSecret } from "@/lib/secrets";
import { assertRole } from "@/lib/session";

type Result = { ok: true } | { ok: false; error: string };
const imgOk = (u: string) => !u || u.startsWith("/uploads/") || u.startsWith("https://");

async function store(key: string, value: object) {
  await db.siteSetting.upsert({ where: { key }, update: { value }, create: { key, value } });
  revalidateTag("settings");
  revalidateTag("content");
  revalidatePath("/", "layout");
}

export async function saveGeneralAction(input: unknown): Promise<Result> {
  const actor = await assertRole(["SUPER_ADMIN"]);
  const p = settingsSchemas.general.safeParse(input);
  if (!p.success) return { ok: false, error: p.error.issues[0].message };
  if (!imgOk(p.data.logoUrl) || !imgOk(p.data.faviconUrl)) return { ok: false, error: "Use an uploaded image for the logo and favicon" };
  await store("general", { ...p.data, brandColor: p.data.brandColor.toUpperCase() });
  await audit(actor, "update", "Settings", "general", "Updated general settings (name, logo, colours, currency)");
  return { ok: true };
}

export async function saveNotificationsAction(input: unknown): Promise<Result> {
  const actor = await assertRole(["SUPER_ADMIN"]);
  const p = settingsSchemas.notifications.safeParse(input);
  if (!p.success) return { ok: false, error: p.error.issues[0].message };
  await store("notifications", p.data);
  await audit(actor, "update", "Settings", "notifications", `Notification recipients: ${p.data.emails.join(", ") || "(default)"}`);
  return { ok: true };
}

const emailForm = z.object({
  provider: z.enum(["env", "smtp", "resend"]),
  from: z.string().max(200).default(""),
  smtpHost: z.string().max(200).default(""),
  smtpPort: z.coerce.number().int().min(1).max(65535).default(587),
  smtpUser: z.string().max(200).default(""),
  smtpPass: z.string().max(500).optional(), // blank = keep the saved one
  resendKey: z.string().max(500).optional(),
  clearSecrets: z.boolean().optional(),
});

export async function saveEmailAction(input: unknown): Promise<Result> {
  const actor = await assertRole(["SUPER_ADMIN"]);
  const p = emailForm.safeParse(input);
  if (!p.success) return { ok: false, error: p.error.issues[0].message };
  const v = p.data;
  const old = await getAppSettingFresh("email");
  const next = {
    provider: v.provider, from: v.from, smtpHost: v.smtpHost, smtpPort: v.smtpPort, smtpUser: v.smtpUser,
    smtpPassEnc: v.clearSecrets ? "" : v.smtpPass ? encryptSecret(v.smtpPass) : old.smtpPassEnc,
    resendKeyEnc: v.clearSecrets ? "" : v.resendKey ? encryptSecret(v.resendKey) : old.resendKeyEnc,
  };
  if (v.provider === "smtp" && !next.smtpHost) return { ok: false, error: "Enter the SMTP host" };
  if (v.provider === "resend" && !next.resendKeyEnc) return { ok: false, error: "Enter your Resend API key" };
  await store("email", next);
  await audit(actor, "update", "Settings", "email", `Email delivery set to ${v.provider}`); // never log secrets
  return { ok: true };
}

export async function saveMaintenanceAction(input: unknown): Promise<Result> {
  const actor = await assertRole(["SUPER_ADMIN"]);
  const p = settingsSchemas.maintenance.safeParse(input);
  if (!p.success) return { ok: false, error: p.error.issues[0].message };
  await store("maintenance", p.data);
  await audit(actor, "update", "Settings", "maintenance", `Maintenance mode ${p.data.enabled ? "ON" : "OFF"}`);
  return { ok: true };
}

export async function sendTestEmailAction(to: string): Promise<Result> {
  const actor = await assertRole(["SUPER_ADMIN"]);
  const addr = z.string().email().safeParse(to);
  if (!addr.success) return { ok: false, error: "Enter a valid email address" };
  try {
    await sendMail({ to: addr.data, subject: "Test email from Triple A admin", text: "If you can read this, email delivery from your website works." });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message.slice(0, 200) : "Sending failed" };
  }
  await audit(actor, "update", "Settings", "email", `Sent a test email to ${addr.data}`);
  return { ok: true };
}
