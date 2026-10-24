import { z } from "zod";
import { captureError } from "@/lib/errors";
import { rateLimit, sameOrigin, tooMany } from "@/lib/request";

export const dynamic = "force-dynamic";

const Body = z.object({
  name: z.string().max(200).default("Error"),
  message: z.string().max(4000),
  stack: z.string().max(10000).optional(),
  url: z.string().max(1000).optional(),
  route: z.string().max(300).optional(),
  kind: z.enum(["error", "unhandledrejection", "boundary", "manual"]).default("error"),
});

/** Browser error intake (window.onerror, unhandled rejections, React error boundaries). */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return Response.json({ error: "forbidden" }, { status: 403 });
  const rl = await rateLimit(req, "errors", 30, 60);
  if (!rl.ok) return tooMany(rl);
  let parsed;
  try {
    parsed = Body.safeParse(JSON.parse(await req.text()));
  } catch {
    return Response.json({ error: "bad_json" }, { status: 400 });
  }
  if (!parsed.success) return Response.json({ error: "invalid" }, { status: 400 });
  const b = parsed.data;
  let route = b.route;
  if (!route && b.url) {
    try {
      route = new URL(b.url).pathname;
    } catch {
      route = undefined;
    }
  }
  await captureError({
    source: "client",
    name: b.name,
    message: b.message,
    stack: b.stack,
    url: b.url,
    route,
    userAgent: req.headers.get("user-agent") ?? undefined,
    extra: { kind: b.kind },
  });
  return Response.json({ ok: true });
}
