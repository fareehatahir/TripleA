import ExcelJS from "exceljs";
import Papa from "papaparse";
import { MAX_IMPORT_ROWS } from "./columns";
import type { RawRow } from "./process";

export const MAX_FILE_BYTES = 10 * 1024 * 1024;

function decode(buf: Buffer) {
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(buf).replace(/^\uFEFF/, "");
  } catch {
    text = new TextDecoder("windows-1252").decode(buf); // CSV saved by older Excel on Windows
  }
  // Files edited by hand or merged from several sources can mix \r\n, \n and \r; make them uniform so rows split correctly.
  return text.replace(/\r\n?/g, "\n");
}

const uniqueHeaders = (hs: string[]) => {
  const seen = new Map<string, number>();
  return hs.map((h, i) => {
    const base = h.trim() || `Column ${i + 1}`;
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    return n === 1 ? base : `${base} (${n})`;
  });
};

function toRows(matrix: string[][]) {
  const [head, ...body] = matrix.filter((r) => r.some((c) => String(c ?? "").trim() !== ""));
  if (!head) throw new Error("The file is empty.");
  const headers = uniqueHeaders(head.map(String));
  if (headers.length > 80) throw new Error("Too many columns (limit 80).");
  const truncated = body.length > MAX_IMPORT_ROWS;
  const rows = body.slice(0, MAX_IMPORT_ROWS).map((r) => Object.fromEntries(headers.map((h, i) => [h, String(r[i] ?? "").trim()])) as RawRow);
  return { headers, rows, truncated, total: body.length };
}

function cellText(v: ExcelJS.CellValue): string {
  if (v === null || v === undefined) return "";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "object") {
    if ("result" in v && v.result !== undefined) return cellText(v.result as ExcelJS.CellValue); // formula
    if ("richText" in v) return v.richText.map((t) => t.text).join("");
    if ("text" in v) return String(v.text); // hyperlink
    return "";
  }
  return String(v);
}

export async function parseSpreadsheet(buf: Buffer, filename: string) {
  if (buf.length > MAX_FILE_BYTES) throw new Error("File is larger than 10 MB.");
  const name = filename.toLowerCase();
  if (name.endsWith(".csv") || name.endsWith(".txt")) {
    const parsed = Papa.parse<string[]>(decode(buf), { skipEmptyLines: "greedy" });
    if (!parsed.data.length) throw new Error("The file is empty.");
    return toRows(parsed.data);
  }
  if (name.endsWith(".xlsx")) {
    const wb = new ExcelJS.Workbook();
    try {
      await wb.xlsx.load(buf as unknown as ArrayBuffer);
    } catch {
      throw new Error("Could not read that Excel file. Save it as .xlsx or .csv and try again.");
    }
    const ws = wb.worksheets[0];
    if (!ws) throw new Error("The workbook has no sheets.");
    const matrix: string[][] = [];
    ws.eachRow({ includeEmpty: false }, (row) => {
      if (matrix.length > MAX_IMPORT_ROWS + 1) return;
      const cells: string[] = [];
      for (let c = 1; c <= Math.min(row.cellCount, 80); c++) cells.push(cellText(row.getCell(c).value));
      matrix.push(cells);
    });
    return toRows(matrix);
  }
  throw new Error("Please upload a .csv or .xlsx file.");
}

/** Spreadsheet programs run cells starting with = + - @ as formulas; prefix them so they stay plain text. */
export const safeCell = (v: unknown) => {
  const s = v === null || v === undefined ? "" : String(v);
  return /^[=+\-@\t\r]/.test(s) && Number.isNaN(Number(s)) ? `'${s}` : s;
};

export async function buildSheet(format: "csv" | "xlsx", sheetName: string, headers: string[], rows: unknown[][]) {
  const data = rows.map((r) => r.map(safeCell));
  if (format === "csv") {
    const csv = Papa.unparse({ fields: headers, data }, { newline: "\r\n" });
    return { body: Buffer.from("﻿" + csv, "utf8"), type: "text/csv; charset=utf-8", ext: "csv" };
  }
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(sheetName);
  ws.addRow(headers).font = { bold: true };
  data.forEach((r) => ws.addRow(r));
  ws.columns.forEach((c, i) => (c.width = Math.min(40, Math.max(12, headers[i].length + 2))));
  ws.views = [{ state: "frozen", ySplit: 1 }];
  const out = Buffer.from(await wb.xlsx.writeBuffer());
  return { body: out, type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", ext: "xlsx" };
}
