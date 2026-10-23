#!/bin/sh
set -e
echo "[entrypoint] applying database migrations…"
node scripts/prisma.mjs deploy

# Seed the first admin account (from ADMIN_EMAIL / ADMIN_PASSWORD) and starter data, only on a brand-new database.
if node scripts/first-run.mjs; then
  echo "[entrypoint] new database: creating the first admin account and starter data…"
  npx tsx prisma/seed.ts
fi

echo "[entrypoint] starting on port ${PORT:-3000}"
exec node node_modules/next/dist/bin/next start -p "${PORT:-3000}"
