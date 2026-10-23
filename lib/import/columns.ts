// Client-safe: shared by the import wizard (browser) and the importer (server). No database imports here.

export type ImportFieldKey =
  | "sku" | "title" | "category" | "make" | "model" | "yearFrom" | "yearTo" | "engineCode" | "displacement" | "fuel" | "transmission" | "drive"
  | "condition" | "weightKg" | "mileageKm" | "stock" | "price" | "showPrice" | "currency" | "status" | "featured" | "description" | "included"
  | "videoUrl" | "seoTitle" | "seoDescription" | "specs";

export const IMPORT_FIELDS: { key: ImportFieldKey; label: string; header: string; required?: boolean; hint?: string; aliases: string[]; example: [string, string] }[] = [
  { key: "sku", label: "SKU / code", header: "SKU", required: true, aliases: ["sku", "code", "item code", "stock no", "stock number", "part number", "part no", "ref", "reference", "id"], example: ["ENG-1001", "CAR-2001"] },
  { key: "title", label: "Title", header: "Title", required: true, aliases: ["title", "name", "product", "product name", "item", "item name"], example: ["Toyota 2GR-FE 3.5L V6 Engine", "Honda Civic 1.8 Sedan"] },
  { key: "category", label: "Category", header: "Category", required: true, aliases: ["category", "type", "product type", "group"], example: ["Engines", "Cars"] },
  { key: "make", label: "Make (brand)", header: "Make", aliases: ["make", "brand", "manufacturer", "marque"], example: ["Toyota", "Honda"] },
  { key: "model", label: "Model", header: "Model", aliases: ["model", "car model", "vehicle"], example: ["Camry", "Civic"] },
  { key: "yearFrom", label: "Year from", header: "Year from", aliases: ["year from", "year", "from year", "yearfrom", "year start", "model year", "from"], example: ["2012", "2014"] },
  { key: "yearTo", label: "Year to", header: "Year to", aliases: ["year to", "to year", "yearto", "year end", "to"], example: ["2017", ""] },
  { key: "engineCode", label: "Engine code", header: "Engine code", aliases: ["engine code", "engine", "enginecode", "motor code", "engine no"], example: ["2GR-FE", "R18A"] },
  { key: "displacement", label: "Displacement (cc)", header: "Displacement (cc)", aliases: ["displacement", "cc", "engine size", "capacity", "displacement cc", "engine cc"], example: ["3456", "1798"] },
  { key: "fuel", label: "Fuel", header: "Fuel", aliases: ["fuel", "fuel type", "petrol diesel"], example: ["Petrol", "Petrol"] },
  { key: "transmission", label: "Transmission", header: "Transmission", aliases: ["transmission", "gearbox", "trans", "gear"], example: ["AT", "MT"] },
  { key: "drive", label: "Drive", header: "Drive", aliases: ["drive", "drivetrain", "wheel drive", "2wd 4wd"], example: ["2WD", "2WD"] },
  { key: "condition", label: "Condition", header: "Condition", aliases: ["condition", "state", "grade"], example: ["Used", "Used"] },
  { key: "weightKg", label: "Weight (kg)", header: "Weight (kg)", aliases: ["weight", "weight kg", "kg", "weight (kg)"], example: ["185", ""] },
  { key: "mileageKm", label: "Mileage (km)", header: "Mileage (km)", aliases: ["mileage", "km", "odometer", "mileage km", "mileage (km)", "kms"], example: ["68000", "92000"] },
  { key: "stock", label: "Stock quantity", header: "Stock", aliases: ["stock", "quantity", "qty", "units", "in stock", "available"], example: ["4", "1"] },
  { key: "price", label: "Price", header: "Price", aliases: ["price", "fob", "fob price", "cost", "amount", "usd"], example: ["", "4200"] },
  { key: "showPrice", label: "Show price publicly", header: "Show price (yes/no)", aliases: ["show price", "show price yes no", "display price", "public price"], example: ["no", "yes"] },
  { key: "currency", label: "Currency", header: "Currency", aliases: ["currency", "curr"], example: ["", "USD"] },
  { key: "status", label: "Status", header: "Status", aliases: ["status", "publish", "published", "visibility"], example: ["draft", "published"] },
  { key: "featured", label: "Featured", header: "Featured (yes/no)", aliases: ["featured", "feature", "highlight", "featured yes no"], example: ["no", "yes"] },
  { key: "description", label: "Description", header: "Description", aliases: ["description", "details", "desc", "notes", "remarks", "long description"], example: ["Tested engine, low mileage.", "Clean interior, full service history."] },
  { key: "included", label: "What is included", header: "Included", aliases: ["included", "includes", "what is included", "accessories", "complete with"], example: ["Alternator, A/C compressor, ECU", ""] },
  { key: "videoUrl", label: "Video URL", header: "Video URL", aliases: ["video", "video url", "youtube", "video link"], example: ["", ""] },
  { key: "seoTitle", label: "SEO title", header: "SEO title", aliases: ["seo title", "meta title"], example: ["", ""] },
  { key: "seoDescription", label: "SEO description", header: "SEO description", aliases: ["seo description", "meta description"], example: ["", ""] },
  { key: "specs", label: "Extra specs", header: "Extra specs (Name: Value | Name: Value)", hint: "Format: Name: Value | Name: Value", aliases: ["specs", "extra specs", "specifications", "extra specs name value name value", "attributes", "compatibility"], example: ["Compatible with: Camry 2012-2017 | Weight: 185 kg", ""] },
];

export type Mapping = Partial<Record<ImportFieldKey, string>>; // field → source column header ("" / missing = not imported
export type ImportOptions = { updateExisting: boolean; createMissingTaxonomy: boolean; defaultStatus: "DRAFT" | "PUBLISHED" };

export const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/** Best-effort guess of which column holds which field, from the header names. */
export function autoMap(headers: string[]): Mapping {
  const m: Mapping = {};
  const taken = new Set<string>();
  const entries = headers.map((h) => ({ h, n: norm(h) }));
  // exact alias matches first (strongest), then "header starts with / contains alias"
  for (const pass of ["exact", "loose"] as const) {
    for (const f of IMPORT_FIELDS) {
      if (m[f.key]) continue;
      const hit = entries.find((e) => !taken.has(e.h) && e.n && f.aliases.some((a) => (pass === "exact" ? e.n === a : e.n.startsWith(a + " ") || e.n.endsWith(" " + a))));
      if (hit) { m[f.key] = hit.h; taken.add(hit.h); }
    }
  }
  return m;
}

export const MAX_IMPORT_ROWS = 5000;
export type RowResult = { index: number; sku: string; title: string; action: "create" | "update" | "skip" | "error"; errors: string[]; notes: string[] };
