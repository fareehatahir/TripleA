// In-memory sliding-window limiter. Fine for a single Node process (VPS / one Vercel region instance).
// For multi-instance deployments swap the Map for Redis/Upstash behind the same signature.
const hits = new Map<string, number[]>();

export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    hits.set(key, recent);
    return { ok: false as const, retryAfter: Math.ceil((windowMs - (now - recent[0])) / 1000) };
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) for (const [k, v] of hits) if (!v.some((t) => now - t < windowMs)) hits.delete(k);
  return { ok: true as const, retryAfter: 0 };
}

export function clientIp(headers: Headers) {
  return headers.get("x-forwarded-for")?.split(",")[0].trim() || headers.get("x-real-ip") || "unknown";
}

// ---- failure-counting variant (used for logins: successful sign-ins never count against the limit) ----
export function isLimited(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  hits.set(key, recent);
  return recent.length >= limit ? { limited: true as const, retryAfter: Math.ceil((windowMs - (now - recent[0])) / 1000) } : { limited: false as const, retryAfter: 0 };
}
export function recordHit(key: string) {
  hits.set(key, [...(hits.get(key) ?? []), Date.now()]);
}
export function resetKey(key: string) {
  hits.delete(key);
}
