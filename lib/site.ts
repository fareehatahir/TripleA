// Static defaults. In Stage 5 these become editable from the admin CMS (SiteSetting / ContentBlock).
export const site = {
  name: "Triple A International",
  short: "TripleA",
  tagline: "Used Cars • Parts • Export",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://tripleaint.tw",
  whatsapp: process.env.NEXT_PUBLIC_WHATSAPP ?? "886900000000", // digits only, international format
  email: "info@tripleaint.tw",
  phone: "+886 900 000 000",
  address: "Taichung, Taiwan",
  hours: "Mon – Sat, 09:00 – 18:00 (GMT+8)",
  social: [
    { label: "Facebook", href: "https://facebook.com" },
    { label: "Instagram", href: "https://instagram.com" },
    { label: "YouTube", href: "https://youtube.com" },
    { label: "LinkedIn", href: "https://linkedin.com" },
  ],
};

export const whatsappLink = (text = "Hello Triple A International, I would like to make an inquiry.", number: string = site.whatsapp) =>
  `https://wa.me/${number.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;

export const makes = [
  { name: "Toyota & Lexus", slug: "toyota-lexus" },
  { name: "Honda", slug: "honda" },
  { name: "Nissan & Infiniti", slug: "nissan-infiniti" },
  { name: "Mitsubishi", slug: "mitsubishi" },
  { name: "Mazda", slug: "mazda" },
  { name: "Hyundai & Kia", slug: "hyundai-kia" },
  { name: "BMW", slug: "bmw" },
  { name: "Mercedes-Benz", slug: "mercedes-benz" },
  { name: "VW & Audi", slug: "vw-audi" },
  { name: "Ford", slug: "ford" },
];

export const categories = [
  { name: "Cars", slug: "cars", blurb: "Inspected used vehicles, ready for export.", count: 120 },
  { name: "Engines", slug: "engines", blurb: "Tested used engines & gearboxes with codes.", count: 340 },
  { name: "Parts", slug: "parts", blurb: "Body, mechanical and electrical parts.", count: 1800 },
  { name: "Car Cuts", slug: "car-cuts", blurb: "Front & rear cuts, complete with components.", count: 85 },
];

export const nav = [
  { label: "Shipping", href: "/shipping" },
  { label: "Services", href: "/services" },
  { label: "Loading Gallery", href: "/loading" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];

export const languages = [
  { code: "EN", label: "English", enabled: true },
  { code: "AR", label: "العربية", enabled: false },
  { code: "FR", label: "Français", enabled: false },
  { code: "RU", label: "Русский", enabled: false },
  { code: "ZH", label: "中文", enabled: false },
];
