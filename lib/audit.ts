import { db } from "@/lib/db";

type Actor = { id: string; email: string };

/** Call from every admin create/update/delete. */
export async function audit(actor: Actor, action: string, entity: string, entityId: string | null, summary: string, meta?: object) {
  await db.auditLog.create({
    data: { userId: actor.id, userEmail: actor.email, action, entity, entityId, summary, meta: meta as object | undefined },
  });
}
