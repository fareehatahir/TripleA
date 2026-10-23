import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { authConfig } from "./auth.config";
import { db } from "@/lib/db";
import { checkCredentials } from "@/lib/auth-check";
import { clientIp } from "@/lib/rate-limit";

const schema = z.object({ email: z.string().email().toLowerCase(), password: z.string().min(1).max(200), code: z.string().max(40).optional() });

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: { email: {}, password: {}, code: {} },
      async authorize(raw, request) {
        const parsed = schema.safeParse(raw);
        if (!parsed.success) return null;
        const res = await checkCredentials({ ...parsed.data, ip: clientIp(request.headers) });
        if (!res.ok) return null;
        await db.user.update({ where: { id: res.user.id }, data: { lastLoginAt: new Date() } });
        await db.auditLog.create({ data: { userId: res.user.id, userEmail: res.user.email, action: "login", entity: "User", entityId: res.user.id, summary: "Signed in" } });
        return res.user;
      },
    }),
  ],
});
