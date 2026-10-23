import { PageHeader } from "@/components/admin/ui";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { AccountForms } from "./account-forms";

export const metadata = { title: "My account" };

export default async function AccountPage() {
  const me = await requireUser();
  const u = await db.user.findUniqueOrThrow({ where: { id: me.id }, select: { name: true, email: true, role: true, totpEnabled: true, totpBackupCodes: true, lastLoginAt: true } });
  return (
    <>
      <PageHeader title="My account" description={`${u.name} · ${u.email} · ${u.role === "SUPER_ADMIN" ? "Super admin" : "Editor"}`} />
      <AccountForms totpEnabled={u.totpEnabled} backupLeft={JSON.parse(u.totpBackupCodes ?? "[]").length} />
    </>
  );
}
