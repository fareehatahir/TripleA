"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { AlertTriangle, ArrowLeft, Check, CheckCircle2, Download, FileSpreadsheet, FileUp, ImageUp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge, Card, inputCls } from "@/components/admin/ui";
import { IMPORT_FIELDS, type ImportFieldKey, type ImportOptions, type Mapping, type RowResult } from "@/lib/import/columns";
import { cn } from "@/lib/utils";

type Parsed = { headers: string[]; rows: Record<string, string>[]; total: number; truncated: boolean; filename: string };
type Summary = { create: number; update: number; skip: number; error: number };
type ZipReport = { matched: Record<string, number>; added: number; duplicates: number; unmatched: string[]; skipped: string[]; errors: string[]; totalFiles: number };
const CHUNK = 250;

async function post<T>(url: string, body: BodyInit, json = false): Promise<T> {
  const res = await fetch(url, { method: "POST", body, headers: json ? { "Content-Type": "application/json" } : undefined });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
  return data as T;
}

function downloadCsv(name: string, rows: string[][]) {
  const csv = "﻿" + rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\r\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

const tone = { create: "green", update: "amber", skip: "gray", error: "red" } as const;
const word = { create: "Will create", update: "Will update", skip: "Skipped", error: "Error" } as const;

function Steps({ step }: { step: number }) {
  return (
    <ol className="mb-6 flex flex-wrap gap-2 text-sm font-semibold" aria-label="Import steps">
      {["Upload file", "Match columns", "Check & preview", "Done"].map((s, i) => (
        <li key={s} aria-current={step === i ? "step" : undefined} className={cn("flex items-center gap-2 rounded-full px-4 py-1.5", step === i ? "bg-charcoal text-white dark:bg-brand" : i < step ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "bg-mist dark:bg-white/10")}>
          {i < step ? <Check className="h-4 w-4" /> : <span>{i + 1}</span>} {s}
        </li>
      ))}
    </ol>
  );
}

function ProductImport({ categories }: { categories: string[] }) {
  const file = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [parsed, setParsed] = useState<Parsed | null>(null);
  const [mapping, setMapping] = useState<Mapping>({});
  const [opts, setOpts] = useState<ImportOptions>({ updateExisting: false, createMissingTaxonomy: true, defaultStatus: "DRAFT" });
  const [results, setResults] = useState<RowResult[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [filter, setFilter] = useState<"all" | "problems">("all");
  const [progress, setProgress] = useState(0);
  const missing = IMPORT_FIELDS.filter((f) => f.required && !mapping[f.key]);

  const reset = () => { setStep(0); setParsed(null); setResults([]); setSummary(null); setError(null); setProgress(0); if (file.current) file.current.value = ""; };

  const upload = async (f: File) => {
    setError(null); setBusy("Reading your file…");
    try {
      const fd = new FormData(); fd.append("file", f);
      const r = await post<Parsed & { mapping: Mapping }>("/api/admin/import/parse", fd);
      setParsed(r); setMapping(r.mapping); setStep(1);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not read the file"); }
    setBusy(null);
  };

  const body = () => JSON.stringify({ rows: parsed!.rows, mapping: Object.fromEntries(Object.entries(mapping).filter(([, v]) => v)), options: opts });

  const check = async () => {
    setError(null); setBusy("Checking every row…");
    try {
      const r = await post<{ results: RowResult[]; summary: Summary }>("/api/admin/import/validate", body(), true);
      setResults(r.results); setSummary(r.summary); setStep(2);
    } catch (e) { setError(e instanceof Error ? e.message : "Check failed"); }
    setBusy(null);
  };

  const run = async () => {
    if (!parsed) return;
    setError(null); setBusy("Importing…"); setProgress(0);
    const all: RowResult[] = [];
    const m = Object.fromEntries(Object.entries(mapping).filter(([, v]) => v));
    try {
      for (let i = 0; i < parsed.rows.length; i += CHUNK) {
        const r = await post<{ results: RowResult[] }>("/api/admin/import/commit", JSON.stringify({ rows: parsed.rows.slice(i, i + CHUNK), mapping: m, options: opts }), true);
        all.push(...r.results.map((x) => ({ ...x, index: x.index + i })));
        setProgress(Math.min(100, Math.round(((i + CHUNK) / parsed.rows.length) * 100)));
      }
      setResults(all);
      setSummary({ create: all.filter((r) => r.action === "create").length, update: all.filter((r) => r.action === "update").length, skip: all.filter((r) => r.action === "skip").length, error: all.filter((r) => r.action === "error").length });
      setStep(3);
    } catch (e) { setError(`${e instanceof Error ? e.message : "Import failed"}. Rows before this point may already be saved; check the Products list.`); }
    setBusy(null);
  };

  const shown = (filter === "problems" ? results.filter((r) => r.action === "error" || r.notes.length) : results).slice(0, 200);
  const doable = (summary?.create ?? 0) + (summary?.update ?? 0);

  return (
    <Card className="p-6">
      <h2 className="flex items-center gap-2 text-lg font-bold"><FileSpreadsheet className="h-5 w-5 text-brand" /> Import products from Excel or CSV</h2>
      <p className="mt-1 text-sm">Add many products at once. You can review everything before anything is saved.</p>
      <div className="mt-5"><Steps step={step} /></div>
      {error && <p role="alert" className="mb-4 rounded-xl bg-brand/10 px-4 py-3 text-sm font-medium text-brand">{error}</p>}
      {busy && <p role="status" className="mb-4 flex items-center gap-2 text-sm font-medium"><Loader2 className="h-4 w-4 animate-spin text-brand" /> {busy}{progress > 0 && ` ${progress}%`}</p>}

      {step === 0 && (
        <div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="ghost" size="sm"><a href="/api/admin/import/template?format=xlsx"><Download className="h-4 w-4" /> Excel template</a></Button>
            <Button asChild variant="ghost" size="sm"><a href="/api/admin/import/template?format=csv"><Download className="h-4 w-4" /> CSV template</a></Button>
          </div>
          <div role="button" tabIndex={0} onClick={() => file.current?.click()} onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && file.current?.click()}
            onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) upload(f); }}
            className="mt-4 grid cursor-pointer place-items-center rounded-2xl border-2 border-dashed border-silver px-6 py-10 text-center transition hover:border-graphite dark:border-white/20">
            <div><FileUp className="mx-auto h-8 w-8 text-brand" /><p className="mt-2 text-sm font-semibold text-charcoal dark:text-white">Drop your .xlsx or .csv file here, or click to browse</p><p className="mt-1 text-xs">Up to 5,000 rows and 10 MB. The first row must contain column names.</p></div>
            <input ref={file} type="file" accept=".csv,.xlsx" hidden onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
          </div>
          <p className="mt-3 text-xs">Valid categories: {categories.join(", ")}. Makes and models can be created automatically.</p>
        </div>
      )}

      {step === 1 && parsed && (
        <div>
          <p className="text-sm"><strong className="text-charcoal dark:text-white">{parsed.filename}</strong>: {parsed.total.toLocaleString()} rows found{parsed.truncated && <span className="text-brand"> (only the first 5,000 will be imported)</span>}. We matched the columns for you; check them and fix anything wrong.</p>
          <div className="mt-4 overflow-x-auto rounded-xl ring-1 ring-silver/50 dark:ring-white/10">
            <table className="w-full text-left text-sm">
              <thead className="bg-mist text-xs uppercase tracking-wider dark:bg-white/5"><tr><th className="px-4 py-3">Product field</th><th className="px-4 py-3">Column in your file</th><th className="px-4 py-3">Example from row 1</th></tr></thead>
              <tbody className="divide-y divide-silver/40 dark:divide-white/10">
                {IMPORT_FIELDS.map((f) => (
                  <tr key={f.key}>
                    <td className="px-4 py-2 font-medium text-charcoal dark:text-white">{f.label}{f.required && <span className="text-brand" aria-label="required"> *</span>}</td>
                    <td className="px-4 py-2"><select aria-label={`Column for ${f.label}`} className={cn(inputCls, "h-9", f.required && !mapping[f.key] && "border-brand")} value={mapping[f.key] ?? ""} onChange={(e) => setMapping({ ...mapping, [f.key as ImportFieldKey]: e.target.value })}><option value="">— don’t import —</option>{parsed.headers.map((h) => <option key={h} value={h}>{h}</option>)}</select></td>
                    <td className="max-w-[16rem] truncate px-4 py-2 text-xs">{mapping[f.key] ? parsed.rows[0]?.[mapping[f.key]!] || "(empty)" : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-5 space-y-3 rounded-xl bg-mist p-4 text-sm dark:bg-white/5">
            <label className="flex cursor-pointer items-start gap-3"><input type="checkbox" className="mt-0.5 h-4 w-4 accent-brand" checked={opts.updateExisting} onChange={(e) => setOpts({ ...opts, updateExisting: e.target.checked })} /><span><strong className="text-charcoal dark:text-white">Update products that already exist</strong> (matched by SKU). Only filled-in cells are changed; blank cells never erase data. Otherwise existing SKUs are skipped.</span></label>
            <label className="flex cursor-pointer items-start gap-3"><input type="checkbox" className="mt-0.5 h-4 w-4 accent-brand" checked={opts.createMissingTaxonomy} onChange={(e) => setOpts({ ...opts, createMissingTaxonomy: e.target.checked })} /><span><strong className="text-charcoal dark:text-white">Create makes and models that do not exist yet</strong></span></label>
            <label className="flex items-center gap-3"><span className="font-semibold text-charcoal dark:text-white">New products are</span><select className={cn(inputCls, "h-9 w-48")} value={opts.defaultStatus} onChange={(e) => setOpts({ ...opts, defaultStatus: e.target.value as ImportOptions["defaultStatus"] })}><option value="DRAFT">Drafts (hidden)</option><option value="PUBLISHED">Published (visible)</option></select><span className="text-xs">unless a Status column says otherwise</span></label>
          </div>
          {missing.length > 0 && <p role="alert" className="mt-4 text-sm font-medium text-brand">Match these required fields first: {missing.map((m) => m.label).join(", ")}</p>}
          <div className="mt-5 flex gap-2"><Button variant="ghost" onClick={reset}><ArrowLeft className="h-4 w-4" /> Start over</Button><Button disabled={missing.length > 0 || !!busy} onClick={check}>Check my data</Button></div>
        </div>
      )}

      {step === 2 && summary && (
        <div>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {(["create", "update", "skip", "error"] as const).map((k) => <li key={k} className="rounded-xl bg-mist p-4 dark:bg-white/5"><p className="font-display text-2xl font-extrabold text-charcoal dark:text-white">{summary[k]}</p><p className="text-xs uppercase tracking-wider">{word[k]}</p></li>)}
          </ul>
          {summary.error > 0 && <p className="mt-4 flex items-start gap-2 rounded-xl bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-200"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {summary.error} row{summary.error === 1 ? " has" : "s have"} problems and will be skipped. Fix them in your file and import again, or continue with the rest.</p>}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {(["all", "problems"] as const).map((f) => <button key={f} onClick={() => setFilter(f)} aria-pressed={filter === f} className={cn("rounded-full px-4 py-1.5 text-sm font-semibold", filter === f ? "bg-charcoal text-white dark:bg-brand" : "bg-mist dark:bg-white/10")}>{f === "all" ? "All rows" : "Problems & notes"}</button>)}
            {summary.error > 0 && <Button variant="ghost" size="sm" onClick={() => downloadCsv("import-errors.csv", [["Row", "SKU", "Problem"], ...results.filter((r) => r.action === "error").map((r) => [String(r.index), r.sku, r.errors.join("; ")])])}><Download className="h-4 w-4" /> Download problem list</Button>}
          </div>
          <div className="mt-3 max-h-[28rem] overflow-auto rounded-xl ring-1 ring-silver/50 dark:ring-white/10">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-mist text-xs uppercase tracking-wider dark:bg-charcoal"><tr><th className="px-4 py-3">Row</th><th className="px-4 py-3">SKU</th><th className="px-4 py-3">Title</th><th className="px-4 py-3">Result</th></tr></thead>
              <tbody className="divide-y divide-silver/40 dark:divide-white/10">
                {shown.map((r) => (
                  <tr key={r.index} className={r.action === "error" ? "bg-brand/5" : undefined}>
                    <td className="px-4 py-2 tabular-nums">{r.index}</td><td className="px-4 py-2 font-medium text-charcoal dark:text-white">{r.sku || "—"}</td><td className="max-w-[14rem] truncate px-4 py-2">{r.title}</td>
                    <td className="px-4 py-2"><Badge tone={tone[r.action]}>{word[r.action]}</Badge>{[...r.errors, ...r.notes].map((m, i) => <p key={i} className={cn("mt-1 text-xs", r.errors.includes(m) && "font-medium text-brand")}>{m}</p>)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {results.length > 200 && filter === "all" && <p className="mt-2 text-xs">Showing the first 200 of {results.length} rows.</p>}
          <div className="mt-5 flex gap-2"><Button variant="ghost" onClick={() => setStep(1)}><ArrowLeft className="h-4 w-4" /> Back</Button><Button disabled={doable === 0 || !!busy} onClick={run}>Import {doable} product{doable === 1 ? "" : "s"}</Button></div>
        </div>
      )}

      {step === 3 && summary && (
        <div>
          <p className="flex items-center gap-2 text-lg font-bold text-emerald-700 dark:text-emerald-300"><CheckCircle2 className="h-6 w-6" /> Import finished</p>
          <p className="mt-2 text-sm">{summary.create} created, {summary.update} updated, {summary.skip} skipped, {summary.error} with errors.</p>
          {summary.error > 0 && <Button variant="ghost" size="sm" className="mt-3" onClick={() => downloadCsv("import-errors.csv", [["Row", "SKU", "Problem"], ...results.filter((r) => r.action === "error").map((r) => [String(r.index), r.sku, r.errors.join("; ")])])}><Download className="h-4 w-4" /> Download problem list</Button>}
          <div className="mt-5 flex flex-wrap gap-2"><Button asChild><Link href="/admin/products">View products</Link></Button><Button variant="ghost" onClick={reset}>Import another file</Button></div>
          <p className="mt-4 text-xs">Next: add photos with the ZIP tool below, named by SKU.</p>
        </div>
      )}
    </Card>
  );
}

function PhotoZip() {
  const file = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<ZipReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const go = async (f: File) => {
    setBusy(true); setError(null); setReport(null);
    try { const fd = new FormData(); fd.append("file", f); setReport(await post<ZipReport>("/api/admin/import/images", fd)); }
    catch (e) { setError(e instanceof Error ? e.message : "Upload failed"); }
    setBusy(false);
    if (file.current) file.current.value = "";
  };
  return (
    <Card className="p-6">
      <h2 className="flex items-center gap-2 text-lg font-bold"><ImageUp className="h-5 w-5 text-brand" /> Add photos from a ZIP</h2>
      <p className="mt-1 text-sm">Name each photo after the product SKU and put them in one ZIP file. We attach them to the right products automatically.</p>
      <ul className="mt-3 list-disc space-y-1 pl-5 text-sm"><li><code className="rounded bg-mist px-1 dark:bg-white/10">ENG-1001.jpg</code>, <code className="rounded bg-mist px-1 dark:bg-white/10">ENG-1001_2.jpg</code>, <code className="rounded bg-mist px-1 dark:bg-white/10">ENG-1001-front.jpg</code></li><li>or a folder per product: <code className="rounded bg-mist px-1 dark:bg-white/10">ENG-1001/1.jpg</code></li><li>Photos are sorted by file name; the first becomes the cover if the product has none. Up to 200 MB per ZIP.</li></ul>
      <Button className="mt-4" disabled={busy} onClick={() => file.current?.click()}>{busy ? <><Loader2 className="h-4 w-4 animate-spin" /> Processing photos…</> : <><ImageUp className="h-4 w-4" /> Choose ZIP file</>}</Button>
      <input ref={file} type="file" accept=".zip,application/zip" hidden onChange={(e) => e.target.files?.[0] && go(e.target.files[0])} />
      {error && <p role="alert" className="mt-4 rounded-xl bg-brand/10 px-4 py-3 text-sm font-medium text-brand">{error}</p>}
      {report && (
        <div role="status" className="mt-4 space-y-3 text-sm">
          <p className="rounded-xl bg-emerald-500/10 px-4 py-3 font-medium text-emerald-800 dark:text-emerald-300">{report.added} photo{report.added === 1 ? "" : "s"} added to {Object.keys(report.matched).length} product{Object.keys(report.matched).length === 1 ? "" : "s"}{report.duplicates > 0 && `; ${report.duplicates} were already attached`}.</p>
          {report.unmatched.length > 0 && <div className="rounded-xl bg-amber-500/10 px-4 py-3 text-amber-900 dark:text-amber-200"><p className="font-semibold">{report.unmatched.length} file{report.unmatched.length === 1 ? "" : "s"} did not match any SKU:</p><p className="mt-1 break-words text-xs">{report.unmatched.join(", ")}</p></div>}
          {report.errors.length > 0 && <div className="rounded-xl bg-brand/10 px-4 py-3 text-brand"><p className="font-semibold">Problems:</p><ul className="mt-1 list-disc pl-5 text-xs">{report.errors.map((e, i) => <li key={i}>{e}</li>)}</ul></div>}
        </div>
      )}
    </Card>
  );
}

export function ImportTools({ productCount, categories }: { productCount: number; categories: string[] }) {
  return (
    <div className="space-y-6">
      <ProductImport categories={categories} />
      <PhotoZip />
      <Card className="p-6">
        <h2 className="flex items-center gap-2 text-lg font-bold"><Download className="h-5 w-5 text-brand" /> Export products</h2>
        <p className="mt-1 text-sm">Download all {productCount.toLocaleString()} products in the same layout the importer reads, so you can edit in Excel and import again.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button asChild><a href="/api/admin/products/export?format=xlsx"><Download className="h-4 w-4" /> Excel (.xlsx)</a></Button>
          <Button asChild variant="ghost"><a href="/api/admin/products/export?format=csv"><Download className="h-4 w-4" /> CSV</a></Button>
          <Button asChild variant="ghost"><a href="/api/admin/products/export?format=csv&status=PUBLISHED">Published only (CSV)</a></Button>
        </div>
      </Card>
    </div>
  );
}
