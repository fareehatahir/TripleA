"use server";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { emailSchema } from "@/lib/validation";

export async function subscribeAction(email: string, honeypot?: string): Promise<{ ok: boolean; error?: string }> {
  if (honeypot) return { ok: true };
  const parsed = emailSchema.safeParse(email);
  if (!parsed.success) return { ok: false, error: "Enter a valid email address" };
  if (!rateLimit(`news:${clientIp(await headers())}`, 5, 60 * 60_000).ok) return { ok: false, error: "Too many attempts. Try again later." };
  await db.subscriber.upsert({ where: { email: parsed.data }, update: {}, create: { email: parsed.data } });
  return { ok: true };
}
