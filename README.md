# Triple A International — website & admin platform

Export catalog and inquiry site for **tripleaint.tw** (used cars, engines, parts, car cuts), with a private admin panel where the owner manages everything without touching code.

- **Public site:** home, catalog with filters and instant search, product pages, inquiry list (replaces a cart), shipping and freight rates, services, loading gallery, about, blog, contact, legal pages.
- **Admin panel (`/admin`):** products and photos, categories/makes/models, bulk import/export (Excel/CSV + photo ZIP), inquiries, messages, freight rates, loading gallery, no-code content editing, blog with scheduling, media library, users and roles, activity log, settings, two-factor sign-in.
- **Stack:** Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS · Framer Motion · Prisma · PostgreSQL (SQLite for local development) · Auth.js · sharp · Zod · React Hook Form · Playwright + Vitest.

> New to the admin panel? Read **[ADMIN_GUIDE.md](ADMIN_GUIDE.md)**. Wondering what was assumed or left out? Read **[ASSUMPTIONS_AND_TODO.md](ASSUMPTIONS_AND_TODO.md)**.

---

## 1. Run it locally

You need **Node.js 20.9 or newer**.

```bash
npm install
cp .env.example .env          # then edit AUTH_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD (see §2)
npm run db:deploy             # creates the local SQLite database
npm run db:seed               # first admin + categories + makes + sample products and photos
npm run dev                   # http://localhost:3000   (admin: /admin)
```

Sign in at `/admin` with the `ADMIN_EMAIL` / `ADMIN_PASSWORD` you put in `.env`, then **change the password and turn on two-factor** under *My account*.

Without SMTP settings, emails (inquiry notifications, password resets) are **printed in the terminal** instead of being sent, so nothing is lost while developing.

### Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build / run |
| `npm run lint` · `npm run typecheck` | ESLint · strict TypeScript |
| `npm test` | Unit tests (Vitest): TOTP against RFC 6238 vectors, encryption, import matching, sanitising, email templates |
| `npm run test:e2e` | Builds, then runs the browser suite (Playwright + real Chrome): ~116 tests incl. WCAG 2.2 AA audits of every page |
| `npm run db:deploy` | Apply database migrations (picks SQLite or PostgreSQL from `DATABASE_URL`) |
| `npm run db:seed` | First admin + starter data (safe to re-run; never overwrites) |
| `npm run db:seed:demo` | Adds 19 `[DEMO]` draft products for testing filters and pagination |
| `npm run db:studio` | Browse the database in a web UI |
| `npm run db:pg:sync` | Regenerate the PostgreSQL schema from `prisma/schema.prisma` (see §4) |
| `node scripts/make-brand-assets.mjs` | Rebuild the web logo, favicon and social image from `public/brand/logo.png` |

---

## 2. Environment variables

Copy `.env.example` to `.env`. **Never commit `.env`.**

| Variable | Needed | Meaning |
|---|---|---|
| `DATABASE_URL` | yes | `file:./dev.db` (SQLite, local) or `postgresql://user:pass@host:5432/db` (production) |
| `AUTH_SECRET` | yes | Long random string. Generate: `openssl rand -base64 32`. Also encrypts stored SMTP/Resend secrets and 2FA seeds. **Changing it later means re-entering those secrets.** |
| `AUTH_TRUST_HOST` | production | `true` when running behind Nginx/Docker |
| `ADMIN_EMAIL` `ADMIN_PASSWORD` `ADMIN_NAME` | first run | The first super admin, created by the seed. Min. 10 characters, letter + number |
| `NEXT_PUBLIC_SITE_URL` | **build time** | Public address, e.g. `https://tripleaint.tw`. Used for sitemap, canonical links, social previews |
| `NEXT_PUBLIC_WHATSAPP` | build time | Fallback only. The real WhatsApp number is edited in Admin → Content → Site & contact |
| `UPLOAD_DIR` | local disk | Where photos are stored (default `./storage/uploads`). Back this folder up |
| `S3_BUCKET` `S3_REGION` `S3_ENDPOINT` `S3_ACCESS_KEY_ID` `S3_SECRET_ACCESS_KEY` `S3_PUBLIC_URL` | optional | Store photos in Cloudflare R2 / AWS S3 instead of disk |
| `WATERMARK` | optional | `true` stamps the logo on new photos (also a switch in Settings) |
| `INQUIRY_NOTIFY_TO` | optional | Comma-separated emails for new inquiries. Overridden by Admin → Settings → Notifications |
| `SMTP_HOST` `SMTP_PORT` `SMTP_USER` `SMTP_PASS` `MAIL_FROM` | optional | Email by SMTP. Easier: set email in Admin → Settings (SMTP or Resend) and leave these empty |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` `TURNSTILE_SECRET_KEY` | optional | Cloudflare Turnstile on the contact form (free). Blank = honeypot + rate limit only |
| `POSTGRES_USER` `POSTGRES_PASSWORD` `POSTGRES_DB` | Docker | Used by `docker-compose.yml` |
| `SEED_CATALOG` | first boot | `false` skips the sample products and photos |

> `NEXT_PUBLIC_*` values are baked into the JavaScript **when the site is built**. Change them → rebuild.

---

## 3. Project layout

```
app/                 Routes. (site)/ = public pages · admin/ = panel · api/ = endpoints · uploads/ = serves photos
components/          ui/ · layout/ · home/ · catalog/ · content/ · admin/ · providers/
lib/                 Business logic: catalog queries, content schema + defaults, import engine, images, auth checks, mail, settings…
prisma/              schema.prisma (SQLite) · postgres/ (generated PostgreSQL schema + migrations) · seed scripts · seed-assets/ (your photos)
scripts/             prisma wrapper, Postgres sync, brand assets, Docker entrypoint
deploy/              nginx.conf · PM2 file · backup.sh
e2e/ tests/unit/     Browser tests · unit tests
```

---

## 4. Database: SQLite locally, PostgreSQL in production

One data model, two databases. `scripts/prisma.mjs` reads `DATABASE_URL` and picks the right schema and migrations automatically:

| | Schema | Migrations |
|---|---|---|
| SQLite (`file:…`) | `prisma/schema.prisma` | `prisma/migrations/` |
| PostgreSQL (`postgresql://…`) | `prisma/postgres/schema.prisma` | `prisma/postgres/migrations/` |

**Changing the data model** (developers):

1. Edit `prisma/schema.prisma`, run `npx prisma migrate dev --name what_changed` (SQLite).
2. `npm run db:pg:sync` regenerates the PostgreSQL schema.
3. Create the matching PostgreSQL migration against a scratch Postgres:
   `DATABASE_URL=postgresql://… npx prisma migrate dev --name what_changed --schema prisma/postgres/schema.prisma`
4. Commit both migration folders.

(`npm run db:pg:baseline` rewrites the single baseline migration. Use it **only before the first production deploy**, never afterwards.)

Production applies migrations automatically on every start (`npm run db:deploy`; the Docker entrypoint does it for you).

---

## 5. Deploy

Pick **one**. Recommended: **A (VPS with Docker)**: simplest to run, no upload size limits, and the in-memory rate limiter works as designed.

### A. VPS with Docker + Nginx (recommended)

*A small VPS (2 GB RAM, Ubuntu 22.04/24.04) is enough.*

1. **Point the domain first** (see §6) so HTTPS can be issued.
2. **Prepare the server**
   ```bash
   curl -fsSL https://get.docker.com | sudo sh
   sudo apt install -y nginx certbot python3-certbot-nginx git
   sudo ufw allow OpenSSH && sudo ufw allow 'Nginx Full' && sudo ufw enable
   ```
3. **Get the code onto the server** (e.g. `git clone <your private repo> /opt/tripleaint && cd /opt/tripleaint`, or upload the folder).
4. **Configure**
   ```bash
   cp .env.example .env && nano .env
   ```
   Set at least: `AUTH_SECRET`, `POSTGRES_PASSWORD`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `NEXT_PUBLIC_SITE_URL=https://tripleaint.tw`.
5. **Start**
   ```bash
   docker compose up -d --build
   docker compose logs -f app        # wait for "Ready"
   ```
   On a brand-new database the container creates your admin account and starter data automatically, and applies migrations on every start. Health check: `curl http://127.0.0.1:3000/api/health` → `{"ok":true}`.
6. **HTTPS with Nginx**
   ```bash
   sudo certbot certonly --nginx -d tripleaint.tw -d www.tripleaint.tw
   sudo cp deploy/nginx.conf /etc/nginx/sites-available/tripleaint.tw
   sudo ln -s /etc/nginx/sites-available/tripleaint.tw /etc/nginx/sites-enabled/
   sudo nginx -t && sudo systemctl reload nginx
   ```
   Certificates renew automatically. The provided config forwards the visitor's real IP (needed by the rate limits) and allows ZIP uploads up to 220 MB.
7. **Sign in** at `https://tripleaint.tw/admin`, change the password, **turn on 2FA**, and fill in *Settings → Email delivery* (send yourself a test email).
8. **Updating later:** `git pull && docker compose up -d --build` (the database and photos live in Docker volumes and are untouched).

### B. VPS without Docker (Node + PM2)

```bash
# Node 20, PostgreSQL 16, Nginx installed. Create a database and user:
sudo -u postgres psql -c "CREATE USER tripleaint WITH PASSWORD 'strong-password';"
sudo -u postgres psql -c "CREATE DATABASE tripleaint OWNER tripleaint;"

cd /opt/tripleaint && cp .env.example .env     # DATABASE_URL=postgresql://tripleaint:…@localhost:5432/tripleaint
npm ci && npm run build                         # builds with the PostgreSQL client
npm run db:deploy && npx tsx prisma/seed.ts     # tables + first admin
sudo npm i -g pm2 && pm2 start deploy/ecosystem.config.cjs && pm2 save && pm2 startup
```
Then Nginx as in step 6 above. Keep **one** PM2 instance (see §8).

### C. Vercel + managed Postgres (+ R2 for photos)

Works for the public site, but read the limits first:

- **Photos must use S3/R2** (Vercel's disk is read-only): set the `S3_*` variables.
- **Vercel rejects request bodies over 4.5 MB.** Large photo uploads and the product-photo ZIP (up to 200 MB) will fail there. Resize photos to ~3 MB, or use option A for heavy uploading.
- **The rate limiter is per instance.** On serverless that weakens login/inquiry limits. Turn on Turnstile and add Vercel's firewall rate limiting.

Steps: create a Postgres database (Neon or Supabase) → import the repo in Vercel → add env vars (`DATABASE_URL` with `?sslmode=require`, `AUTH_SECRET`, `AUTH_TRUST_HOST=true`, `NEXT_PUBLIC_SITE_URL`, `S3_*`, `ADMIN_*`) → set **Build Command** to `npm run db:deploy && npm run build` → deploy → once, run the seed locally against that database: `DATABASE_URL="postgresql://…" npx tsx prisma/seed.ts`.

---

## 6. Connect the domain `tripleaint.tw` (GoDaddy DNS)

`tripleaint.tw` currently shows GoDaddy's "Launching Soon" page. In **GoDaddy → My Products → tripleaint.tw → DNS**:

| Where it points | Records |
|---|---|
| **Your VPS** (option A/B) | Delete the existing `A @` record (GoDaddy parking) and the `www` CNAME. Add **`A` · `@` · `<your server IP>`** and **`A` · `www` · `<your server IP>`** (or `CNAME www → tripleaint.tw`). TTL 600. |
| **Vercel** (option C) | **`A` · `@` · `76.76.21.21`** and **`CNAME` · `www` · `cname.vercel-dns.com`**. Add the domain in Vercel → Settings → Domains. |

Also: **cancel or disconnect the GoDaddy Website Builder** subscription so it stops overriding DNS. **Do not delete `MX` records** if you use email on this domain (GoDaddy/Microsoft/Google mail).

**Email deliverability (so inquiry emails reach inboxes):** whichever provider sends your mail (Resend, your SMTP host), add the **SPF, DKIM and DMARC** TXT records it shows you. Example DMARC: `TXT _dmarc → v=DMARC1; p=none; rua=mailto:info@tripleaint.tw`. Create the mailbox `info@tripleaint.tw`, then in the admin set *Settings → Notifications* and *Email delivery*.

DNS changes can take from minutes up to a few hours.

**After launch:** add the site to **Google Search Console** and submit `https://tripleaint.tw/sitemap.xml`; add Google Analytics only if you want more than the built-in anonymous counters.

---

## 7. Backups

What must be saved: **the database** and **the photo files**.

```bash
# Docker install
MODE=docker ./deploy/backup.sh
# Plain install
DATABASE_URL=postgresql://… UPLOAD_DIR=/var/lib/tripleaint/uploads ./deploy/backup.sh
```
Daily database dump, weekly photo archive, 14 days kept in `/var/backups/tripleaint`. Schedule it (`crontab -e`):
```
30 3 * * *  cd /opt/tripleaint && MODE=docker ./deploy/backup.sh >> /var/log/tripleaint-backup.log 2>&1
```
**Copy backups off the server** (a different provider or storage: `rclone`, S3, a second machine). A backup on the same disk is not a backup.

**Restore** into an *empty* database:
```bash
gunzip -c db-YYYYMMDD-HHMM.sql.gz | docker compose exec -T db psql -U tripleaint -d tripleaint
docker run --rm -v tripleaint_uploads:/data -v /var/backups/tripleaint:/backup alpine \
  tar xzf /backup/uploads-YYYYMMDD-HHMM.tar.gz -C /data
```
(Volume names start with the folder name: check `docker volume ls`.) With R2/S3 photo storage, enable versioning on the bucket instead.

---

## 8. Security & operations notes

- **First hour checklist:** change the seeded admin password → turn on 2FA for every admin → set real notification emails → send a test email → check `/admin/activity` shows your actions.
- Admin sign-in locks after **8 failed attempts per email / 20 per IP per 15 minutes** (successful logins never count). 2FA codes cannot be replayed. Passwords are bcrypt-hashed; stored SMTP/Resend keys and 2FA seeds are AES-256-GCM encrypted.
- Production sends a strict **Content-Security-Policy**, HSTS, `nosniff`, frame and permissions headers; `/admin` and `/api` are `noindex`.
- All uploads are validated by **content** (not file name), re-encoded to WebP and stripped of metadata. Rich text is sanitised on save *and* on display. CSV/Excel exports neutralise formula injection.
- **Run a single app instance.** The rate limiter and a few small caches live in memory. To scale out, replace `lib/rate-limit.ts` with a Redis-backed version (same function signatures).
- **Dependencies:** run `npm audit` after updates. Known and accepted today: the Prisma *command-line tool* depends on a config-merge library with a denial-of-service advisory. It only runs on your machine/server on files you control, never on visitor input; it clears when Prisma 7 is adopted.
- Maintenance mode (Settings) shows visitors a notice with `noindex`; signed-in admins still see the real site.

## 9. Quality gates

`npm run lint` · `npm run typecheck` · `npm test` · `npm run test:e2e` (to run the browser suite on PostgreSQL: build with a Postgres `DATABASE_URL`, then `E2E_DATABASE_URL=postgresql://… npx playwright test` against an **empty** database).

Measured on the production build: Lighthouse (mobile, simulated) Accessibility **100**, Best Practices **100**, SEO **100**, Performance **86–95**; real Chrome with slow-4G + 4× CPU throttling: **LCP 1.1–1.4 s**, CLS 0, no long tasks. WCAG 2.2 AA (axe) passes on every public and admin page, including admin dark mode.
