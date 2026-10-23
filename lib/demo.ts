// Demo content for Stage 1. Replaced by database queries from Stage 3/4 onward.
export const demoFeatured = [
  { id: "d1", slug: "toyota-hilux-2018", title: "Toyota Hilux Double Cab 2.4D 4WD", sku: "CAR-0142", chips: ["2018", "Diesel", "AT", "4WD"], stock: 3 },
  { id: "d2", slug: "toyota-2gr-fe-engine", title: "Toyota 2GR-FE 3.5L V6 Engine", sku: "ENG-0871", chips: ["2GR-FE", "3456cc", "Petrol"], stock: 12 },
  { id: "d3", slug: "nissan-x-trail-2015", title: "Nissan X-Trail 2.0 2WD", sku: "CAR-0156", chips: ["2015", "Petrol", "CVT"], stock: 2 },
  { id: "d4", slug: "honda-k24a-engine", title: "Honda K24A 2.4L i-VTEC Engine", sku: "ENG-0904", chips: ["K24A", "2354cc", "Petrol"], stock: 8 },
  { id: "d5", slug: "mitsubishi-4m41-engine", title: "Mitsubishi 4M41 3.2L Turbo Diesel", sku: "ENG-0933", chips: ["4M41", "3200cc", "Diesel"], stock: 5 },
  { id: "d6", slug: "lexus-rx350-front-cut", title: "Lexus RX350 Front Cut", sku: "CUT-0027", chips: ["2012", "3.5L", "AT"], stock: 1 },
  { id: "d7", slug: "mazda-cx-5-2016", title: "Mazda CX-5 2.2D AWD", sku: "CAR-0178", chips: ["2016", "Diesel", "AT"], stock: 4 },
];

export const demoStats = [
  { label: "Years in Business", value: 15, suffix: "+" },
  { label: "Containers Shipped", value: 2400, suffix: "+" },
  { label: "Countries Served", value: 48, suffix: "" },
  { label: "Items In Stock", value: 5200, suffix: "+" },
];

export const demoTestimonials = [
  { name: "Samuel K.", role: "Dealer, Mombasa, Kenya", quote: "Photos and condition reports matched what arrived at port. Loading was quick and the paperwork was clean from day one." },
  { name: "Ahmed R.", role: "Importer, Dubai, UAE", quote: "Engine codes were verified before purchase and every unit came with a compression test. Straightforward and dependable." },
  { name: "Nguyen T.", role: "Workshop owner, Ho Chi Minh City", quote: "Our regular container of engines and gearboxes arrives complete and well packed. Communication is fast on WhatsApp." },
];

export const demoLoadings = [
  { id: 1, dest: "Mombasa, Kenya", date: "2026-08" },
  { id: 2, dest: "Jebel Ali, UAE", date: "2026-07" },
  { id: 3, dest: "Dar es Salaam, Tanzania", date: "2026-07" },
  { id: 4, dest: "Karachi, Pakistan", date: "2026-06" },
  { id: 5, dest: "Lagos, Nigeria", date: "2026-05" },
];

// Hero background slides. Add `image` (e.g. "/hero/1.jpg") to show a photo; admin-editable from Stage 5.
export const heroSlides: { image?: string; alt: string }[] = [{ alt: "Cars lined up at port" }, { alt: "Engine warehouse" }, { alt: "Container loading" }];
