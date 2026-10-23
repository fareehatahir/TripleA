import { describe, expect, it } from "vitest";
import { buildSheet, parseSpreadsheet } from "@/lib/import/files";

const csv = (text: string | Buffer, name = "p.csv") => parseSpreadsheet(Buffer.isBuffer(text) ? text : Buffer.from(text), name);

describe("CSV parsing", () => {
  it("reads headers and rows, trimming whitespace", async () => {
    const r = await csv("SKU,Title\n A-1 , Engine \nA-2,Gearbox\n");
    expect(r.headers).toEqual(["SKU", "Title"]);
    expect(r.rows).toEqual([{ SKU: "A-1", Title: "Engine" }, { SKU: "A-2", Title: "Gearbox" }]);
    expect(r.total).toBe(2);
  });

  it("handles a BOM and mixed Windows/Unix/old-Mac line endings", async () => {
    const r = await csv("﻿SKU,Title\r\nA-1,One\nA-2,Two\rA-3,Three\r\n");
    expect(r.headers[0]).toBe("SKU");
    expect(r.rows.map((x) => x.SKU)).toEqual(["A-1", "A-2", "A-3"]);
  });

  it("keeps quoted commas, quotes and line breaks inside a cell", async () => {
    const r = await csv('SKU,Description\nA-1,"Line one\nLine two, with ""quotes"""\n');
    expect(r.rows[0].Description).toBe('Line one\nLine two, with "quotes"');
  });

  it("falls back to Windows-1252 for files saved by older Excel (é, ü, £ survive)", async () => {
    const buf = Buffer.from([...Buffer.from("SKU,Title\nA-1,"), 0xe9, 0x74, 0xe9, ...Buffer.from(" caf"), 0xe9, ...Buffer.from("\n")]);
    const r = await csv(buf);
    expect(r.rows[0].Title).toBe("été café");
  });

  it("makes duplicate and empty headers unique, and skips blank lines", async () => {
    const r = await csv("Name,Name,\nA,B,C\n\n,,\nD,E,F\n");
    expect(r.headers).toEqual(["Name", "Name (2)", "Column 3"]);
    expect(r.rows).toHaveLength(2);
  });

  it("rejects empty files, unknown types and oversized files with clear messages", async () => {
    await expect(csv("")).rejects.toThrow(/empty/i);
    await expect(parseSpreadsheet(Buffer.from("x"), "evil.exe")).rejects.toThrow(/csv or .xlsx/i);
    await expect(parseSpreadsheet(Buffer.alloc(10 * 1024 * 1024 + 1), "big.csv")).rejects.toThrow(/10 MB/);
  });

  it("caps rows at 5,000 and reports truncation", async () => {
    const body = Array.from({ length: 5003 }, (_, i) => `S-${i},t`).join("\n");
    const r = await csv(`SKU,Title\n${body}`);
    expect(r.rows).toHaveLength(5000);
    expect(r.truncated).toBe(true);
    expect(r.total).toBe(5003);
  });
});

describe("Excel round trip", () => {
  it("writes an .xlsx and reads the same data back", async () => {
    const { body, ext } = await buildSheet("xlsx", "Products", ["SKU", "Title", "Price"], [["A-1", "Engine", 1500], ["A-2", "Part, with comma", ""]]);
    expect(ext).toBe("xlsx");
    const r = await parseSpreadsheet(body, "export.xlsx");
    expect(r.headers).toEqual(["SKU", "Title", "Price"]);
    expect(r.rows[0]).toEqual({ SKU: "A-1", Title: "Engine", Price: "1500" });
    expect(r.rows[1].Title).toBe("Part, with comma");
  });

  it("exports neutralise spreadsheet formulas in both formats", async () => {
    const { body } = await buildSheet("csv", "S", ["Title"], [["=1+1"], ["+cmd"], ["normal"]]);
    const text = body.toString("utf8");
    expect(text).toContain("'=1+1");
    expect(text).toContain("'+cmd");
    expect(text).toContain("normal");
  });

  it("rejects a corrupt .xlsx without crashing", async () => {
    await expect(parseSpreadsheet(Buffer.from("not really a zip"), "bad.xlsx")).rejects.toThrow(/could not read/i);
  });
});
