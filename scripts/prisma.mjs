#!/usr/bin/env node
// Picks the right Prisma schema for the configured database and runs a Prisma command with it.
//   node scripts/prisma.mjs generate      -> generate the client
//   node scripts/prisma.mjs deploy        -> apply migrations (production)
//   node scripts/prisma.mjs <anything>    -> passed through (e.g. studio)
// SQLite (file:...)      uses prisma/schema.prisma           + prisma/migrations
// PostgreSQL (postgres…) uses prisma/postgres/schema.prisma  + prisma/postgres/migrations
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

for (const name of ["DATABASE_URL", "DATABASE_URL_UNPOOLED"]) {
  if (process.env[name] || !existsSync(".env")) continue;
  const m = readFileSync(".env", "utf8").match(new RegExp(`^${name}\\s*=\\s*"?([^"\\n]+)"?`, "m"));
  if (m) process.env[name] = m[1];
}
const url = process.env.DATABASE_URL ?? "file:./dev.db";
const pg = /^postgres(ql)?:/i.test(url);
const schema = pg ? "prisma/postgres/schema.prisma" : "prisma/schema.prisma";

const [cmd, ...rest] = process.argv.slice(2);
const args = cmd === "deploy" ? ["migrate", "deploy"] : [cmd, ...rest];
if (cmd === "generate" && process.env.CI_SKIP_GENERATE === "1") process.exit(0);

// Neon: migrations need the direct (non-pooled) connection; the pooled one is for the running app.
const env = { ...process.env };
if (pg && cmd === "deploy" && process.env.DATABASE_URL_UNPOOLED) env.DATABASE_URL = process.env.DATABASE_URL_UNPOOLED;

console.log(`[prisma] ${pg ? "PostgreSQL" : "SQLite"} → ${schema}`);
const r = spawnSync("npx", ["prisma", ...args, "--schema", schema], { stdio: "inherit", env });
process.exit(r.status ?? 1);
