import { NextResponse } from "next/server";
import { getUser } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";

/** Common checks for admin route handlers: signed in, same-origin (CSRF), and a per-user rate limit. */
export async function adminGuard(req: Request, bucket: string, limit = 30, windowMs = 60_000) {
  const user = await getUser();
  if (!user) return { error: NextResponse.json({ error: "Not signed in" }, { status: 401 }) } as const;
  if (req.method !== "GET") {
    const origin = req.headers.get("origin");
    const host = req.headers.get("host");
    if (origin && host && new URL(origin).host !== host) return { error: NextResponse.json({ error: "Bad origin" }, { status: 403 }) } as const;
  }
  const rl = rateLimit(`api:${bucket}:${user.id}`, limit, windowMs);
  if (!rl.ok) return { error: NextResponse.json({ error: `Too many requests. Retry in ${rl.retryAfter}s.` }, { status: 429 }) } as const;
  return { user } as const;
}
