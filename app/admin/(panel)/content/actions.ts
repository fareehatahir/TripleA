"use server";
import { revalidatePath, revalidateTag } from "next/cache";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { contentSchemas, type ContentKey } from "@/lib/content";
import { moveRow } from "@/lib/order";
import { cleanHtml } from "@/lib/sanitize";
import { assertRole } from "@/lib/session";
import { faqSchema, testimonialSchema } from "@/lib/validation";

type Result = { ok: true } | { ok: false; error: string };
const publish = () => { revalidateTag("content"); revalidatePath("/", "layout"); };

// Rich-text fields that must be cleaned before storing, per block
const RICH: Partial<Record<ContentKey, string[]>> = { about: ["intro"], shipping: ["intro"], legal: ["privacy", "terms"] };

export async function saveContentAction(key: string, data: unknown): Promise<Result> {
  const actor = await assertRole();
  if (!(key in contentSchemas)) return { ok: false, error: "Unknown content block" };
  const k = key as ContentKey;
  const parsed = contentSchemas[k].safeParse(data);
  if (!parsed.success) {
    const i = parsed.error.issues[0];
    return { ok: false, error: `${i.path.join(" › ") || "Form"}: ${i.message}` };
  }
  const value = parsed.data as Record<string, unknown>;
  for (const f of RICH[k] ?? []) value[f] = cleanHtml(value[f] as string) ?? "";
  if (k === "site") {
    // Only http(s) social links; WhatsApp digits only
    const site = value as { social: { label: string; href: string }[]; whatsapp: string };
    site.social = site.social.filter((s) => s.label && /^https?:\/\//.test(s.href));
    site.whatsapp = site.whatsapp.replace(/\D/g, "");
  }
  await db.contentBlock.upsert({ where: { key }, update: { value: value as object }, create: { key, value: value as object } });
  await audit(actor, "update", "Content", key, `Edited “${key}” content`);
  publish();
  return { ok: true };
}

export async function resetContentAction(key: string): Promise<Result> {
  const actor = await assertRole();
  await db.contentBlock.deleteMany({ where: { key } });
  await audit(actor, "update", "Content", key, `Reset “${key}” content to defaults`);
  publish();
  return { ok: true };
}

// ---------- FAQs ----------
export async function saveFaqAction(id: string | null, input: unknown): Promise<Result> {
  const actor = await assertRole();
  const p = faqSchema.safeParse(input);
  if (!p.success) return { ok: false, error: p.error.issues[0].message };
  const f = id ? await db.faq.update({ where: { id }, data: p.data }) : await db.faq.create({ data: { ...p.data, order: await db.faq.count() } });
  await audit(actor, id ? "update" : "create", "Faq", f.id, `${id ? "Updated" : "Added"} FAQ “${f.question.slice(0, 60)}”`);
  publish();
  return { ok: true };
}
export async function deleteFaqAction(id: string): Promise<Result> {
  const actor = await assertRole();
  const f = await db.faq.delete({ where: { id } });
  await audit(actor, "delete", "Faq", id, `Deleted FAQ “${f.question.slice(0, 60)}”`);
  publish();
  return { ok: true };
}
export async function moveFaqAction(id: string, dir: -1 | 1): Promise<Result> {
  await assertRole();
  await moveRow("faq", id, dir);
  publish();
  return { ok: true };
}

// ---------- Testimonials ----------
export async function saveTestimonialAction(id: string | null, input: unknown): Promise<Result> {
  const actor = await assertRole();
  const p = testimonialSchema.safeParse(input);
  if (!p.success) return { ok: false, error: p.error.issues[0].message };
  const t = id ? await db.testimonial.update({ where: { id }, data: p.data }) : await db.testimonial.create({ data: { ...p.data, order: await db.testimonial.count() } });
  await audit(actor, id ? "update" : "create", "Testimonial", t.id, `${id ? "Updated" : "Added"} testimonial from ${t.name}`);
  publish();
  return { ok: true };
}
export async function deleteTestimonialAction(id: string): Promise<Result> {
  const actor = await assertRole();
  const t = await db.testimonial.delete({ where: { id } });
  await audit(actor, "delete", "Testimonial", id, `Deleted testimonial from ${t.name}`);
  publish();
  return { ok: true };
}
export async function moveTestimonialAction(id: string, dir: -1 | 1): Promise<Result> {
  await assertRole();
  await moveRow("testimonial", id, dir);
  publish();
  return { ok: true };
}
