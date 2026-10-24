import { rateLimit, tooMany } from "@/lib/request";

export const dynamic = "force-dynamic";

/** Dedicated path for verifying rate limiting: 5 requests per minute per visitor. */
export async function GET(req: Request) {
  const rl = await rateLimit(req, "ratelimit-test", 5, 60);
  if (!rl.ok) return tooMany(rl);
  return Response.json({ ok: true, remaining: rl.remaining, resetSeconds: rl.resetSeconds });
}
