import { captureError, errorFrom } from "@/lib/errors";

export const dynamic = "force-dynamic";

/**
 * Every 10 minutes (Vercel Cron) ask the Cloudflare notify worker to probe
 * https://gablemath.com/api/health from outside our hosting and email the owner on failure /
 * recovery (the worker keeps alert state in KV, so repeats are throttled to every 3 hours).
 */
export async function GET(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return new Response("Unauthorized", { status: 401 });
  const base = process.env.NOTIFY_URL?.replace(/\/$/, "");
  if (!base || !process.env.NOTIFY_SECRET) return Response.json({ ok: false, error: "notify not configured" }, { status: 503 });
  try {
    const res = await fetch(`${base}/probe`, { method: "POST", headers: { authorization: `Bearer ${process.env.NOTIFY_SECRET}` }, signal: AbortSignal.timeout(20000) });
    const data = await res.json();
    return Response.json({ ok: res.ok, probe: data });
  } catch (err) {
    await captureError({ source: "cron", route: "/api/cron/health-alarm", ...errorFrom(err) });
    return Response.json({ ok: false }, { status: 500 });
  }
}
