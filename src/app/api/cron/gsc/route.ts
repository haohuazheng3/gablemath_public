import { sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { captureError, errorFrom } from "@/lib/errors";
import { googleAccessToken, GSC_PROPERTY } from "@/lib/google";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Daily Search Console pull (Vercel Cron, authenticated with CRON_SECRET). Stores page × query
 * rows for the most recent complete day (GSC lags ~2–3 days) so the SEO workflow can read them.
 */
export async function GET(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return new Response("Unauthorized", { status: 401 });
  const day = new Date(Date.now() - 3 * 86400_000).toISOString().slice(0, 10);
  try {
    const token = await googleAccessToken(["https://www.googleapis.com/auth/webmasters.readonly"]);
    const rows: { keys: string[]; clicks: number; impressions: number; ctr: number; position: number }[] = [];
    for (let startRow = 0; startRow < 25000; startRow += 5000) {
      const res = await fetch(`https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(GSC_PROPERTY)}/searchAnalytics/query`, {
        method: "POST",
        headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
        body: JSON.stringify({ startDate: day, endDate: day, dimensions: ["page", "query"], rowLimit: 5000, startRow, dataState: "final" }),
      });
      if (!res.ok) throw new Error(`GSC ${res.status}: ${(await res.text()).slice(0, 300)}`);
      const data = (await res.json()) as { rows?: typeof rows };
      rows.push(...(data.rows ?? []));
      if ((data.rows ?? []).length < 5000) break;
    }
    for (let i = 0; i < rows.length; i += 500) {
      const chunk = rows.slice(i, i + 500).map((r) => ({ day, page: r.keys[0], query: r.keys[1], clicks: r.clicks, impressions: r.impressions, ctr: r.ctr, position: r.position }));
      await db()
        .insert(schema.gscDaily)
        .values(chunk)
        .onConflictDoUpdate({
          target: [schema.gscDaily.day, schema.gscDaily.page, schema.gscDaily.query],
          set: { clicks: sql`excluded.clicks`, impressions: sql`excluded.impressions`, ctr: sql`excluded.ctr`, position: sql`excluded.position` },
        });
    }
    await db().insert(schema.jobRuns).values({ job: "gsc-daily", ok: true, detail: { day, rows: rows.length } });
    return Response.json({ ok: true, day, rows: rows.length });
  } catch (err) {
    await captureError({ source: "cron", route: "/api/cron/gsc", ...errorFrom(err) });
    try {
      await db().insert(schema.jobRuns).values({ job: "gsc-daily", ok: false, detail: { day, error: errorFrom(err).message.slice(0, 300) } });
    } catch (logErr) {
      console.error("[gsc] could not log job run", logErr);
    }
    return Response.json({ ok: false, day }, { status: 500 });
  }
}
