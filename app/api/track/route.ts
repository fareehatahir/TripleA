import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { clientIp, rateLimit } from "@/lib/rate-limit";

const BOT = /bot|crawl|spider|slurp|headless|lighthouse|pagespeed|preview|monitor|curl|wget/i;

/**
 * Cookie-free page-view counter: one row per path per day. No IP, user agent or visitor ID is stored.
 * Respects Do-Not-Track / Global Privacy Control, skips obvious bots, and is rate limited.
 */
export async function POST(req: Request) {
  if (req.headers.get("dnt") === "1" || req.headers.get("sec-gpc") === "1") return new NextResponse(null, { status: 204 });
  if (BOT.test(req.headers.get("user-agent") ?? "")) return new NextResponse(null, { status: 204 });
  if (!rateLimit(`track:${clientIp(req.headers)}`, 120, 60_000).ok) return new NextResponse(null, { status: 429 });

  const body = await req.json().catch(() => null);
  const raw = typeof body?.path === "string" ? body.path : "";
  const path = raw.split(/[?#]/)[0].replace(/\/+$/, "") || "/";
  if (!path.startsWith("/") || path.length > 200 || /^\/(admin|api|uploads|_next)/.test(path) || /[\s<>"]/.test(path)) return new NextResponse(null, { status: 204 });

  const day = new Date().toISOString().slice(0, 10);
  await db.pageView.upsert({ where: { day_path: { day, path } }, update: { count: { increment: 1 } }, create: { day, path, count: 1 } });
  return new NextResponse(null, { status: 204 });
}
