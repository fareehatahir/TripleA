#!/usr/bin/env node
// Exit code 0 when the database has no users yet (a brand-new install that needs seeding), 1 otherwise.
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
try {
  process.exit((await db.user.count()) === 0 ? 0 : 1);
} catch (e) {
  console.error("[first-run] could not read the database:", e.message);
  process.exit(2);
} finally {
  await db.$disconnect();
}
