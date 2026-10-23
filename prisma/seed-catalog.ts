import { promises as fs } from "fs";
import path from "path";
import { PrismaClient, type Prisma } from "@prisma/client";
import sharp from "sharp";
import { processAndStoreImage } from "../lib/images";
import { slugify } from "../lib/slug";

const db = new PrismaClient();
const assets = path.join(__dirname, "seed-assets");

async function upload(file: string) {
  const { asset } = await processAndStoreImage(await fs.readFile(path.join(assets, file)), file);
  return asset;
}

/**
 * Real stock photos supplied by the owner. Only facts visible in the photos are filled in
 * (badges such as "C280"/"E350"/"X5", the "V6" engine cover, the transfer case on the X5 drivetrain).
 * Everything else (year, mileage, engine code, price) is left blank to be completed in the admin.
 */
const products: {
  sku: string; title: string; category: string; make: string; model?: string; photos: string[];
  description: string; included?: string; featured?: boolean;
  fuel?: "PETROL"; transmission?: "AT"; drive?: "FOUR_WD"; displacement?: number;
}[] = [
  {
    sku: "CAR-0001", title: "Mercedes-Benz C280 Sedan", category: "cars", make: "mercedes-benz", model: "C-Class", featured: true,
    photos: ["mb-c280-side.jpg", "mb-c280-rear.jpg"], fuel: "PETROL",
    description: "<p>White Mercedes-Benz C280 sedan with tinted glass, alloy wheels and rear parking sensors. Available for export from Taiwan.</p><p>Contact us for full condition report, additional photos and a CIF quotation to your port.</p>",
  },
  {
    sku: "CAR-0002", title: "Mercedes-Benz E350 Coupe", category: "cars", make: "mercedes-benz", model: "E-Class", featured: true,
    photos: ["mb-e350-rear.jpg", "mb-e350-engine-bay.jpg", "mb-e350-interior.jpg"], fuel: "PETROL", transmission: "AT", displacement: 3500,
    description: "<p>Mercedes-Benz E350 coupe in white with a V6 petrol engine, automatic transmission and a light leather interior with wood trim.</p><p>Contact us for the full condition report and extra photos.</p>",
  },
  {
    sku: "CAR-0003", title: "Mercedes-Benz S-Class Brabus", category: "cars", make: "mercedes-benz", model: "S-Class",
    photos: ["mb-s-class-brabus-rear.jpg"],
    description: "<p>White Mercedes-Benz S-Class fitted with Brabus rear badging, a rear spoiler and quad exhaust outlets.</p><p>Contact us for specifications, condition report and more photos.</p>",
  },
  {
    sku: "ENG-0001", title: "BMW X5 Engine with Automatic Gearbox", category: "engines", make: "bmw", model: "X5", featured: true,
    photos: ["bmw-x5-engine-gearbox.jpg"], transmission: "AT", drive: "FOUR_WD",
    included: "Engine, automatic gearbox, transfer case, ECU and wiring harness, propeller shaft",
    description: "<p>BMW engine supplied together with the automatic gearbox and transfer case, ECU and wiring harness, as pulled from an X5.</p><p>Send us your VIN or engine code and we will confirm compatibility before shipping.</p>",
  },
  {
    sku: "PRT-0001", title: "Mercedes-Benz Front Door Panel with Burl Wood Trim", category: "parts", make: "mercedes-benz",
    photos: ["mb-s-class-door-panel.jpg"],
    description: "<p>Black leather door panel with burl wood trim, power window switches and memory seat controls, in good cosmetic condition.</p><p>Send your VIN to confirm fitment.</p>",
  },
];

export async function seedCatalog({ demo = false } = {}) {
  const cats = Object.fromEntries((await db.category.findMany()).map((c) => [c.slug, c.id]));
  const makes = Object.fromEntries((await db.make.findMany()).map((m) => [m.slug, m.id]));
  if (!cats.cars || !makes["mercedes-benz"]) throw new Error("Run the base seed first (categories and makes missing).");

  for (const p of products) {
    if (await db.product.findUnique({ where: { sku: p.sku } })) continue;
    let modelId: string | undefined;
    if (p.model) {
      const m = await db.carModel.upsert({
        where: { makeId_slug: { makeId: makes[p.make], slug: slugify(p.model) } },
        update: {},
        create: { makeId: makes[p.make], name: p.model, slug: slugify(p.model) },
      });
      modelId = m.id;
    }
    const media = [];
    for (const f of p.photos) media.push(await upload(f));
    await db.product.create({
      data: {
        sku: p.sku, slug: slugify(p.title), title: p.title, description: p.description, included: p.included,
        categoryId: cats[p.category], makeId: makes[p.make], modelId,
        fuel: p.fuel, transmission: p.transmission, drive: p.drive, displacement: p.displacement,
        stock: 1, status: "PUBLISHED", featured: !!p.featured,
        images: { create: media.map((m, order) => ({ mediaId: m.id, url: m.url, thumbUrl: m.thumbUrl, blur: m.blur, alt: p.title, order, isCover: order === 0 })) },
      },
    });
    console.log(`  + ${p.sku} ${p.title} (${media.length} photo${media.length === 1 ? "" : "s"})`);
  }

  // Container-loading photos for the gallery
  if ((await db.loadingPhoto.count()) === 0) {
    for (const f of ["container-loading-1.jpg", "container-loading-2.jpg"]) {
      const a = await upload(f);
      await db.loadingPhoto.create({ data: { url: a.url, thumbUrl: a.thumbUrl, caption: "Container loading" } });
    }
    console.log("  + 2 loading-gallery photos");
  }

  if (demo) await seedDemo(cats, makes);
}

/** 19 placeholder DRAFT products so listing, filters and pagination can be tested. Never public. */
async function seedDemo(cats: Record<string, string>, makes: Record<string, string>) {
  const slugs = Object.keys(makes);
  const kinds = [["engines", "Engine"], ["parts", "Alternator"]] as const;
  const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const svg = (t: string) =>
    Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F4F5F7"/><stop offset="1" stop-color="#C9CDD2"/></linearGradient></defs><rect width="1200" height="900" fill="url(#g)"/><text x="600" y="470" font-family="Arial" font-size="64" font-weight="700" fill="#3A3D42" text-anchor="middle">${esc(t)}</text></svg>`);
  let n = 0;
  for (let i = 0; n < 19; i++) {
    const make = slugs[i % slugs.length];
    const [cat, kind] = kinds[Math.floor(i / slugs.length) % kinds.length];
    const sku = `DEMO-${String(++n).padStart(3, "0")}`;
    if (await db.product.findUnique({ where: { sku } })) continue;
    const makeName = (await db.make.findUnique({ where: { id: makes[make] } }))!.name;
    const png = await sharp(svg(`${makeName} ${kind}`)).png().toBuffer();
    const a = (await processAndStoreImage(png, `${sku}.png`)).asset;
    const title = `[DEMO] ${makeName} ${kind}`;
    await db.product.create({
      data: {
        sku, slug: slugify(`${title} ${sku}`), title, categoryId: cats[cat], makeId: makes[make], status: "DRAFT", stock: (n % 5) + 1,
        images: { create: [{ mediaId: a.id, url: a.url, thumbUrl: a.thumbUrl, blur: a.blur, order: 0, isCover: true }] },
      } satisfies Prisma.ProductUncheckedCreateInput,
    });
  }
  console.log("  + 19 [DEMO] draft products");
}

// Run directly: tsx prisma/seed-catalog.ts [--demo]
if (require.main === module) {
  seedCatalog({ demo: process.argv.includes("--demo") }).finally(() => db.$disconnect());
}
