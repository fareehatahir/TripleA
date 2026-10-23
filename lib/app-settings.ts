import { unstable_cache } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { site } from "@/lib/site";

/** Operational settings edited in Admin > Settings. Stored in SiteSetting (key → JSON). */
const str = (d = "", max = 300) => z.string().max(max).default(d);

export const settingsSchemas = {
  general: z.object({
    siteName: str(site.name, 80),
    logoUrl: str("", 500),
    faviconUrl: str("", 500),
    brandColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use a 6-digit hex colour like #C8102E").default("#C8102E"),
    defaultCurrency: z.string().regex(/^[A-Z]{3}$/, "Use a 3-letter code like USD").default("USD"),
    watermark: z.boolean().default(false),
  }),
  notifications: z.object({ emails: z.array(z.string().trim().toLowerCase().email("Enter valid email addresses")).max(10).default([]) }),
  email: z.object({
    provider: z.enum(["env", "smtp", "resend"]).default("env"),
    from: str("", 200),
    smtpHost: str("", 200),
    smtpPort: z.coerce.number().int().min(1).max(65535).default(587),
    smtpUser: str("", 200),
    smtpPassEnc: str("", 2000), // encrypted, never sent to the browser
    resendKeyEnc: str("", 2000), // encrypted, never sent to the browser
  }),
  maintenance: z.object({ enabled: z.boolean().default(false), message: str("We are making a few improvements and will be back shortly. For urgent requests, please message us on WhatsApp.", 400) }),
};
export type SettingKey = keyof typeof settingsSchemas;
export type Settings<K extends SettingKey> = z.infer<(typeof settingsSchemas)[K]>;

async function load<K extends SettingKey>(key: K): Promise<Settings<K>> {
  const row = await db.siteSetting.findUnique({ where: { key } });
  const schema = settingsSchemas[key] as z.ZodTypeAny;
  const parsed = schema.safeParse(row?.value ?? {});
  return (parsed.success ? parsed.data : schema.parse({})) as Settings<K>;
}

const cached = unstable_cache(async (key: SettingKey) => load(key), ["app-settings"], { revalidate: 60, tags: ["settings"] });
export const getAppSetting = <K extends SettingKey>(key: K) => cached(key) as Promise<Settings<K>>;
export const getAppSettingFresh = load;

/** "#C8102E" → "200 16 46" (space separated, for rgb(var(--x) / alpha)). */
export function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const darken = (c: [number, number, number], f: number) => c.map((v) => Math.round(v * (1 - f))).join(" ");

/** CSS custom properties that retint the brand red across the whole site. */
export function brandCss(hex: string) {
  const c = hexToRgb(hex);
  return `:root{--brand-rgb:${c.join(" ")};--brand-hover-rgb:${darken(c, 0.17)};--brand-deep-rgb:${darken(c, 0.31)}}`;
}
