import { z } from "zod";
import { db, hasDb, schema } from "@/lib/db";
import { captureError, errorFrom } from "@/lib/errors";
import { ipHash, rateLimit, sameOrigin, tooMany } from "@/lib/request";

export const dynamic = "force-dynamic";

const Body = z.object({
  calcKey: z.string().min(1).max(120),
  page: z.string().min(1).max(400),
  helpful: z.boolean(),
  comment: z.string().trim().max(1000).optional(),
});

/** "Did this answer your question?" votes + optional comment from calculator pages. */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return Response.json({ error: "forbidden" }, { status: 403 });
  const rl = await rateLimit(req, "feedback", 12, 600);
  if (!rl.ok) return tooMany(rl);
  let parsed;
  try {
    parsed = Body.safeParse(await req.json());
  } catch {
    return Response.json({ error: "bad_json" }, { status: 400 });
  }
  if (!parsed.success) return Response.json({ error: "invalid" }, { status: 400 });
  if (!hasDb()) return Response.json({ ok: true, stored: false });
  try {
    await db().insert(schema.feedback).values({ ...parsed.data, comment: parsed.data.comment || null, ipHash: ipHash(req) });
    return Response.json({ ok: true });
  } catch (err) {
    await captureError({ source: "server", route: "/api/feedback", ...errorFrom(err) });
    return Response.json({ error: "server" }, { status: 500 });
  }
}
