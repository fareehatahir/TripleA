import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { PageHeader } from "@/components/admin/ui";
import { UsersManager } from "./users-manager";

export const metadata = { title: "Users & roles" };

export default async function UsersPage() {
  const me = await requireUser(["SUPER_ADMIN"]);
  const users = await db.user.findMany({ orderBy: { createdAt: "asc" }, select: { id: true, name: true, email: true, role: true, active: true, lastLoginAt: true, totpEnabled: true } });
  return (
    <>
      <PageHeader title="Users & roles" description="Super admins manage everything. Editors manage content but not users or settings." />
      <UsersManager meId={me.id} users={users.map((u) => ({ ...u, lastLoginAt: u.lastLoginAt?.toISOString() ?? null }))} />
    </>
  );
}
