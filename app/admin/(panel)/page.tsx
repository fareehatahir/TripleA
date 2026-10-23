import Link from "next/link";
import { AlertTriangle, Eye, Inbox, Mail, Package, PackageCheck } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { Badge, Card, EmptyState, PageHeader } from "@/components/admin/ui";

export const metadata = { title: "Dashboard" };

const DAY = 86400000;

export default async function Dashboard(props: { searchParams: Promise<{ denied?: string }> }) {
  const searchParams = await props.searchParams;
  const user = await requireUser();
  const since = new Date(Date.now() - 29 * DAY);
  since.setHours(0, 0, 0, 0);

  const sinceDay = since.toISOString().slice(0, 10);
  const [products, inStock, newInquiries, unread, recent, lowStock, last30, views] = await Promise.all([
    db.product.count({ where: { status: { not: "ARCHIVED" } } }),
    db.product.count({ where: { status: "PUBLISHED", stock: { gt: 0 } } }),
    db.inquiry.count({ where: { status: "NEW" } }),
    db.contactMessage.count({ where: { isRead: false } }),
    db.inquiry.findMany({ orderBy: { createdAt: "desc" }, take: 5, include: { _count: { select: { items: true } } } }),
    db.product.findMany({ where: { status: "PUBLISHED", stock: { lte: 2 } }, orderBy: { stock: "asc" }, take: 5, select: { id: true, title: true, sku: true, stock: true } }),
    db.inquiry.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
    db.pageView.findMany({ where: { day: { gte: sinceDay } }, select: { day: true, path: true, count: true } }),
  ]);
  const viewTotal = views.reduce((n, v) => n + v.count, 0);
  const byPath = new Map<string, number>();
  for (const v of views) byPath.set(v.path, (byPath.get(v.path) ?? 0) + v.count);
  const topPages = [...byPath.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);

  // inquiries per day, last 30 days
  const days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(since.getTime() + i * DAY);
    return { key: d.toDateString(), label: d.toLocaleDateString("en", { month: "short", day: "numeric" }), n: 0 };
  });
  for (const q of last30) {
    const d = days.find((x) => x.key === q.createdAt.toDateString());
    if (d) d.n++;
  }
  const max = Math.max(1, ...days.map((d) => d.n));
  const total = days.reduce((s, d) => s + d.n, 0);

  const cards = [
    { label: "Total products", value: products, icon: Package },
    { label: "In stock", value: inStock, icon: PackageCheck },
    { label: "New inquiries", value: newInquiries, icon: Inbox, accent: newInquiries > 0 },
    { label: "Unread messages", value: unread, icon: Mail, accent: unread > 0 },
    { label: "Page views (30 days)", value: viewTotal.toLocaleString(), icon: Eye, note: viewTotal ? undefined : "Counting starts when visitors arrive" },
  ];

  return (
    <>
      <PageHeader title={`Hello, ${user.name.split(" ")[0]}`} description="Here is what is happening with your catalog and inquiries." />
      {searchParams.denied && <p role="alert" className="mb-6 rounded-xl bg-brand/10 px-4 py-3 text-sm font-medium text-brand">You do not have permission to open that page.</p>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map((c) => (
          <Card key={c.label} className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm">{c.label}</p>
              <c.icon className={c.accent ? "h-5 w-5 text-brand" : "h-5 w-5"} />
            </div>
            <p className="mt-3 font-display text-3xl font-extrabold text-charcoal dark:text-white">{c.value}</p>
            {c.note && <p className="mt-1 text-xs">{c.note}</p>}
          </Card>
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card className="p-6 xl:col-span-2">
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg font-bold">Inquiries, last 30 days</h2>
            <p className="text-sm">{total} total</p>
          </div>
          <div className="mt-6 flex h-44 items-end gap-1" role="img" aria-label={`Bar chart of inquiries per day, ${total} in the last 30 days`}>
            {days.map((d) => (
              <div key={d.key} className="group relative flex h-full flex-1 items-end">
                <div
                  className={d.n ? "w-full rounded-t bg-brand" : "w-full rounded-t bg-silver/50 dark:bg-white/10"}
                  style={{ height: d.n ? `${(d.n / max) * 100}%` : "3px" }}
                />
                <span className="pointer-events-none absolute -top-8 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-charcoal px-2 py-1 text-xs text-white group-hover:block dark:bg-white dark:text-charcoal">
                  {d.label}: {d.n}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-2 flex justify-between text-xs"><span>{days[0].label}</span><span>{days[29].label}</span></div>
        </Card>

        <Card className="p-6">
          <h2 className="flex items-center gap-2 text-lg font-bold"><AlertTriangle className="h-5 w-5 text-amber-500" /> Low stock</h2>
          {lowStock.length === 0 ? (
            <p className="mt-6 text-sm">Nothing running low. Products with 2 or fewer units show up here.</p>
          ) : (
            <ul className="mt-4 divide-y divide-silver/40 dark:divide-white/10">
              {lowStock.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-charcoal dark:text-white">{p.title}</p>
                    <p className="text-xs">{p.sku}</p>
                  </div>
                  <Badge tone={p.stock === 0 ? "red" : "amber"}>{p.stock} left</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card className="mt-6 p-6">
        <h2 className="text-lg font-bold">Top pages, last 30 days</h2>
        {topPages.length === 0 ? <p className="mt-3 text-sm">No visits recorded yet. Counting is anonymous (no cookies or personal data) and skips visitors who send Do Not Track.</p> : (
          <ul className="mt-4 space-y-3">
            {topPages.map(([path, n]) => (
              <li key={path} className="flex items-center gap-3 text-sm">
                <span className="w-48 shrink-0 truncate font-medium text-charcoal dark:text-white sm:w-72">{path}</span>
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-mist dark:bg-white/10"><span className="block h-full rounded-full bg-brand" style={{ width: `${(n / topPages[0][1]) * 100}%` }} /></span>
                <span className="w-12 text-right tabular-nums">{n}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="mt-6">
        <div className="flex items-center justify-between p-6 pb-2">
          <h2 className="text-lg font-bold">Recent inquiries</h2>
          <Link href="/admin/inquiries" className="text-sm font-semibold text-brand hover:underline">View all</Link>
        </div>
        {recent.length === 0 ? (
          <EmptyState icon={Inbox} title="No inquiries yet" text="When buyers send an inquiry from the website, it appears here and is emailed to you." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wider"><tr><th className="px-6 py-3">Ref</th><th className="px-6 py-3">Buyer</th><th className="px-6 py-3">Country</th><th className="px-6 py-3">Items</th><th className="px-6 py-3">Status</th></tr></thead>
              <tbody className="divide-y divide-silver/40 dark:divide-white/10">
                {recent.map((q) => (
                  <tr key={q.id}>
                    <td className="px-6 py-3 font-semibold text-charcoal dark:text-white">{q.reference}</td>
                    <td className="px-6 py-3">{q.name}</td>
                    <td className="px-6 py-3">{q.country}</td>
                    <td className="px-6 py-3">{q._count.items}</td>
                    <td className="px-6 py-3"><Badge tone={q.status === "NEW" ? "red" : "gray"}>{q.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
