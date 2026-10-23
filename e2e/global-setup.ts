import { execSync } from "child_process";
import { rmSync } from "fs";
import { request } from "@playwright/test";
import { TEST_ENV } from "../playwright.config";

export const AUTH_FILE = "e2e/.auth.json";

export default async function globalSetup() {
  const env = { ...process.env, ...TEST_ENV };
  rmSync("prisma/test.db", { force: true });
  rmSync("prisma/test.db-journal", { force: true });
  rmSync("storage/test-uploads", { recursive: true, force: true });
  // SQLite: the file was just deleted, so this builds a fresh schema. PostgreSQL: point E2E_DATABASE_URL at an EMPTY database
  // (the suite never drops or resets anything; it only applies migrations and seeds).
  execSync("node scripts/prisma.mjs deploy", { env, stdio: "pipe" });
  execSync("npx tsx prisma/seed.ts", { env, stdio: "pipe" });

  // A second account for tests that must not disturb the shared admin session (2FA, password change, role checks).
  Object.assign(process.env, TEST_ENV);
  const { PrismaClient } = await import("@prisma/client");
  const bcrypt = (await import("bcryptjs")).default;
  const db = new PrismaClient();
  await db.user.create({ data: { email: "e2e-editor@tripleaint.tw", name: "E2E Editor", role: "EDITOR", passwordHash: await bcrypt.hash("E2e-Editor-123", 10) } });
  await db.$disconnect();

  // Sign in once and reuse the session, so tests do not trip the login rate limit.
  const ctx = await request.newContext({ baseURL: TEST_ENV.NEXT_PUBLIC_SITE_URL });
  const { csrfToken } = await (await ctx.get("/api/auth/csrf")).json();
  await ctx.post("/api/auth/callback/credentials", { form: { csrfToken, email: TEST_ENV.ADMIN_EMAIL, password: TEST_ENV.ADMIN_PASSWORD, json: "true" } });
  await ctx.storageState({ path: AUTH_FILE });
  await ctx.dispose();
}
