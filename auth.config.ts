import type { NextAuthConfig } from "next-auth";

// Edge-safe half of the config (no Prisma / bcrypt) so middleware can use it.
const publicAdminPaths = ["/admin/login", "/admin/forgot", "/admin/reset"];

export const authConfig = {
  pages: { signIn: "/admin/login" },
  session: { strategy: "jwt", maxAge: 60 * 60 * 8 },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      if (!pathname.startsWith("/admin")) return true;
      if (publicAdminPaths.some((p) => pathname === p || pathname.startsWith(p + "/"))) return true;
      return !!auth?.user;
    },
    jwt({ token, user }) {
      if (user) {
        token.uid = user.id;
        token.role = (user as { role: "SUPER_ADMIN" | "EDITOR" }).role;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.uid as string;
      session.user.role = token.role as "SUPER_ADMIN" | "EDITOR";
      return session;
    },
  },
} satisfies NextAuthConfig;
