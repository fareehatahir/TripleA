"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Copy, ImageOff, Package, Pencil, Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge, EmptyState } from "@/components/admin/ui";
import { ConfirmDialog } from "@/components/admin/forms";
import { bulkProductsAction, duplicateProductAction } from "./actions";

type Row = { id: string; title: string; sku: string; stock: number; status: string; featured: boolean; category: string; make: string | null; thumb: string | null; updatedAt: string };
const tone = { PUBLISHED: "green", DRAFT: "gray", SOLD: "dark", ARCHIVED: "amber" } as const;

export function ProductsTable({ rows, filtered }: { rows: Row[]; filtered: boolean }) {
  const router = useRouter();
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [confirm, setConfirm] = useState<string[] | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const all = rows.length > 0 && rows.every((r) => sel.has(r.id));
  const toggle = (id: string) => setSel((s) => (s.has(id) ? (s.delete(id), new Set(s)) : new Set(s).add(id)));

  const bulk = (action: "publish" | "unpublish" | "archive" | "delete", ids = [...sel]) =>
    start(async () => {
      const r = await bulkProductsAction(ids, action);
      setMsg(r.ok ? `${r.count} product${r.count === 1 ? "" : "s"} updated.` : r.error);
      if (r.ok) {
        setSel(new Set());
        setConfirm(null);
        router.refresh();
      }
    });

  if (!rows.length)
    return (
      <EmptyState
        icon={Package}
        title={filtered ? "No products match your filters" : "No products yet"}
        text={filtered ? "Try a different search or clear the filters." : "Add your first product, then publish it to show it on the website."}
        action={<Button asChild><Link href={filtered ? "/admin/products" : "/admin/products/new"}>{filtered ? "Clear filters" : "Add a product"}</Link></Button>}
      />
    );

  return (
    <>
      {msg && <p role="status" className="border-b border-silver/40 bg-mist/60 px-5 py-2.5 text-sm dark:border-white/10 dark:bg-white/5">{msg}</p>}
      {sel.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-b border-silver/40 bg-charcoal px-5 py-3 text-sm text-white">
          <strong>{sel.size} selected</strong>
          <span className="ml-auto flex flex-wrap gap-2">
            <Button size="sm" disabled={pending} onClick={() => bulk("publish")}>Publish</Button>
            <Button size="sm" variant="ghost" className="bg-white/10 text-white ring-0 hover:bg-white/20" disabled={pending} onClick={() => bulk("unpublish")}>Unpublish</Button>
            <Button size="sm" variant="ghost" className="bg-white/10 text-white ring-0 hover:bg-white/20" disabled={pending} onClick={() => bulk("archive")}>Archive</Button>
            <Button size="sm" variant="ghost" className="bg-white/10 text-white ring-0 hover:bg-brand" disabled={pending} onClick={() => setConfirm([...sel])}>Delete</Button>
          </span>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-silver/40 text-xs uppercase tracking-wider dark:border-white/10">
            <tr>
              <th className="w-12 px-5 py-3"><input type="checkbox" aria-label="Select all" checked={all} onChange={() => setSel(all ? new Set() : new Set(rows.map((r) => r.id)))} className="h-4 w-4 accent-brand" /></th>
              <th className="px-3 py-3">Product</th><th className="px-3 py-3">Category</th><th className="px-3 py-3">Stock</th><th className="px-3 py-3">Status</th><th className="px-3 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-silver/40 dark:divide-white/10">
            {rows.map((r) => (
              <tr key={r.id} className={sel.has(r.id) ? "bg-brand/5" : undefined}>
                <td className="px-5 py-3"><input type="checkbox" aria-label={`Select ${r.title}`} checked={sel.has(r.id)} onChange={() => toggle(r.id)} className="h-4 w-4 accent-brand" /></td>
                <td className="px-3 py-3">
                  <Link href={`/admin/products/${r.id}`} className="flex items-center gap-3">
                    {r.thumb ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={r.thumb} alt="" className="h-12 w-16 shrink-0 rounded-lg object-cover" />
                    ) : (
                      <span className="grid h-12 w-16 shrink-0 place-items-center rounded-lg bg-amber-500/15 text-amber-900 dark:text-amber-300" title="No photo"><ImageOff className="h-5 w-5" /></span>
                    )}
                    <span className="min-w-0">
                      <span className="flex items-center gap-1.5 font-semibold text-charcoal hover:text-brand dark:text-white">
                        <span className="truncate">{r.title}</span>{r.featured && <Star className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-400" aria-label="Featured" />}
                      </span>
                      <span className="text-xs">{r.sku}{r.make ? ` · ${r.make}` : ""}</span>
                    </span>
                  </Link>
                </td>
                <td className="px-3 py-3">{r.category}</td>
                <td className="px-3 py-3"><span className={r.stock === 0 ? "font-semibold text-brand" : undefined}>{r.stock}</span></td>
                <td className="px-3 py-3"><Badge tone={tone[r.status as keyof typeof tone]}>{r.status[0] + r.status.slice(1).toLowerCase()}</Badge></td>
                <td className="px-3 py-3">
                  <div className="flex justify-end gap-1">
                    <Link href={`/admin/products/${r.id}`} aria-label={`Edit ${r.title}`} title="Edit" className="grid h-9 w-9 place-items-center rounded-lg hover:bg-mist dark:hover:bg-white/10"><Pencil className="h-4 w-4" /></Link>
                    <button aria-label={`Duplicate ${r.title}`} title="Duplicate" disabled={pending} onClick={() => start(async () => { const x = await duplicateProductAction(r.id); if (x.ok) router.push(`/admin/products/${x.id}`); else setMsg(x.error); })} className="grid h-9 w-9 place-items-center rounded-lg hover:bg-mist dark:hover:bg-white/10"><Copy className="h-4 w-4" /></button>
                    <button aria-label={`Delete ${r.title}`} title="Delete" onClick={() => setConfirm([r.id])} className="grid h-9 w-9 place-items-center rounded-lg text-brand hover:bg-brand/10"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ConfirmDialog
        open={!!confirm}
        title={`Delete ${confirm?.length === 1 ? "this product" : `${confirm?.length} products`}?`}
        text="This cannot be undone. Photos stay in the media library. Past inquiries keep the product name and SKU. Consider Archive instead to hide without deleting."
        busy={pending}
        onClose={() => setConfirm(null)}
        onConfirm={() => confirm && bulk("delete", confirm)}
      />
    </>
  );
}
