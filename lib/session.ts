import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export type Role = "SUPER_ADMIN" | "EDITOR";

/** Current admin, re-read from the DB so deactivated users / role changes apply immediately. */
export async function getUser() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, name: true, role: true, active: true },
  });
  return user?.active ? user : null;
}

export async function requireUser(roles?: Role[]) {
  const user = await getUser();
  if (!user) redirect("/admin/login");
  if (roles && !roles.includes(user.role)) redirect("/admin?denied=1");
  return user;
}

/** For server actions: throws instead of redirecting. */
export async function assertRole(roles: Role[] = ["SUPER_ADMIN", "EDITOR"]) {
  const user = await getUser();
  if (!user || !roles.includes(user.role)) throw new Error("Not authorised");
  return user;
}
