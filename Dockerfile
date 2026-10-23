# syntax=docker/dockerfile:1
# Production image for Triple A International (Next.js + Prisma + PostgreSQL).
# Build:  docker build -t tripleaint .
# Run:    see docker-compose.yml (recommended) or README.md → "Deploy on a VPS".

FROM node:20-bookworm-slim AS base
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# ---- install dependencies (the Prisma client is generated for PostgreSQL because DATABASE_URL is a postgres URL)
FROM base AS deps
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build"
COPY package.json package-lock.json .npmrc ./
COPY scripts ./scripts
COPY prisma ./prisma
RUN npm ci

# ---- build (no database connection is needed)
FROM deps AS build
ENV AUTH_SECRET="build-only-not-a-secret"
# NEXT_PUBLIC_* values are baked into the JavaScript at build time, so they are build arguments, not runtime variables.
ARG NEXT_PUBLIC_SITE_URL=https://tripleaint.tw
ARG NEXT_PUBLIC_WHATSAPP=886900000000
ARG NEXT_PUBLIC_TURNSTILE_SITE_KEY=
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL NEXT_PUBLIC_WHATSAPP=$NEXT_PUBLIC_WHATSAPP NEXT_PUBLIC_TURNSTILE_SITE_KEY=$NEXT_PUBLIC_TURNSTILE_SITE_KEY
COPY . .
RUN npm run build && npm prune --omit=dev && node scripts/prisma.mjs generate

# ---- runtime
FROM base AS run
ENV NODE_ENV=production PORT=3000 UPLOAD_DIR=/data/uploads
RUN useradd --create-home --uid 1001 app && mkdir -p /data/uploads && chown -R app:app /data
COPY --from=build --chown=app:app /app /app
USER app
VOLUME ["/data/uploads"]
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
ENTRYPOINT ["sh", "scripts/docker-entrypoint.sh"]
