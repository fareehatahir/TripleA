"use server";
import { randomBytes } from "crypto";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { countryNames } from "@/lib/countries";
import { adminInquiryEmail, buyerInquiryEmail } from "@/lib/email-templates";
import { sendMail } from "@/lib/mail";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { getNotifyEmails } from "@/lib/settings";
import { getSiteConfig } from "@/lib/content";
import { inquirySchema } from "@/lib/validation";

type Result = { ok: true; reference: string; summary: string } | { ok: false; error: string; field?: string };

async function newReference() {
  const d = new Date();
  const day = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  for (;;) {
    const ref = `TA-${day}-${randomBytes(3).toString("hex").toUpperCase()}`;
    if (!(await db.inquiry.findUnique({ where: { reference: ref }, select: { id: true } }))) return ref;
  }
}

export async function submitInquiryAction(input: unknown): Promise<Result> {
  const parsed = inquirySchema.safeParse(input);
  if (!parsed.success) {
    const i = parsed.error.issues[0];
    return { ok: false, error: i.message, field: String(i.path[0] ?? "") };
  }
  const v = parsed.data;

  // Honeypot: bots fill the hidden field. Pretend it worked so they do not retry.
  if (v.website) return { ok: true, reference: "TA-000000-000000", summary: "" };

  const ip = clientIp(await headers());
  if (!rateLimit(`inquiry:ip:${ip}`, 5, 60 * 60_000).ok || !rateLimit(`inquiry:email:${v.email}`, 5, 60 * 60_000).ok)
    return { ok: false, error: "Too many inquiries from your connection. Please try again later or contact us on WhatsApp." };
  if (!countryNames.has(v.country)) return { ok: false, error: "Choose your country from the list", field: "country" };
  if (!v.items.length && !v.message) return { ok: false, error: "Add at least one item or write a message", field: "message" };

  // Titles/SKUs come from the database, never from the browser.
  const ids = [...new Set(v.items.map((i) => i.productId))];
  const products = await db.product.findMany({ where: { id: { in: ids }, status: { in: ["PUBLISHED", "SOLD"] } }, select: { id: true, title: true, sku: true } });
  const byId = new Map(products.map((p) => [p.id, p]));
  const lines = v.items.filter((i) => byId.has(i.productId)).map((i) => ({ productId: i.productId, title: byId.get(i.productId)!.title, sku: byId.get(i.productId)!.sku, qty: i.qty, note: i.note || null }));
  if (v.items.length && !lines.length) return { ok: false, error: "Those items are no longer available. Please refresh your list." };

  const reference = await newReference();
  const inquiry = await db.inquiry.create({
    data: { reference, name: v.name, company: v.company || null, country: v.country, phone: v.phone, email: v.email, port: v.port || null, message: v.message || null, items: { create: lines } },
  });

  const mail = { ...inquiry, items: lines };
  try {
    const site = await getSiteConfig();
    const admin = adminInquiryEmail(mail, `${site.url}/admin/inquiries/${inquiry.id}`, site);
    await sendMail({ to: await getNotifyEmails(), replyTo: v.email, ...admin });
    await sendMail({ to: v.email, ...buyerInquiryEmail(mail, site) });
  } catch (e) {
    // The inquiry is saved and visible in admin; never lose a lead because SMTP hiccuped.
    console.error("[inquiry] email failed", e);
  }

  return { ok: true, reference, summary: lines.map((l) => `${l.title} (${l.sku}) x${l.qty}`).join("; ") };
}
