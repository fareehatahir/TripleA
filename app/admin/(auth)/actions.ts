"use server";
import { createHash, randomBytes } from "crypto";
import { headers } from "next/headers";
import { AuthError } from "next-auth";
import bcrypt from "bcryptjs";
import { signIn, signOut } from "@/auth";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { sendMail } from "@/lib/mail";
import { checkCredentials } from "@/lib/auth-check";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { loginSchema, passwordSchema, forgotSchema } from "@/lib/validation";

type Result = { ok: true } | { ok: false; error: string; need2fa?: boolean };

export async function loginAction(input: unknown): Promise<Result> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Enter a valid email and password." };
  const { email, password } = parsed.data;
  const code = typeof (input as { code?: unknown })?.code === "string" ? (input as { code: string }).code : undefined;

  const check = await checkCredentials({ email, password, code, ip: clientIp(await headers()), peek: true });
  if (!check.ok) {
    if (check.reason === "locked") {
      const mins = Math.ceil((check.retryAfter ?? 60) / 60);
      return { ok: false, error: `Too many failed attempts. Try again in ${mins} minute${mins === 1 ? "" : "s"}.` };
    }
    if (check.reason === "need2fa") return { ok: false, need2fa: true, error: "Enter the 6-digit code from your authenticator app." };
    if (check.reason === "bad2fa") return { ok: false, need2fa: true, error: "That code is not valid. Try the newest code, or use a backup code." };
    return { ok: false, error: "Incorrect email or password." };
  }

  try {
    await signIn("credentials", { email, password, code, redirect: false });
    return { ok: true };
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, error: "Incorrect email or password." };
    throw e;
  }
}

export async function logoutAction() {
  await signOut({ redirectTo: "/admin/login" });
}

const sha = (s: string) => createHash("sha256").update(s).digest("hex");

export async function requestResetAction(input: unknown): Promise<Result> {
  const parsed = forgotSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Enter a valid email." };
  const ip = clientIp(await headers());
  if (!rateLimit(`reset:ip:${ip}`, 5, 60 * 60_000).ok) return { ok: false, error: "Too many requests. Try again later." };

  const user = await db.user.findUnique({ where: { email: parsed.data.email } });
  if (user?.active) {
    const token = randomBytes(32).toString("hex");
    await db.passwordResetToken.create({ data: { userId: user.id, tokenHash: sha(token), expiresAt: new Date(Date.now() + 60 * 60_000) } });
    const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
    await sendMail({
      to: user.email,
      subject: "Reset your Triple A admin password",
      text: `Use this link within 1 hour to set a new password:\n\n${base}/admin/reset/${token}\n\nIf you did not request this, ignore this email.`,
    });
  }
  // Same response whether or not the account exists.
  return { ok: true };
}

export async function resetPasswordAction(token: string, input: unknown): Promise<Result> {
  const parsed = passwordSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const row = await db.passwordResetToken.findUnique({ where: { tokenHash: sha(token) }, include: { user: true } });
  if (!row || row.usedAt || row.expiresAt < new Date() || !row.user.active) return { ok: false, error: "This reset link is invalid or has expired." };

  await db.$transaction([
    db.user.update({ where: { id: row.userId }, data: { passwordHash: await bcrypt.hash(parsed.data, 12) } }),
    db.passwordResetToken.updateMany({ where: { userId: row.userId, usedAt: null }, data: { usedAt: new Date() } }),
  ]);
  await audit(row.user, "reset-password", "User", row.userId, "Password reset via email link");
  return { ok: true };
}
