import Link from "next/link";
import { Download, Inbox, Search } from "lucide-react";
import type { InquiryStatus, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { ci } from "@/lib/catalog";
import { Button } from "@/components/ui/button";
import { Badge, Card, EmptyState, PageHeader, inputCls } from "@/components/admin/ui";
import { cn } from "@/lib/utils";

export const metadata = { title: "Inquiries" };

const PAGE = 25;
const STATUSES: InquiryStatus[] = ["NEW", "CONTACTED", "QUOTED", "WON", "LOST"];
const statusTone = { NEW: "red", CONTACTED: "amber", QUOTED: "gray", WON: "green", LOST: "dark" } as const;

export default async function InquiriesPage(
  props: { searchParams: Promise<{ status?: string; q?: string; page?: string }> }
) {
  const searchParams = await props.searchParams;
  const status = STATUSES.find((s) => s === searchParams.status);
  const q = searchParams.q?.trim() ?? "";
  const page = Math.max(1, Number(searchParams.page) || 1);
  const where: Prisma.InquiryWhereInput = {
    ...(status && { status }),
    ...(q && { OR: [{ reference: { contains: q, ...ci } }, { name: { contains: q, ...ci } }, { company: { contains: q, ...ci } }, { email: { contains: q, ...ci } }, { country: { contains: q, ...ci } }] }),
  };
  const [rows, total, counts] = await Promise.all([
    db.inquiry.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE, take: PAGE, include: { _count: { select: { items: true } } } }),
    db.inquiry.count({ where }),
    db.inquiry.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);
  const count = (s: InquiryStatus) => counts.find((c) => c.status === s)?._count._all ?? 0;
  const all = counts.reduce((n, c) => n + c._count._all, 0);
  const href = (o: Record<string, string | undefined>) => {
    const sp = new URLSearchParams(Object.entries({ status: searchParams.status, q: q || undefined, ...o }).filter(([, v]) => v) as [string, string][]);
    return `/admin/inquiries${sp.size ? `?${sp}` : ""}`;
  };
  const pages = Math.max(1, Math.ceil(total / PAGE));

  return (
    <>
      <PageHeader title="Inquiries" description="Buyer requests from the website. New ones are also emailed to you." actions={<Button asChild variant="ghost"><a href={`/api/admin/inquiries/export${status ? `?status=${status}` : ""}`}><Download className="h-4 w-4" /> Export CSV</a></Button>} />

      <div className="mb-5 flex flex-wrap gap-2" role="tablist" aria-label="Filter by status">
        {[undefined, ...STATUSES].map((s) => (
          <Link key={s ?? "all"} href={href({ status: s, page: undefined })} role="tab" aria-selected={status === s} className={cn("rounded-full px-4 py-2 text-sm font-semibold transition", status === s ? "bg-charcoal text-white dark:bg-brand" : "bg-white hover:bg-silver/40 dark:bg-white/10 dark:hover:bg-white/20")}>
            {s ? s[0] + s.slice(1).toLowerCase() : "All"} <span className="ml-1 opacity-70">{s ? count(s) : all}</span>
          </Link>
        ))}
      </div>

      <Card>
        <form className="relative border-b border-silver/40 p-4 dark:border-white/10" role="search">
          {status && <input type="hidden" name="status" value={status} />}
          <Search className="pointer-events-none absolute left-7 top-1/2 h-4 w-4 -translate-y-1/2" />
          <input name="q" defaultValue={q} placeholder="Search reference, name, company, email or country" aria-label="Search inquiries" className={`${inputCls} max-w-md pl-10`} />
        </form>
        {rows.length === 0 ? (
          <EmptyState icon={Inbox} title={q || status ? "No inquiries match" : "No inquiries yet"} text={q || status ? "Try another status or search." : "When a buyer sends an inquiry from the website it shows up here and in your email."} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-silver/40 text-xs uppercase tracking-wider dark:border-white/10"><tr><th className="px-5 py-3">Reference</th><th className="px-3 py-3">Buyer</th><th className="px-3 py-3">Country</th><th className="px-3 py-3">Items</th><th className="px-3 py-3">Received</th><th className="px-3 py-3">Status</th></tr></thead>
              <tbody className="divide-y divide-silver/40 dark:divide-white/10">
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-mist/60 dark:hover:bg-white/5">
                    <td className="px-5 py-3"><Link href={`/admin/inquiries/${r.id}`} className="font-semibold text-charcoal hover:text-brand dark:text-white">{r.reference}</Link></td>
                    <td className="px-3 py-3"><p className="font-medium text-charcoal dark:text-white">{r.name}</p><p className="text-xs">{r.company ?? r.email}</p></td>
                    <td className="px-3 py-3">{r.country}</td>
                    <td className="px-3 py-3">{r._count.items}</td>
                    <td className="whitespace-nowrap px-3 py-3">{r.createdAt.toLocaleString("en", { dateStyle: "medium", timeStyle: "short" })}</td>
                    <td className="px-3 py-3"><Badge tone={statusTone[r.status]}>{r.status[0] + r.status.slice(1).toLowerCase()}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {pages > 1 && (
          <nav aria-label="Pagination" className="flex items-center justify-between border-t border-silver/40 p-4 text-sm dark:border-white/10">
            <span>Page {page} of {pages}</span>
            <span className="flex gap-2">
              {page > 1 && <Button asChild size="sm" variant="ghost"><Link href={href({ page: String(page - 1) })}>Previous</Link></Button>}
              {page < pages && <Button asChild size="sm" variant="ghost"><Link href={href({ page: String(page + 1) })}>Next</Link></Button>}
            </span>
          </nav>
        )}
      </Card>
    </>
  );
}
