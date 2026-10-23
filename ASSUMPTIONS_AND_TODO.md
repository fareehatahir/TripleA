# Assumptions, limitations and next steps

An honest list of what was assumed, what differs from the original brief, and what is not done. Nothing here blocks launching, but the **"Before launch"** items need your attention.

## Before launch (please do)

1. **Replace placeholder contact details.** Phone `+886 900 000 000`, WhatsApp `886900000000`, email `info@tripleaint.tw`, address "Taichung, Taiwan" and the opening hours are placeholders. Edit them in *Admin → Content → Site, contact & SEO*. Every WhatsApp button, the footer, the Contact page and the emails update at once.
2. **Check the five sample products.** Their photos are yours; the facts (title, make/model, "3.5 L V6 / automatic" on the E350, "4WD" and the included parts on the BMW X5 drivetrain, "petrol" on the C280) were inferred from what is visible in the pictures. Year, mileage, engine code and price are blank. Correct or delete them, or run `SEED_CATALOG=false` on a fresh install to skip them. The door panel is described generically (it looks like it comes from an S-Class, but that was not certain).
3. **Delete or hide the demo products** if you ever ran `npm run db:seed:demo` (they are drafts, never public).
4. **Have a professional review the legal text.** The Privacy notice and Terms are general templates (not legal advice). The starter FAQs (payment, inspection, shipping time, documents, RoRo) and the engine-code examples are plausible defaults written by us: confirm they match how you really work. Also confirm Taiwan export rules and the import rules of your target countries for used cars, engines and tires (stated in the blueprint's risk list).
5. **Change the seeded admin password, turn on 2FA** for every admin, and **copy backups off the server** (README §7).
6. **Set up real email** (Settings → Email delivery) and the SPF/DKIM/DMARC DNS records, then send a test email. Until then, emails only print in the server log.
7. **Add your own content:** About story/team/certifications, testimonials (with permission), freight rates, loading photos. The defaults are placeholders written in a neutral voice.

## Deviations from the original brief

| Brief | What was built | Why |
|---|---|---|
| shadcn/ui primitives | Radix `Slot` + class-variance-authority button, custom components | Only a button/field system was needed; avoids pulling a generator's boilerplate. Easy to add shadcn components later. |
| GSAP ScrollTrigger (optional) | Framer Motion + CSS | Everything required (scroll-drawn timeline, parallax, counters) is done without a second animation library. |
| `next-sitemap` | Next.js built-in `sitemap.ts` / `robots.ts` | Same output, always in sync with the database (products, categories, posts), no build step. |
| Next.js 14 | **Next.js 15.5.28 + React 19** | 14.x has known security advisories (including remote-code-execution bugs in the image optimizer) fixed only in newer releases. 15.5.28 is the security backport. |
| Auth.js with optional TOTP | Done, plus **backup codes** and replay protection | |
| "Resend or SMTP" | Both, configurable in Settings (secrets encrypted), plus SMTP env fallback | |
| Seed: 24 demo products with placeholder images | 5 real products from your photos + `db:seed:demo` adds 19 draft placeholders | Real stock beats fake stock on a live site. |
| Language switch with AR/FR/RU/ZH ready | Switch shows EN only, others "soon" | The structure (language list) exists, but there is **no translation system or translated content** yet. See "Not done". |
| Lighthouse 90+ on everything | Accessibility, Best Practices, SEO **100**; Performance **86–95** (Lighthouse's simulated mobile throttling) | Real throttled Chrome measures **LCP 1.1–1.4 s**, CLS 0. The product page (large photo) is the lowest at ~86 in the simulation. |

## Not done / limitations

- **Languages:** English only (public site and admin). Needs a routing + translation layer and translated content blocks.
- **Home page route map** (the "Destinations" section) is decorative: countries/routes are fixed in code, not editable. The counters, steps, hero and call-to-action are editable.
- **Navigation menu** and the home-page category blurbs are not editable in the CMS (categories and makes are, via Taxonomy).
- **Single app instance.** Rate limits (login, inquiries, contact, uploads) and small caches are in memory. Fine for one server; for several instances or serverless use a Redis-backed limiter (`lib/rate-limit.ts` is a drop-in point).
- **Vercel:** works for the public site, but Vercel's 4.5 MB request limit blocks large photo uploads and the photo ZIP, and its disk is read-only (S3/R2 required). A VPS is recommended (README §5).
- **Docker image not built on the machine used for development** (no Docker available there). Every step it performs was verified natively: build with no database reachable, migrations and first-run seed on a fresh PostgreSQL, restart without re-seeding, health endpoint. Run `docker compose up -d --build` and check `docker compose logs app` the first time.
- **PostgreSQL migrations:** a single baseline migration was generated (`prisma/postgres/`). Future model changes need a Postgres migration created as described in README §4.
- **Analytics are basic by design:** anonymous page-view counts per page per day (no visitors, referrers, countries or devices). Add Google Analytics / Plausible if you need more (update the privacy text and cookie banner if you do).
- **Cookie banner** records the choice but nothing optional is loaded behind it yet (no third-party trackers), so Accept and Essential behave the same.
- **Import limits:** 5,000 rows per file, 10 MB; photo ZIP up to 200 MB / 1,500 files. Bigger jobs: split the files.
- **Search** uses database "contains" matching, which is fine for tens of thousands of products. For very large catalogs add PostgreSQL trigram indexes.
- **Email** has no retry queue: if the mail provider is down at that moment the message is logged, but the inquiry itself is always saved and visible in admin.
- **Audit log** keeps everything forever (no automatic pruning).
- **No online payments, customer accounts, or live chat** (intentionally out of scope for version 1; WhatsApp covers live contact).
- **Known accepted dependency advisory:** the Prisma command-line tool depends on a config-merge library with a denial-of-service advisory (`deepmerge-ts`). It only runs on developer/deploy machines on files you control, not on visitor input. Clears when moving to Prisma 7 (a major upgrade).
- **Watermarking** (off by default) stamps the whole `logo.png`, including its off-white background. Provide a transparent PNG logo for a cleaner watermark.
- The `Logo` falls back to a text wordmark if `public/brand/logo.png` is removed; re-run `node scripts/make-brand-assets.mjs` after replacing the logo file.

## Suggested next steps (when you are ready)

1. Multilingual site (Arabic with right-to-left, French, Russian, Chinese).
2. Direct-to-S3 photo uploads (removes the serverless size limits) and a Redis rate limiter, so the site can run on Vercel/serverless comfortably.
3. Email queue with retries and a weekly digest of new inquiries.
4. A compatibility table (which engine/part fits which models) with its own search.
5. Optional analytics with referrers and countries, and a Search Console health dashboard.
6. Editable navigation and an editable destinations map.

## What is covered by automated checks

- **33 unit tests:** TOTP against the RFC 6238 vectors, encryption, HTML sanitising, CSV/Excel parsing (BOM, mixed line endings, encodings, quoted newlines), import column matching, photo-ZIP SKU matching, formula-injection protection, email templates and escaping.
- **116 browser tests** (real Chrome) covering the buyer journey (browse, filter, search, product, inquiry), the whole admin (products, photos, taxonomy, import wizard, ZIP photos, exports, inquiries, messages, rates, gallery, CMS, blog scheduling, settings, maintenance mode, users/roles), security (headers, CSP violations, lockout, 2FA lifecycle, spam trap) and **WCAG 2.2 AA audits of every page** (admin also in dark mode). The whole suite also passes against **real PostgreSQL**.
