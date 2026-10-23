"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { moveRow } from "@/lib/order";
import { assertRole } from "@/lib/session";
import { rateSchema } from "@/lib/validation";

type Result = { ok: true } | { ok: false; error: string };
const refresh = () => (revalidatePath("/shipping"), revalidatePath("/admin/shipping-rates"));

export async function saveRateAction(id: string | null, input: unknown): Promise<Result> {
  const actor = await assertRole();
  const p = rateSchema.safeParse(input);
  if (!p.success) return { ok: false, error: p.error.issues[0].message };
  const r = id ? await db.shippingRate.update({ where: { id }, data: p.data }) : await db.shippingRate.create({ data: { ...p.data, order: await db.shippingRate.count() } });
  await audit(actor, id ? "update" : "create", "ShippingRate", r.id, `${id ? "Updated" : "Added"} freight rate ${r.country} / ${r.port}: $${r.freightUsd}`);
  refresh();
  return { ok: true };
}
export async function deleteRateAction(id: string): Promise<Result> {
  const actor = await assertRole();
  const r = await db.shippingRate.delete({ where: { id } });
  await audit(actor, "delete", "ShippingRate", id, `Deleted freight rate ${r.country} / ${r.port}`);
  refresh();
  return { ok: true };
}
export async function moveRateAction(id: string, dir: -1 | 1): Promise<Result> {
  await assertRole();
  await moveRow("shippingRate", id, dir);
  refresh();
  return { ok: true };
}
/** Pushes every validity date forward, the usual monthly chore when the lines confirm new rates. */
export async function extendAllRatesAction(days: number): Promise<Result> {
  const actor = await assertRole();
  if (!Number.isInteger(days) || days < 1 || days > 365) return { ok: false, error: "Choose between 1 and 365 days" };
  const rates = await db.shippingRate.findMany();
  const base = Date.now();
  await db.$transaction(rates.map((r) => db.shippingRate.update({ where: { id: r.id }, data: { validUntil: new Date(Math.max(r.validUntil.getTime(), base) + days * 86400000) } })));
  await audit(actor, "update", "ShippingRate", null, `Extended validity of ${rates.length} freight rates by ${days} days`);
  refresh();
  return { ok: true };
}
