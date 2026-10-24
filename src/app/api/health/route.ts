import { and, eq, gte, isNull, sql } from "drizzle-orm";
import { db, hasDb, schema } from "@/lib/db";
import { captureError, errorFrom } from "@/lib/errors";
import { GIT_SHA, INDEXABLE } from "@/lib/site";

export const dynamic = "force-dynamic";

const REQUIRED_ENV = ["DATABASE_URL", "NOTIFY_URL", "NOTIFY_SECRET", "ADMIN_PASSWORD", "IP_HASH_SALT", "CRON_SECRET"] as const;
const OPTIONAL_ENV = ["GITHUB_WEBHOOK_SECRET", "VERCEL_DEPLOY_HOOK_URL", "GOOGLE_SERVICE_ACCOUNT_B64", "INDEXNOW_KEY", "NEXT_PUBLIC_ADSENSE_CLIENT"] as const;

/**
 * Self-diagnosis. 200 only when the database answers, required configuration is present and the
 * error inbox has no unresolved errors (resolve them in /admin to turn this green again). Names of env vars only — never values.
 */
export async function GET() {
  const started = Date.now();
  const env = Object.fromEntries(REQUIRED_ENV.map((k) => [k, !!process.env[k]]));
  const optional = Object.fromEntries(OPTIONAL_ENV.map((k) => [k, !!process.env[k]]));
  const missing = REQUIRED_ENV.filter((k) => !process.env[k]);

  let database: { ok: boolean; latencyMs?: number; error?: string } = { ok: false };
  let unresolved = -1;
  let unresolvedTotal = -1;
  if (hasDb()) {
    try {
      const t = Date.now();
      await db().execute(sql`select 1`);
      database = { ok: true, latencyMs: Date.now() - t };
      const since = new Date(Date.now() - 24 * 3600 * 1000);
      const [recent] = await db()
        .select({ n: sql<number>`count(*)::int` })
        .from(schema.errors)
        .where(and(isNull(schema.errors.resolvedAt), eq(schema.errors.severity, "error"), gte(schema.errors.lastSeen, since)));
      const [all] = await db()
        .select({ n: sql<number>`count(*)::int` })
        .from(schema.errors)
        .where(and(isNull(schema.errors.resolvedAt), eq(schema.errors.severity, "error")));
      unresolved = recent?.n ?? 0;
      unresolvedTotal = all?.n ?? 0;
    } catch (err) {
      database = { ok: false, error: errorFrom(err).message.slice(0, 160) };
      await captureError({ source: "server", route: "/api/health", ...errorFrom(err) });
    }
  }

  const healthy = database.ok && missing.length === 0 && unresolvedTotal === 0;
  return Response.json(
    {
      status: healthy ? "ok" : "degraded",
      commit: GIT_SHA,
      indexable: INDEXABLE,
      database,
      env,
      missingEnv: missing,
      optionalEnv: optional,
      payments: "not used (site has no paid features; no Stripe keys configured)",
      errorInbox: { unresolvedLast24h: unresolved, unresolvedTotal },
      tookMs: Date.now() - started,
    },
    { status: healthy ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
