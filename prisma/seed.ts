import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

const categories = [
  { name: "Cars", slug: "cars" },
  { name: "Engines", slug: "engines" },
  { name: "Parts", slug: "parts" },
  { name: "Car Cuts", slug: "car-cuts" },
];

const makes = [
  ["Toyota & Lexus", "toyota-lexus"],
  ["Honda", "honda"],
  ["Nissan & Infiniti", "nissan-infiniti"],
  ["Mitsubishi", "mitsubishi"],
  ["Mazda", "mazda"],
  ["Hyundai & Kia", "hyundai-kia"],
  ["BMW", "bmw"],
  ["Mercedes-Benz", "mercedes-benz"],
  ["VW & Audi", "vw-audi"],
  ["Ford", "ford"],
];

const addDays = (d: number) => new Date(Date.now() + d * 86400000);

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) throw new Error("Set ADMIN_EMAIL and ADMIN_PASSWORD in .env before seeding.");

  const existing = await db.user.findUnique({ where: { email } });
  if (!existing) {
    await db.user.create({
      data: {
        email,
        name: process.env.ADMIN_NAME ?? "Site Owner",
        passwordHash: await bcrypt.hash(password, 12),
        role: "SUPER_ADMIN",
      },
    });
    console.log(`Created super admin ${email}`);
  } else {
    console.log(`Super admin ${email} already exists, left unchanged`);
  }

  for (const [i, c] of categories.entries())
    await db.category.upsert({ where: { slug: c.slug }, update: {}, create: { ...c, order: i } });
  for (const [i, [name, slug]] of makes.entries())
    await db.make.upsert({ where: { slug }, update: {}, create: { name, slug, order: i } });

  if ((await db.shippingRate.count()) === 0) {
    const rates: [string, string, number][] = [
      ["Kenya", "Mombasa", 2650],
      ["Tanzania", "Dar es Salaam", 2750],
      ["Nigeria", "Lagos (Apapa)", 3300],
      ["UAE", "Jebel Ali", 1450],
      ["Pakistan", "Karachi", 1650],
      ["Philippines", "Manila", 950],
    ];
    await db.shippingRate.createMany({
      data: rates.map(([country, port, freightUsd], order) => ({ country, port, freightUsd, validUntil: addDays(order === 5 ? -10 : 30), order })),
    });
  }

  if ((await db.testimonial.count()) === 0) {
    await db.testimonial.createMany({
      data: [
        { name: "Samuel K.", role: "Dealer, Mombasa, Kenya", quote: "Photos and condition reports matched what arrived at port. Loading was quick and the paperwork was clean from day one.", order: 0 },
        { name: "Ahmed R.", role: "Importer, Dubai, UAE", quote: "Engine codes were verified before purchase and every unit came with a compression test. Straightforward and dependable.", order: 1 },
        { name: "Nguyen T.", role: "Workshop owner, Ho Chi Minh City", quote: "Our regular container of engines and gearboxes arrives complete and well packed. Communication is fast on WhatsApp.", order: 2 },
      ],
    });
  }
  if ((await db.faq.count()) === 0) {
    await db.faq.createMany({
      data: [
        { question: "How do I pay?", answer: "We accept bank transfer (T/T). A deposit confirms your order and the balance is paid before loading. The exact terms are written on your quotation.", group: "shipping", order: 0 },
        { question: "Can I see the goods before they ship?", answer: "Yes. We send photos and video of the exact units and of your container being loaded. You can also arrange an inspection in Taiwan.", group: "shipping", order: 1 },
        { question: "How long does shipping take?", answer: "It depends on the destination port and the sailing schedule. We give you an estimated departure and arrival date in your quotation, and loading usually happens within a few days of payment.", group: "shipping", order: 2 },
        { question: "Which documents do I receive?", answer: "Commercial invoice, packing list, bill of lading and export declaration. Other documents, such as a certificate of origin, are available on request.", group: "shipping", order: 3 },
        { question: "Do you ship by container or RoRo?", answer: "Both are possible depending on the vehicle and your destination. Tell us your port and we will recommend the best option.", group: "general", order: 4 },
      ],
    });
  }

  if (process.env.SEED_CATALOG === "false") console.log("SEED_CATALOG=false: skipping the sample products and gallery photos.");
  else {
    const { seedCatalog } = await import("./seed-catalog");
    console.log("Seeding catalog (photos → WebP)…");
    await seedCatalog();
  }
  console.log("Seed complete.");
}

main().finally(() => db.$disconnect());
