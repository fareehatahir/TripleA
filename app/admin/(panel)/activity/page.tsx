import { History } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { Badge, Card, EmptyState, PageHeader } from "@/components/admin/ui";

export const metadata = { title: "Activity log" };

const tone = (a: string) => (a === "delete" ? "red" : a === "create" ? "green" : a === "login" ? "gray" : "amber") as "red" | "green" | "gray" | "amber";

export default async function ActivityPage() {
  await requireUser(["SUPER_ADMIN"]);
  const logs = await db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 200 });
  return (
    <>
      <PageHeader title="Activity log" description="Who changed what, newest first (last 200 events)." />
      <Card>
        {logs.length === 0 ? (
          <EmptyState icon={History} title="No activity yet" text="Sign-ins and every create, update and delete are recorded here." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-silver/40 text-xs uppercase tracking-wider dark:border-white/10">
                <tr><th className="px-5 py-3">When</th><th className="px-5 py-3">Who</th><th className="px-5 py-3">Action</th><th className="px-5 py-3">Details</th></tr>
              </thead>
              <tbody className="divide-y divide-silver/40 dark:divide-white/10">
                {logs.map((l) => (
                  <tr key={l.id}>
                    <td className="whitespace-nowrap px-5 py-3">{l.createdAt.toLocaleString("en", { dateStyle: "medium", timeStyle: "short" })}</td>
                    <td className="px-5 py-3">{l.userEmail}</td>
                    <td className="px-5 py-3"><Badge tone={tone(l.action)}>{l.action}</Badge> <span className="ml-1 text-xs">{l.entity}</span></td>
                    <td className="px-5 py-3">{l.summary}</td>
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
