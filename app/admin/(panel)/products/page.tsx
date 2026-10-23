import Link from "next/link";
import { Plus, Search } from "lucide-react";
import type { Prisma, ProductStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, PageHeader, inputCls } from "@/components/admin/ui";
import { ProductsTable } from "./products-table";

export const metadata = { title: "Products" };

const PAGE = 20;
const STATUSES = ["DRAFT", "PUBLISHED", "SOLD", "ARCHIVED"];

export default async function ProductsPage(
  props: { searchParams: Promise<{ q?: string; category?: string; make?: string; status?: string; photo?: string; page?: string }> }
) {
  const searchParams = await props.searchParams;
  const q = searchParams.q?.trim() ?? "";
  const page = Math.max(1, Number(searchParams.page) || 1);
  const where: Prisma.ProductWhereInput = {
    ...(q && { OR: [{ title: { contains: q } }, { sku: { contains: q } }, { engineCode: { contains: q } }] }),
    ...(searchParams.category && { categoryId: searchParams.category }),
    ...(searchParams.make && { makeId: searchParams.make }),
    ...(searchParams.status && STATUSES.includes(searchParams.status) ? { status: searchParams.status as ProductStatus } : { status: { not: "ARCHIVED" as ProductStatus } }),
    ...(searchParams.photo === "missing" && { images: { none: {} } }),
  };

  const [rows, total, categories, makes, noPhoto] = await Promise.all([
    db.product.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE,
      take: PAGE,
      select: {
        id: true, title: true, sku: true, stock: true, status: true, featured: true, updatedAt: true,
        category: { select: { name: true } }, make: { select: { name: true } },
        images: { orderBy: { order: "asc" }, take: 1, select: { thumbUrl: true, url: true } },
      },
    }),
    db.product.count({ where }),
    db.category.findMany({ orderBy: { order: "asc" } }),
    db.make.findMany({ orderBy: { order: "asc" } }),
    db.product.count({ where: { status: { not: "ARCHIVED" }, images: { none: {} } } }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const link = (p: number) => {
    const sp = new URLSearchParams(Object.entries(searchParams).filter(([k, v]) => v && k !== "page") as [string, string][]);
    if (p > 1) sp.set("page", String(p));
    return `/admin/products${sp.size ? `?${sp}` : ""}`;
  };

  return (
    <>
      <PageHeader
        title="Products"
        description={`${total} product${total === 1 ? "" : "s"}${q ? ` matching “${q}”` : ""}`}
        actions={<Button asChild><Link href="/admin/products/new"><Plus className="h-4 w-4" /> New product</Link></Button>}
      />

      {noPhoto > 0 && searchParams.photo !== "missing" && (
        <Link href="/admin/products?photo=missing" className="mb-5 block rounded-xl bg-amber-500/10 px-4 py-3 text-sm font-medium text-amber-900 hover:bg-amber-500/20 dark:text-amber-200">
          {noPhoto} product{noPhoto === 1 ? " has" : "s have"} no photo. Click to review.
        </Link>
      )}

      <Card>
        <form className="grid gap-3 border-b border-silver/40 p-4 sm:grid-cols-2 lg:grid-cols-[1fr_repeat(3,10rem)_auto] dark:border-white/10" role="search">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2" />
            <input name="q" defaultValue={q} placeholder="Search title, SKU or engine code" aria-label="Search products" className={`${inputCls} pl-10`} />
          </div>
          <select name="category" defaultValue={searchParams.category ?? ""} aria-label="Category" className={inputCls}><option value="">All categories</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
          <select name="make" defaultValue={searchParams.make ?? ""} aria-label="Make" className={inputCls}><option value="">All makes</option>{makes.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select>
          <select name="status" defaultValue={searchParams.status ?? ""} aria-label="Status" className={inputCls}><option value="">Not archived</option>{STATUSES.map((s) => <option key={s} value={s}>{s[0] + s.slice(1).toLowerCase()}</option>)}</select>
          <Button variant="secondary">Filter</Button>
        </form>

        <ProductsTable rows={rows.map((r) => ({ id: r.id, title: r.title, sku: r.sku, stock: r.stock, status: r.status, featured: r.featured, category: r.category.name, make: r.make?.name ?? null, thumb: r.images[0]?.thumbUrl ?? r.images[0]?.url ?? null, updatedAt: r.updatedAt.toISOString() }))} filtered={!!(q || searchParams.category || searchParams.make || searchParams.status || searchParams.photo)} />

        {pages > 1 && (
          <nav aria-label="Pagination" className="flex items-center justify-between border-t border-silver/40 p-4 text-sm dark:border-white/10">
            <span>Page {page} of {pages}</span>
            <span className="flex gap-2">
              {page > 1 && <Button asChild size="sm" variant="ghost"><Link href={link(page - 1)}>Previous</Link></Button>}
              {page < pages && <Button asChild size="sm" variant="ghost"><Link href={link(page + 1)}>Next</Link></Button>}
            </span>
          </nav>
        )}
      </Card>
    </>
  );
}
