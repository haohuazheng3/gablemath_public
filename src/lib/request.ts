import { createHash } from "node:crypto";
import { lt, sql } from "drizzle-orm";
import { db, hasDb, schema } from "./db";
import { captureError, errorFrom } from "./errors";

export function clientIp(req: Request): string {
  const h = req.headers;
  return (
    h.get("x-real-ip") ??
    h.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ??
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "0.0.0.0"
  );
}

/** Salted, truncated hash so raw IPs are never stored. */
export function ipHash(req: Request): string {
  const salt = process.env.IP_HASH_SALT ?? "gablemath";
  return createHash("sha256").update(`${salt}:${clientIp(req)}`).digest("hex").slice(0, 24);
}

export interface RateResult {
  ok: boolean;
  remaining: number;
  resetSeconds: number;
}

/**
 * Fixed-window rate limit backed by Postgres (no extra service). Fails open if the database is
 * unreachable — but records that failure in the error inbox.
 */
export async function rateLimit(req: Request, bucket: string, limit: number, windowSeconds: number): Promise<RateResult> {
  const now = Math.floor(Date.now() / 1000);
  const windowStart = now - (now % windowSeconds);
  const resetSeconds = windowStart + windowSeconds - now;
  if (!hasDb()) return { ok: true, remaining: limit, resetSeconds };
  const key = `${bucket}:${ipHash(req)}:${windowStart}`;
  try {
    const [row] = await db()
      .insert(schema.rateLimits)
      .values({ key, count: 1, expiresAt: new Date((windowStart + windowSeconds) * 1000) })
      .onConflictDoUpdate({ target: schema.rateLimits.key, set: { count: sql`${schema.rateLimits.count} + 1` } })
      .returning({ count: schema.rateLimits.count });
    // opportunistic cleanup of expired windows (cheap, bounded)
    if (Math.random() < 0.02) {
      await db().delete(schema.rateLimits).where(lt(schema.rateLimits.expiresAt, new Date()));
    }
    const count = row?.count ?? 1;
    return { ok: count <= limit, remaining: Math.max(0, limit - count), resetSeconds };
  } catch (err) {
    await captureError({ source: "server", route: `ratelimit:${bucket}`, ...errorFrom(err) });
    return { ok: true, remaining: limit, resetSeconds };
  }
}

export function tooMany(r: RateResult): Response {
  return Response.json(
    { error: "rate_limited", message: "Too many requests — please wait a moment and try again." },
    { status: 429, headers: { "Retry-After": String(r.resetSeconds), "Cache-Control": "no-store" } },
  );
}

/** Reject cross-site form posts (simple CSRF guard for JSON endpoints). */
export function sameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true; // same-origin fetches from older browsers / sendBeacon may omit it
  try {
    const o = new URL(origin);
    const host = req.headers.get("host");
    return o.host === host || o.hostname === "localhost" || o.hostname.endsWith(".vercel.app");
  } catch {
    return false;
  }
}
