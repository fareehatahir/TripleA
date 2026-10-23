import { describe, expect, it } from "vitest";
import { autoMap, IMPORT_FIELDS } from "@/lib/import/columns";
import { parseSpecs, toHtml } from "@/lib/import/process";
import { matchSku } from "@/lib/import/zip-images";
import { safeCell } from "@/lib/import/files";

describe("autoMap", () => {
  it("matches the downloadable template headers to every field", () => {
    const m = autoMap(IMPORT_FIELDS.map((f) => f.header));
    for (const f of IMPORT_FIELDS) expect(m[f.key], f.key).toBe(f.header);
  });
  it("matches common real-world headers", () => {
    const m = autoMap(["Item Code", "Product Name", "Type", "Brand", "Engine Size", "Qty", "FOB Price", "Remarks"]);
    expect(m).toMatchObject({ sku: "Item Code", title: "Product Name", category: "Type", make: "Brand", displacement: "Engine Size", stock: "Qty", price: "FOB Price", description: "Remarks" });
  });
  it("never maps one column to two fields", () => {
    const m = autoMap(["Year", "Title", "SKU", "Category"]);
    const cols = Object.values(m);
    expect(new Set(cols).size).toBe(cols.length);
  });
});

describe("parseSpecs", () => {
  it("parses Name: Value pairs separated by | ; or newlines", () => {
    expect(parseSpecs("Compatible with: Camry 2012-2017 | Weight: 185 kg; Colour: Black\nNote: a:b")).toEqual([
      { key: "Compatible with", value: "Camry 2012-2017" }, { key: "Weight", value: "185 kg" }, { key: "Colour", value: "Black" }, { key: "Note", value: "a:b" },
    ]);
  });
  it("ignores fragments without a name or value", () => {
    expect(parseSpecs("junk | : empty | Key:")).toEqual([]);
  });
});

describe("toHtml", () => {
  it("escapes plain text and keeps paragraphs", () => {
    expect(toHtml("Fits <Camry> & more\n\nSecond")).toBe("<p>Fits &lt;Camry&gt; &amp; more</p><p>Second</p>");
  });
  it("passes real HTML through (sanitised later)", () => {
    expect(toHtml("<p>Hi</p>")).toBe("<p>Hi</p>");
    expect(toHtml("<strong>Hi</strong> there")).toBe("<strong>Hi</strong> there");
  });
});

describe("matchSku (photo ZIP)", () => {
  const skus = ["ENG-1", "ENG-12", "CAR-0001", "Car-0001-B"].map((sku) => ({ sku, lower: sku.toLowerCase() })).sort((a, b) => b.lower.length - a.lower.length);
  it("matches exact names, suffixes and folders", () => {
    expect(matchSku("CAR-0001.jpg", skus)).toBe("CAR-0001");
    expect(matchSku("car-0001_2.JPG", skus)).toBe("CAR-0001");
    expect(matchSku("CAR-0001 front.png", skus)).toBe("CAR-0001");
    expect(matchSku("photos/CAR-0001/front.jpg", skus)).toBe("CAR-0001");
  });
  it("prefers the longest SKU and never matches a longer number", () => {
    expect(matchSku("ENG-12.jpg", skus)).toBe("ENG-12");
    expect(matchSku("ENG-1_2.jpg", skus)).toBe("ENG-1");
    expect(matchSku("ENG-123.jpg", skus)).toBeNull();
    expect(matchSku("random.jpg", skus)).toBeNull();
  });
});

describe("safeCell (spreadsheet formula injection)", () => {
  it("neutralises formulas but keeps numbers", () => {
    expect(safeCell("=HYPERLINK(\"http://evil\")")).toBe("'=HYPERLINK(\"http://evil\")");
    expect(safeCell("+1 555")).toBe("'+1 555");
    expect(safeCell("@SUM(A1)")).toBe("'@SUM(A1)");
    expect(safeCell("-5")).toBe("-5");
    expect(safeCell(42)).toBe("42");
    expect(safeCell(null)).toBe("");
  });
});
