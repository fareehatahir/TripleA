"use server";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import QRCode from "qrcode";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { hashBackup } from "@/lib/auth-check";
import { isLimited, recordHit } from "@/lib/rate-limit";
import { decryptSecret, encryptSecret } from "@/lib/secrets";
import { assertRole } from "@/lib/session";
import { generateTotpSecret, otpauthUrl, verifyTotp } from "@/lib/totp";
import { passwordSchema } from "@/lib/validation";

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

async function me() {
  const s = await assertRole();
  return db.user.findUniqueOrThrow({ where: { id: s.id } });
}

/** Password re-entry is required for security-sensitive changes, with its own failure limit. */
async function confirmPassword(userId: string, password: string) {
  const key = `acct:fail:${userId}`;
  if (isLimited(key, 6, 15 * 60_000).limited) return "Too many wrong passwords. Try again in a few minutes.";
  const u = await db.user.findUniqueOrThrow({ where: { id: userId } });
  if (!(await bcrypt.compare(password, u.passwordHash))) return recordHit(key), "That password is not correct.";
  return null;
}

export async function changePasswordAction(current: string, next: string): Promise<Result> {
  const user = await me();
  const bad = await confirmPassword(user.id, current);
  if (bad) return { ok: false, error: bad };
  const p = passwordSchema.safeParse(next);
  if (!p.success) return { ok: false, error: p.error.issues[0].message };
  if (next === current) return { ok: false, error: "Choose a password you have not used just now." };
  await db.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(next, 12) } });
  await audit(user, "update", "User", user.id, "Changed own password");
  return { ok: true };
}

export async function startTotpSetupAction(): Promise<Result<{ qr: string; secret: string }>> {
  const user = await me();
  if (user.totpEnabled) return { ok: false, error: "Two-factor authentication is already on." };
  const secret = generateTotpSecret();
  await db.user.update({ where: { id: user.id }, data: { totpSecret: encryptSecret(secret), totpEnabled: false } });
  const qr = await QRCode.toDataURL(otpauthUrl(secret, user.email), { margin: 1, width: 220 });
  return { ok: true, qr, secret };
}

export async function confirmTotpSetupAction(code: string): Promise<Result<{ backupCodes: string[] }>> {
  const user = await me();
  const secret = decryptSecret(user.totpSecret);
  if (!secret || user.totpEnabled) return { ok: false, error: "Start the setup again." };
  const key = `acct:totp:${user.id}`;
  if (isLimited(key, 8, 15 * 60_000).limited) return { ok: false, error: "Too many attempts. Try again in a few minutes." };
  if (!verifyTotp(secret, code, user.id)) return recordHit(key), { ok: false, error: "That code is not right. Check your phone's clock and try the newest code." };
  const plain = Array.from({ length: 10 }, () => randomBytes(4).toString("hex").replace(/(.{4})(.{4})/, "$1-$2"));
  await db.user.update({ where: { id: user.id }, data: { totpEnabled: true, totpBackupCodes: JSON.stringify(plain.map(hashBackup)) } });
  await audit(user, "update", "User", user.id, "Turned on two-factor authentication");
  return { ok: true, backupCodes: plain };
}

export async function disableTotpAction(password: string, code: string): Promise<Result> {
  const user = await me();
  const bad = await confirmPassword(user.id, password);
  if (bad) return { ok: false, error: bad };
  const secret = decryptSecret(user.totpSecret);
  const codes: string[] = JSON.parse(user.totpBackupCodes ?? "[]");
  const ok = (secret && verifyTotp(secret, code, user.id)) || codes.includes(hashBackup(code));
  if (!ok) return { ok: false, error: "That authentication code is not valid." };
  await db.user.update({ where: { id: user.id }, data: { totpEnabled: false, totpSecret: null, totpBackupCodes: null } });
  await audit(user, "update", "User", user.id, "Turned off two-factor authentication");
  return { ok: true };
}
