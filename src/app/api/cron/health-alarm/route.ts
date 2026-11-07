import { desc, eq } from "drizzle-orm";
import { db, hasDb, schema } from "@/lib/db";
import { captureError, errorFrom } from "@/lib/errors";
import { decide, INITIAL_STATE, parseState, sameState, statelessEmail, undelivered, type AlarmState, type ProbeResult } from "@/lib/health-alarm";
import { notifyOwner } from "@/lib/notify";
import { SITE } from "@/lib/site";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const JOB = "health-alarm";
const PROBE_TIMEOUT_MS = 15_000;

/**
 * Every 10 minutes (Vercel Cron): probe https://gablemath.com/api/health over the public URL and
 * email the owner only on state changes — DOWN after 2 consecutive failed probes, at most one
 * reminder per 24 h while down, one RECOVERED when it answers 200 again (src/lib/health-alarm.ts).
 * State lives in job_runs (job = "health-alarm"); a row is written only when it changes. Mail goes
 * out through the Cloudflare notify worker's send endpoint (src/lib/notify.ts).
 *
 * (This used to call the worker's /probe, whose fetch used `cf.cacheTtl` and was served stale
 * cached health responses — that, plus open inbox errors turning /api/health red, caused the
 * ALERT/Recovered flapping in Nov 2026.)
 */
async function probe(): Promise<ProbeResult> {
  try {
    const res = await fetch(`${SITE.url}/api/health?alarm=${Date.now()}`, {
      cache: "no-store",
      headers: { "user-agent": "GableMath-health-alarm" },
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
    });
    const body = (await res.text()).slice(0, 1500);
    return { ok: res.status === 200, status: res.status, reason: `HTTP ${res.status}`, body };
  } catch (err) {
    const e = errorFrom(err);
    const reason = e.name === "TimeoutError" ? `timed out after ${PROBE_TIMEOUT_MS / 1000} s` : `no response (${e.message.slice(0, 120)})`;
    return { ok: false, status: 0, reason, body: "" };
  }
}

async function loadState(): Promise<AlarmState> {
  const [row] = await db()
    .select({ detail: schema.jobRuns.detail })
    .from(schema.jobRuns)
    .where(eq(schema.jobRuns.job, JOB))
    .orderBy(desc(schema.jobRuns.id))
    .limit(1);
  return row ? parseState((row.detail as { state?: unknown } | null)?.state) : { ...INITIAL_STATE };
}

export async function GET(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return new Response("Unauthorized", { status: 401 });
  const now = new Date();
  const result = await probe();
  const probeSummary = { ok: result.ok, status: result.status, reason: result.reason };

  let prev: AlarmState | null = null;
  if (hasDb()) {
    try {
      prev = await loadState();
    } catch (err) {
      console.error("[health-alarm] state unavailable", errorFrom(err).message);
    }
  }
  if (!prev) {
    const email = statelessEmail(result, now);
    const sent = email ? await notifyOwner(email.subject, email.text) : false;
    return Response.json({ ok: true, probe: probeSummary, state: "unavailable", email: email?.kind ?? null, sent });
  }

  try {
    const { next, email } = decide(prev, result, now);
    let state = next;
    let sent = false;
    if (email) {
      sent = await notifyOwner(email.subject, email.text);
      if (!sent) state = undelivered(prev, next);
    }
    if (!sameState(prev, state)) {
      await db()
        .insert(schema.jobRuns)
        .values({ job: JOB, ok: state.status === "up", detail: { state, probe: probeSummary, email: email?.kind ?? null, sent } });
    }
    return Response.json({ ok: true, probe: probeSummary, state, email: email?.kind ?? null, sent });
  } catch (err) {
    await captureError({ source: "cron", severity: "warning", route: "/api/cron/health-alarm", ...errorFrom(err) });
    return Response.json({ ok: false, probe: probeSummary }, { status: 500 });
  }
}
