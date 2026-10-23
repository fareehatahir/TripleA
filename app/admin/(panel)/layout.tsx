import { requireUser } from "@/lib/session";
import { AdminShell } from "@/components/admin/shell";
import { logoutAction } from "../(auth)/actions";

export const dynamic = "force-dynamic";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <AdminShell user={{ name: user.name, email: user.email, role: user.role }} logout={logoutAction}>
      {children}
    </AdminShell>
  );
}
