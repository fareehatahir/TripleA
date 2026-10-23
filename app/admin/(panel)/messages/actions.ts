"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { assertRole } from "@/lib/session";

type Result = { ok: true } | { ok: false; error: string };
const refresh = () => (revalidatePath("/admin/messages"), revalidatePath("/admin"));

export async function setMessageReadAction(id: string, isRead: boolean): Promise<Result> {
  await assertRole();
  await db.contactMessage.update({ where: { id }, data: { isRead } });
  refresh();
  return { ok: true };
}
export async function deleteMessagesAction(ids: string[]): Promise<Result> {
  const actor = await assertRole();
  const r = await db.contactMessage.deleteMany({ where: { id: { in: ids } } });
  await audit(actor, "delete", "ContactMessage", null, `Deleted ${r.count} contact message${r.count === 1 ? "" : "s"}`);
  refresh();
  return { ok: true };
}
export async function deleteSubscriberAction(id: string): Promise<Result> {
  const actor = await assertRole();
  const s = await db.subscriber.delete({ where: { id } });
  await audit(actor, "delete", "Subscriber", id, `Removed subscriber ${s.email}`);
  refresh();
  return { ok: true };
}
