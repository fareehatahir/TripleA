import { unstable_cache } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { site as siteDefaults } from "@/lib/site";
import { getAppSetting } from "@/lib/app-settings";

/**
 * Everything editable from Admin > Content lives here: a zod schema (validation + shape), original default copy,
 * and a cached loader. Missing or invalid stored fields silently fall back to the defaults, so the site never breaks
 * because of a half-filled form.
 */
const s = (d = "", max = 500) => z.string().max(max).default(d);
const long = (d = "") => z.string().max(30000).default(d);
const list = <T extends z.ZodTypeAny>(item: T, d: z.infer<T>[], max = 30) => z.array(item).max(max).default(d);
const pair = z.object({ title: s("", 120), text: s("", 1000) });

export const contentSchemas = {
  home: z.object({
    hero: z
      .object({
        eyebrow: s("Taiwan · Worldwide Export", 80),
        line1: s("Used cars, engines", 60),
        line2: s("& parts, shipped", 60),
        line3: s("from Taiwan.", 60),
        subtext: s("Inspected used vehicles, tested engines and gearboxes, and genuine parts for wholesale buyers in Africa, the Middle East and Asia. Clear photos, honest condition reports, fast container loading.", 400),
        primaryCta: s("Browse Catalog", 40),
        secondaryCta: s("Send Inquiry", 40),
        badges: list(s("", 60), ["Pre-shipment inspection", "Wholesale pricing", "Full export documents"], 5),
        slides: list(z.object({ url: s("", 500), alt: s("", 120) }), [], 6),
      })
      .default({}),
    stats: list(z.object({ label: s("", 60), value: z.coerce.number().min(0).max(100000000).default(0), suffix: s("", 4) }), [
      { label: "Years in Business", value: 15, suffix: "+" },
      { label: "Containers Shipped", value: 2400, suffix: "+" },
      { label: "Countries Served", value: 48, suffix: "" },
      { label: "Items In Stock", value: 5200, suffix: "+" },
    ], 6),
    steps: list(pair, [
      { title: "Inquiry", text: "Tell us what you need and your destination port. Use the inquiry list or WhatsApp." },
      { title: "Quotation", text: "Receive a clear quotation with FOB prices, freight and photos within one business day." },
      { title: "Inspection & Loading", text: "Units are inspected, packed and loaded into your container while you watch via photos and video." },
      { title: "Shipping", text: "We handle export clearance and send documents so your cargo clears port smoothly." },
    ], 6),
    why: list(pair, [
      { title: "Inspected stock", text: "Every vehicle and engine is checked and photographed before it is offered." },
      { title: "Wholesale prices", text: "Direct sourcing in Taiwan means competitive FOB pricing for volume buyers." },
      { title: "Complete documents", text: "Invoice, packing list, export declaration and bill of lading handled for you." },
      { title: "Fast loading", text: "Stock is held in our own yard, so containers are typically loaded within days of payment." },
    ], 8),
    cta: z.object({ title: s("Ready to fill your next container?", 100), text: s("Send us your list. We reply with availability, photos and a freight quote.", 200) }).default({}),
  }),

  about: z.object({
    intro: long("<p>Triple A International is a Taiwan-based exporter of used cars, engines, gearboxes, parts and car cuts. We supply dealers, workshops and importers across Africa, the Middle East and Asia, loading containers every month.</p><p>Our job is simple: find good stock, inspect it honestly, show you exactly what you are buying, and ship it with the paperwork your port needs.</p>"),
    mission: s("To make buying used vehicles and parts from Taiwan simple, transparent and reliable for importers anywhere in the world.", 400),
    timeline: list(z.object({ year: s("", 10), title: s("", 100), text: s("", 500) }), [
      { year: "2010", title: "Founded", text: "Started exporting used engines from Taiwan to a handful of regular buyers." },
      { year: "2015", title: "Cars and car cuts", text: "Expanded into complete used vehicles and front and rear cuts." },
      { year: "2020", title: "Own yard and loading bay", text: "Moved to a larger yard so stock can be inspected, stored and loaded in one place." },
      { year: "2024", title: "Online catalog", text: "Launched this catalog so buyers can browse live stock and send inquiries any time." },
    ], 12),
    team: list(z.object({ name: s("", 80), role: s("", 80), photo: s("", 500) }), [], 12),
    certifications: list(z.object({ name: s("", 100), detail: s("", 300) }), [
      { name: "Registered Taiwan exporter", detail: "Licensed to export used vehicles and automotive parts." },
      { name: "Pre-shipment inspection", detail: "Every unit is checked and photographed before loading." },
    ], 12),
    gallery: list(z.object({ url: s("", 500), caption: s("", 120) }), [], 12),
  }),

  services: z.object({
    intro: s("From a single engine to a full container, we source, inspect, pack and ship.", 400),
    items: list(z.object({ title: s("", 100), text: s("", 600), points: s("", 800) }), [
      { title: "Used Engines & Gearboxes", text: "Low-mileage engines and gearboxes pulled from Japanese, Korean and European vehicles, each with its engine code recorded.", points: "Engine code verified\nCompression and leak check\nComplete with ancillaries when available\nExport packing on pallets" },
      { title: "Used Cars & Car Cuts", text: "Complete used vehicles and front or rear cuts with the components buyers actually need.", points: "Inspected and photographed\nHalf-cut and nose-cut available\nRoRo or container shipping\nCleaned and prepared for export" },
      { title: "Used Tires", text: "Graded used tires sold by the container for resale markets.", points: "Graded by tread depth\nMixed or sorted sizes\nBaled for loading" },
      { title: "Used Parts", text: "Body, mechanical and electrical parts for popular makes, from headlights and bumpers to alternators and compressors.", points: "Fitment checked against VIN\nPhotos before purchase\nConsolidated with your engine or car order" },
    ], 8),
    codes: z.object({
      title: s("Engine code abbreviations", 100),
      intro: s("Engine codes tell you exactly which engine a vehicle left the factory with. Match the code, not just the model name.", 400),
      rows: list(z.object({ code: s("", 30), meaning: s("", 200) }), [
        { code: "2GR-FE", meaning: "Toyota 3.5L V6 petrol, found in Camry, Highlander, Lexus RX350" },
        { code: "K24A", meaning: "Honda 2.4L i-VTEC petrol, found in Accord and CR-V" },
        { code: "4M41", meaning: "Mitsubishi 3.2L turbo diesel, found in Pajero and Montero" },
        { code: "M272", meaning: "Mercedes-Benz V6 petrol used across C-, E- and S-Class" },
      ], 40),
      note: s("Not sure of the code? Send us your VIN and we will confirm it.", 200),
    }).default({}),
  }),

  shipping: z.object({
    intro: long("<p>We ship used cars, engines and parts from Taiwan's main ports to destinations worldwide. Rates below are ocean freight for a container from Taiwan to your port; local charges at destination are separate.</p>"),
    steps: list(pair, [
      { title: "Confirm your order", text: "Agree items, prices and destination port, then pay the deposit." },
      { title: "Inspect and pack", text: "We inspect, photograph and pack your goods, and send you the photos." },
      { title: "Load and clear", text: "Container loading, export clearance and bill of lading." },
      { title: "Track and receive", text: "We send documents and tracking so you can clear the cargo at your port." },
    ], 6),
    charges: list(pair, [
      { title: "Ocean freight", text: "Port-to-port freight from Taiwan to your destination port, see the rate table above." },
      { title: "Origin handling", text: "Trucking, loading and export clearance in Taiwan, included in your quotation." },
      { title: "Destination port charges", text: "Terminal handling, documentation and storage at the port of arrival, paid locally to the shipping line or agent." },
      { title: "Import duty and taxes", text: "Set by your country's customs and payable by the importer." },
    ], 12),
    note: s("Rates are indicative, in USD per container, and change with the shipping lines. We confirm the exact figure in your quotation.", 300),
  }),

  site: z.object({
    tagline: s(siteDefaults.tagline, 80),
    phone: s(siteDefaults.phone, 40),
    email: s(siteDefaults.email, 120),
    whatsapp: s(siteDefaults.whatsapp, 20),
    address: s(siteDefaults.address, 200),
    hours: s(siteDefaults.hours, 100),
    mapQuery: s("Taichung, Taiwan", 200),
    footerBlurb: s("Taiwan-based exporter of used cars, engines, parts and car cuts. Wholesale supply to dealers and workshops across Africa, the Middle East and Asia.", 300),
    social: list(z.object({ label: s("", 30), href: z.string().max(300).default("") }), siteDefaults.social, 8),
    banner: z.object({ enabled: z.boolean().default(false), text: s("", 160), href: s("", 300) }).default({}),
    seoTitle: s("Triple A International | Used Cars, Engines & Parts Export from Taiwan", 100),
    seoDescription: s("Triple A International exports inspected used cars, engines, gearboxes, car parts and car cuts from Taiwan to dealers and importers worldwide.", 200),
  }),

  legal: z.object({
    privacy: long("<h2>Privacy notice</h2><p>This notice explains how Triple A International (“we”) handles personal information collected through tripleaint.tw.</p><h3>What we collect</h3><p>When you send an inquiry or contact message we collect the details you enter: your name, company, country, phone or WhatsApp number, email address, destination port and message. We also keep basic technical logs needed to run and secure the site.</p><h3>How we use it</h3><p>We use your details only to reply to your inquiry, prepare quotations and arrange shipping. We do not sell your information.</p><h3>Who sees it</h3><p>Our staff and the service providers that host the site and deliver email. Shipping agents receive only what is needed to ship your order.</p><h3>Retention and your rights</h3><p>We keep inquiry records for as long as needed for business and legal purposes. You may ask us to access, correct or delete your information by emailing us.</p><h3>Cookies</h3><p>We use essential cookies to keep the site working and, if you accept, to understand how it is used.</p><p><em>This is a general template. Please have it reviewed against the laws that apply to your business.</em></p>"),
    terms: long("<h2>Terms of use</h2><p>By using tripleaint.tw you agree to these terms.</p><h3>Information on the site</h3><p>Product listings, photos and specifications are provided in good faith. Stock changes quickly and an item may be sold before your inquiry is answered. A listing is not an offer; a sale is only agreed in a written quotation or invoice.</p><h3>Quotations and payment</h3><p>Prices are quoted on request, usually FOB Taiwan, and are valid for the period stated in the quotation. Payment terms are set out in the quotation.</p><h3>Used goods</h3><p>All vehicles, engines and parts are used unless stated otherwise. Condition is described as accurately as we can; buyers are encouraged to review photos and ask for additional images or videos before purchase.</p><h3>Import compliance</h3><p>The buyer is responsible for ensuring the goods may be imported into their country and for paying duties and taxes.</p><h3>Liability</h3><p>To the extent permitted by law, our liability is limited to the value of the goods ordered.</p><p><em>This is a general template. Please have it reviewed against the laws that apply to your business.</em></p>"),
  }),
};

export type ContentKey = keyof typeof contentSchemas;
export type Content<K extends ContentKey> = z.infer<(typeof contentSchemas)[K]>;

async function load<K extends ContentKey>(key: K): Promise<Content<K>> {
  const row = await db.contentBlock.findUnique({ where: { key } });
  const schema = contentSchemas[key] as z.ZodTypeAny;
  const parsed = schema.safeParse(row?.value ?? {});
  return (parsed.success ? parsed.data : schema.parse({})) as Content<K>;
}

const cached = unstable_cache(async (key: ContentKey) => load(key), ["content"], { revalidate: 300, tags: ["content"] });
export const getContent = <K extends ContentKey>(key: K) => cached(key) as Promise<Content<K>>;
/** Uncached read, for the admin editor so it always shows what is saved. */
export const getContentFresh = load;
export const defaultContent = <K extends ContentKey>(key: K) => (contentSchemas[key] as z.ZodTypeAny).parse({}) as Content<K>;

/** Static defaults merged with the editable "site" block. Safe to send to the browser. */
export async function getSiteConfig() {
  const [c, g] = await Promise.all([getContent("site"), getAppSetting("general")]);
  return {
    ...siteDefaults, ...c, url: siteDefaults.url, short: siteDefaults.short,
    name: g.siteName || siteDefaults.name, logoUrl: g.logoUrl, faviconUrl: g.faviconUrl, brandColor: g.brandColor, defaultCurrency: g.defaultCurrency,
  };
}
export type SiteConfig = Awaited<ReturnType<typeof getSiteConfig>>;
