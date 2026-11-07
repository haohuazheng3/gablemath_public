import { and, desc, eq, gte, isNull, sql } from "drizzle-orm";
import { db, hasDb, schema } from "./db";
import { captureError, errorFrom } from "./errors";
import { notifyOwner } from "./notify";

/**
 * Daily error-inbox digest: at most one email per UTC day while unresolved error-severity items
 * exist, none when the inbox is clear. Read-only — it never resolves or changes error rows.
 * Runs from the daily /api/cron/gsc cron; job_runs rows (job = "error-digest") de-duplicate it.
 */
export const DIGEST_JOB = "error-digest";
export const DIGEST_TOP = 10;

export interface OpenError {
  source: string;
  name: string;
  message: string;
  route: string | null;
  count: number;
  firstSeen: Date;
  lastSeen: Date;
}

const day = (d: Date) => d.toISOString().slice(0, 10);
const oneLine = (s: string, max: number) => {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
};

export function buildErrorDigest(top: OpenError[], openErrors: number, openWarnings: number, now: Date): { subject: string; text: string } | null {
  if (openErrors <= 0) return null;
  const lines = top.map(
    (e) =>
      `• [${e.source}] ${oneLine(`${e.name}: ${e.message}`, 160)}\n  ${e.route ?? "(no route)"} · ×${e.count} · first ${day(e.firstSeen)} · last ${e.lastSeen.toISOString().slice(0, 16).replace("T", " ")} UTC`,
  );
  const more = openErrors > top.length ? `\n…and ${openErrors - top.length} more.` : "";
  return {
    subject: `Daily error digest: ${openErrors} open error${openErrors === 1 ? "" : "s"} (${day(now)})`,
    text: [
      `${openErrors} unresolved error group${openErrors === 1 ? "" : "s"} in the GableMath error inbox${openWarnings > 0 ? ` (plus ${openWarnings} open warning${openWarnings === 1 ? "" : "s"})` : ""}, most recent first:`,
      "",
      lines.join("\n") + more,
      "",
      "Review or resolve them at https://gablemath.com/admin",
      "",
      "These don't affect /api/health or the uptime alarm. You get at most one digest per UTC day, and none when the inbox is clear.",
    ].join("\n"),
  };
}

export async function sendDailyErrorDigest(now = new Date()): Promise<{ sent: boolean; openErrors?: number; reason?: string }> {
  if (!hasDb()) return { sent: false, reason: "no database" };
  try {
    const startOfDay = new Date(`${day(now)}T00:00:00.000Z`);
    const [already] = await db()
      .select({ id: schema.jobRuns.id })
      .from(schema.jobRuns)
      .where(and(eq(schema.jobRuns.job, DIGEST_JOB), eq(schema.jobRuns.ok, true), gte(schema.jobRuns.startedAt, startOfDay)))
      .limit(1);
    if (already) return { sent: false, reason: "already sent today" };

    const open = isNull(schema.errors.resolvedAt);
    const [counts] = await db()
      .select({
        errors: sql<number>`count(*) filter (where ${schema.errors.severity} = 'error')::int`,
        warnings: sql<number>`count(*) filter (where ${schema.errors.severity} <> 'error')::int`,
      })
      .from(schema.errors)
      .where(open);
    const openErrors = counts?.errors ?? 0;
    if (openErrors === 0) return { sent: false, openErrors, reason: "inbox clear" };

    const top = await db()
      .select({
        source: schema.errors.source,
        name: schema.errors.name,
        message: schema.errors.message,
        route: schema.errors.route,
        count: schema.errors.count,
        firstSeen: schema.errors.firstSeen,
        lastSeen: schema.errors.lastSeen,
      })
      .from(schema.errors)
      .where(and(open, eq(schema.errors.severity, "error")))
      .orderBy(desc(schema.errors.lastSeen))
      .limit(DIGEST_TOP);

    const email = buildErrorDigest(top, openErrors, counts?.warnings ?? 0, now);
    if (!email) return { sent: false, openErrors };
    const sent = await notifyOwner(email.subject, email.text);
    await db().insert(schema.jobRuns).values({ job: DIGEST_JOB, ok: sent, detail: { day: day(now), openErrors } });
    return { sent, openErrors };
  } catch (err) {
    await captureError({ source: "cron", severity: "warning", route: "error-digest", ...errorFrom(err) });
    return { sent: false, reason: "digest failed" };
  }
}
