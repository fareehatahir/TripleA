import { createHash } from "crypto";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { isLimited, recordHit, resetKey } from "@/lib/rate-limit";
import { decryptSecret } from "@/lib/secrets";
import { verifyTotp } from "@/lib/totp";

const WINDOW = 15 * 60_000;
const DUMMY_HASH = "$2a$12$C6UzMDM.H6dfI/f/IKcEeO5GzVwzFqj9G9d8x9yq3nG1x0f1x2y3e"; // equalises timing for unknown emails

export const hashBackup = (c: string) => createHash("sha256").update(c.toLowerCase().replace(/[^a-z0-9]/g, "")).digest("hex");

export type CheckResult =
  | { ok: true; user: { id: string; email: string; name: string; role: "SUPER_ADMIN" | "EDITOR" } }
  | { ok: false; reason: "invalid" | "locked" | "need2fa" | "bad2fa"; retryAfter?: number };

/**
 * The single place that decides whether a sign-in is allowed: password, lockout and (when enabled) the 2FA code.
 * Only FAILED attempts count toward the lockout (8 per email, 20 per IP, per 15 minutes).
 * Both the login form and the Auth.js credentials endpoint go through here, so neither can bypass the other.
 */
export async function checkCredentials(a: { email: string; password: string; code?: string; ip: string; peek?: boolean }): Promise<CheckResult> {
  const kEmail = `login:fail:email:${a.email}`, kIp = `login:fail:ip:${a.ip}`;
  const e = isLimited(kEmail, 8, WINDOW), i = isLimited(kIp, 20, WINDOW);
  if (e.limited || i.limited) return { ok: false, reason: "locked", retryAfter: Math.max(e.retryAfter, i.retryAfter) };

  const fail = (reason: "invalid" | "bad2fa"): CheckResult => (recordHit(kEmail), recordHit(kIp), { ok: false, reason });

  const user = await db.user.findUnique({ where: { email: a.email } });
  const valid = await bcrypt.compare(a.password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !user.active || !valid) return fail("invalid");

  if (user.totpEnabled) {
    if (!a.code?.trim()) return { ok: false, reason: "need2fa" };
    const secret = decryptSecret(user.totpSecret);
    let good = !!secret && verifyTotp(secret, a.code, user.id, Date.now(), !a.peek);
    if (!good) {
      const codes: string[] = JSON.parse(user.totpBackupCodes ?? "[]");
      const h = hashBackup(a.code);
      if (codes.includes(h)) {
        if (!a.peek) await db.user.update({ where: { id: user.id }, data: { totpBackupCodes: JSON.stringify(codes.filter((c) => c !== h)) } });
        if (!a.peek) await db.auditLog.create({ data: { userId: user.id, userEmail: user.email, action: "login", entity: "User", entityId: user.id, summary: "Used a 2FA backup code" } });
        good = true;
      }
    }
    if (!good) return fail("bad2fa");
  }
  resetKey(kEmail);
  return { ok: true, user: { id: user.id, email: user.email, name: user.name, role: user.role } };
}
