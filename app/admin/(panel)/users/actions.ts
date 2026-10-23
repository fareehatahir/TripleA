"use server";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { assertRole } from "@/lib/session";
import { createUserSchema, passwordSchema } from "@/lib/validation";

type Result = { ok: true } | { ok: false; error: string };

async function lastSuperAdmin(userId: string) {
  const others = await db.user.count({ where: { role: "SUPER_ADMIN", active: true, id: { not: userId } } });
  return others === 0;
}

export async function createUserAction(input: unknown): Promise<Result> {
  const actor = await assertRole(["SUPER_ADMIN"]);
  const parsed = createUserSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { password, ...rest } = parsed.data;
  if (await db.user.findUnique({ where: { email: rest.email } })) return { ok: false, error: "A user with that email already exists." };
  const u = await db.user.create({ data: { ...rest, passwordHash: await bcrypt.hash(password, 12) } });
  await audit(actor, "create", "User", u.id, `Created ${u.role} account for ${u.email}`);
  revalidatePath("/admin/users");
  return { ok: true };
}

export async function setRoleAction(userId: string, role: "SUPER_ADMIN" | "EDITOR"): Promise<Result> {
  const actor = await assertRole(["SUPER_ADMIN"]);
  if (role !== "SUPER_ADMIN" && (await lastSuperAdmin(userId))) return { ok: false, error: "There must always be at least one active super admin." };
  const u = await db.user.update({ where: { id: userId }, data: { role } });
  await audit(actor, "update", "User", u.id, `Changed role of ${u.email} to ${role}`);
  revalidatePath("/admin/users");
  return { ok: true };
}

export async function setActiveAction(userId: string, active: boolean): Promise<Result> {
  const actor = await assertRole(["SUPER_ADMIN"]);
  if (userId === actor.id) return { ok: false, error: "You cannot deactivate your own account." };
  if (!active && (await lastSuperAdmin(userId))) return { ok: false, error: "There must always be at least one active super admin." };
  const u = await db.user.update({ where: { id: userId }, data: { active } });
  await audit(actor, "update", "User", u.id, `${active ? "Reactivated" : "Deactivated"} ${u.email}`);
  revalidatePath("/admin/users");
  return { ok: true };
}

export async function resetPasswordForUserAction(userId: string, password: string): Promise<Result> {
  const actor = await assertRole(["SUPER_ADMIN"]);
  const parsed = passwordSchema.safeParse(password);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const u = await db.user.update({ where: { id: userId }, data: { passwordHash: await bcrypt.hash(parsed.data, 12) } });
  await audit(actor, "update", "User", u.id, `Set a new password for ${u.email}`);
  return { ok: true };
}

export async function deleteUserAction(userId: string): Promise<Result> {
  const actor = await assertRole(["SUPER_ADMIN"]);
  if (userId === actor.id) return { ok: false, error: "You cannot delete your own account." };
  if (await lastSuperAdmin(userId)) return { ok: false, error: "There must always be at least one active super admin." };
  const u = await db.user.delete({ where: { id: userId } });
  await audit(actor, "delete", "User", u.id, `Deleted ${u.email}`);
  revalidatePath("/admin/users");
  return { ok: true };
}

export async function resetUserTotpAction(userId: string): Promise<Result> {
  const actor = await assertRole(["SUPER_ADMIN"]);
  const u = await db.user.update({ where: { id: userId }, data: { totpEnabled: false, totpSecret: null, totpBackupCodes: null } });
  await audit(actor, "update", "User", u.id, `Reset two-factor authentication for ${u.email}`);
  revalidatePath("/admin/users");
  return { ok: true };
}
