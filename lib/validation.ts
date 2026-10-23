import { z } from "zod";

export const emailSchema = z.string().trim().toLowerCase().email("Enter a valid email");

export const passwordSchema = z
  .string()
  .min(10, "Use at least 10 characters")
  .max(100)
  .regex(/[A-Za-z]/, "Include a letter")
  .regex(/\d/, "Include a number");

export const loginSchema = z.object({ email: emailSchema, password: z.string().min(1, "Enter your password").max(200) });
export const forgotSchema = z.object({ email: emailSchema });

export const createUserSchema = z.object({
  name: z.string().trim().min(2, "Enter a name").max(80),
  email: emailSchema,
  role: z.enum(["SUPER_ADMIN", "EDITOR"]),
  password: passwordSchema,
});

// ---------- catalog ----------
const blank = (v: unknown) => (v === "" || v === null || v === undefined ? undefined : v);
const optInt = (min: number, max: number) => z.preprocess(blank, z.coerce.number().int().min(min).max(max).optional());
const optNum = (min: number, max: number) => z.preprocess(blank, z.coerce.number().min(min).max(max).optional());
const optStr = (max: number) => z.preprocess(blank, z.string().trim().max(max).optional());

export const imageRefSchema = z.object({
  mediaId: z.string().min(1),
  url: z.string().min(1).max(500),
  thumbUrl: z.string().max(500).nullish(),
  blur: z.string().max(4000).nullish(),
  alt: z.string().trim().max(160).nullish(),
});

export const productSchema = z
  .object({
    sku: z.string().trim().min(2, "SKU is required").max(40).regex(/^[A-Za-z0-9._\-/ ]+$/, "Letters, numbers and - . _ / only"),
    title: z.string().trim().min(3, "Enter a title").max(160),
    slug: optStr(90),
    categoryId: z.string().min(1, "Choose a category"),
    makeId: optStr(40),
    modelId: optStr(40),
    yearFrom: optInt(1950, 2100),
    yearTo: optInt(1950, 2100),
    engineCode: optStr(40),
    displacement: optInt(50, 20000),
    fuel: z.preprocess(blank, z.enum(["PETROL", "DIESEL", "HYBRID", "ELECTRIC"]).optional()),
    transmission: z.preprocess(blank, z.enum(["AT", "MT", "CVT"]).optional()),
    drive: z.preprocess(blank, z.enum(["TWO_WD", "FOUR_WD"]).optional()),
    condition: z.enum(["USED", "REBUILT", "NEW"]).default("USED"),
    weightKg: optNum(0, 100000),
    mileageKm: optInt(0, 3000000),
    stock: z.preprocess(blank, z.coerce.number().int().min(0).max(100000)).default(1),
    price: optNum(0, 100000000),
    currency: z.preprocess(blank, z.string().regex(/^[A-Z]{3}$/).optional()),
    showPrice: z.boolean().default(false),
    featured: z.boolean().default(false),
    status: z.enum(["DRAFT", "PUBLISHED", "SOLD", "ARCHIVED"]).default("DRAFT"),
    videoUrl: z.preprocess(blank, z.string().trim().url("Enter a full URL").regex(/^https?:\/\//, "Must start with http(s)://").max(300).optional()),
    seoTitle: optStr(70),
    seoDescription: optStr(170),
    description: z.string().max(50000).optional(),
    included: optStr(2000),
    specs: z.array(z.object({ key: z.string().trim().max(60), value: z.string().trim().max(200) })).max(40).default([]),
    images: z.array(imageRefSchema).max(30).default([]),
  })
  .refine((v) => !v.yearFrom || !v.yearTo || v.yearFrom <= v.yearTo, { path: ["yearTo"], message: "Must be the same or later than 'from'" })
  .refine((v) => !v.showPrice || v.price !== undefined, { path: ["price"], message: "Enter a price or switch to 'Price on request'" });

export type ProductInput = z.input<typeof productSchema>;

const slugField = z.string().trim().max(80).optional();
export const categorySchema = z.object({ name: z.string().trim().min(2, "Enter a name").max(60), slug: slugField, image: z.string().max(500).nullish() });
export const makeSchema = z.object({ name: z.string().trim().min(2, "Enter a name").max(60), slug: slugField, logo: z.string().max(500).nullish() });
export const modelSchema = z.object({ makeId: z.string().min(1), name: z.string().trim().min(1, "Enter a name").max(60), slug: slugField });

// ---------- inquiries ----------
export const inquirySchema = z.object({
  name: z.string().trim().min(2, "Please enter your name").max(80),
  company: z.string().trim().max(100).optional().or(z.literal("")),
  country: z.string().trim().min(2, "Choose your country").max(60),
  phone: z.string().trim().regex(/^\+?[\d\s\-().]{6,24}$/, "Enter a valid phone / WhatsApp number"),
  email: emailSchema,
  port: z.string().trim().max(80).optional().or(z.literal("")),
  message: z.string().trim().max(3000).optional().or(z.literal("")),
  items: z.array(z.object({ productId: z.string().min(1).max(40), qty: z.coerce.number().int().min(1).max(9999), note: z.string().trim().max(500).optional() })).max(50),
  consent: z.literal(true, { errorMap: () => ({ message: "Please accept the privacy notice" }) }),
  website: z.string().max(200).optional(), // honeypot: real people leave this empty
});
export type InquiryInput = z.input<typeof inquirySchema>;

export const replySchema = z.object({ subject: z.string().trim().min(3).max(150), body: z.string().trim().min(5, "Write a message").max(8000) });

// ---------- contact ----------
export const contactSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name").max(80),
  email: emailSchema,
  phone: z.string().trim().regex(/^\+?[\d\s\-().]{6,24}$/, "Enter a valid phone number").optional().or(z.literal("")),
  subject: z.string().trim().min(3, "Please add a subject").max(120),
  message: z.string().trim().min(10, "Please write a few words").max(4000),
  website: z.string().max(200).optional(), // honeypot
  token: z.string().max(4000).optional(), // Cloudflare Turnstile
});
export type ContactInput = z.input<typeof contactSchema>;

// ---------- content management ----------
const blankStr = (v: unknown) => (v === "" || v === null || v === undefined ? undefined : v);
export const faqSchema = z.object({
  question: z.string().trim().min(3, "Enter the question").max(200),
  answer: z.string().trim().min(3, "Enter the answer").max(3000),
  group: z.enum(["general", "shipping"]).default("general"),
  active: z.boolean().default(true),
});
export const testimonialSchema = z.object({
  name: z.string().trim().min(2, "Enter a name").max(80),
  role: z.preprocess(blankStr, z.string().trim().max(120).optional()),
  quote: z.string().trim().min(10, "The quote is too short").max(600),
  active: z.boolean().default(true),
});
export const rateSchema = z.object({
  departure: z.string().trim().min(2).max(60).default("Taiwan"),
  country: z.string().trim().min(2, "Enter the destination country").max(60),
  port: z.string().trim().min(2, "Enter the port").max(80),
  containerType: z.string().trim().min(2).max(20).default("40HQ"),
  freightUsd: z.coerce.number({ invalid_type_error: "Enter the freight in USD" }).min(0).max(1000000),
  validUntil: z.coerce.date({ errorMap: () => ({ message: "Choose the validity date" }) }),
});
export const loadingPhotoSchema = z.object({
  caption: z.preprocess(blankStr, z.string().trim().max(160).optional()),
  destination: z.preprocess(blankStr, z.string().trim().max(80).optional()),
  shotAt: z.coerce.date({ errorMap: () => ({ message: "Choose a valid date" }) }),
});
export const blogSchema = z.object({
  title: z.string().trim().min(3, "Enter a title").max(160),
  slug: z.preprocess(blankStr, z.string().trim().max(100).optional()),
  excerpt: z.preprocess(blankStr, z.string().trim().max(300).optional()),
  content: z.string().trim().min(20, "Write the article body").max(200000),
  coverUrl: z.preprocess(blankStr, z.string().max(500).optional()),
  tags: z.array(z.string().trim().min(1).max(30)).max(10).default([]),
  status: z.enum(["DRAFT", "PUBLISHED"]).default("DRAFT"),
  publishedAt: z.preprocess(blankStr, z.coerce.date().optional()),
  seoTitle: z.preprocess(blankStr, z.string().trim().max(70).optional()),
  seoDescription: z.preprocess(blankStr, z.string().trim().max(170).optional()),
});
