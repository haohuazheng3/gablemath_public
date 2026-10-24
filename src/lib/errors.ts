import { createHash } from "node:crypto";
import { sql } from "drizzle-orm";
import { db, hasDb, schema } from "./db";

export type ErrorSource = "server" | "client" | "edge" | "cron";

export interface CapturedError {
  source: ErrorSource;
  name: string;
  message: string;
  stack?: string;
  route?: string;
  url?: string;
  userAgent?: string;
  severity?: "error" | "warning";
  extra?: Record<string, unknown>;
}

/** First meaningful stack frame, with line/column noise and hashes stripped so builds group together. */
export function firstFrame(stack?: string): string | undefined {
  if (!stack) return undefined;
  const line = stack
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l.startsWith("at ") || /@/.test(l));
  if (!line) return undefined;
  return line
    .replace(/\?[^\s)]*/g, "")
    .replace(/:\d+:\d+/g, "")
    .replace(/[a-f0-9]{8,}/gi, "#")
    .slice(0, 300);
}

export function fingerprintOf(e: Pick<CapturedError, "name" | "message" | "stack" | "route" | "source">): string {
  const frame = firstFrame(e.stack) ?? e.message.replace(/\d+/g, "#").slice(0, 120);
  return createHash("sha1").update(`${e.source}|${e.name}|${frame}|${e.route ?? ""}`).digest("hex");
}

/**
 * Record an error in the inbox (grouped by fingerprint). Never throws: if the inbox itself is
 * down, the failure is logged loudly to the platform logs instead.
 */
export async function captureError(e: CapturedError): Promise<void> {
  const row = {
    fingerprint: fingerprintOf(e),
    source: e.source,
    severity: e.severity ?? "error",
    name: (e.name || "Error").slice(0, 120),
    message: (e.message || "(no message)").slice(0, 2000),
    firstFrame: firstFrame(e.stack) ?? null,
    route: e.route?.slice(0, 300) ?? null,
    lastStack: e.stack?.slice(0, 8000) ?? null,
    lastUrl: e.url?.slice(0, 600) ?? null,
    lastUserAgent: e.userAgent?.slice(0, 400) ?? null,
    extra: e.extra ?? null,
  };
  console.error(`[captured:${e.source}] ${row.name}: ${row.message}`, e.route ?? "", e.stack ?? "");
  if (!hasDb()) return;
  try {
    await db()
      .insert(schema.errors)
      .values(row)
      .onConflictDoUpdate({
        target: schema.errors.fingerprint,
        set: {
          count: sql`${schema.errors.count} + 1`,
          lastSeen: sql`now()`,
          resolvedAt: null,
          message: row.message,
          lastStack: row.lastStack,
          lastUrl: row.lastUrl,
          lastUserAgent: row.lastUserAgent,
          extra: row.extra,
        },
      });
  } catch (inboxErr) {
    console.error("[error-inbox] FAILED to record error — inbox unavailable", inboxErr);
  }
}

export function errorFrom(err: unknown): { name: string; message: string; stack?: string } {
  if (err instanceof Error) return { name: err.name, message: err.message, stack: err.stack };
  return { name: "NonError", message: typeof err === "string" ? err : JSON.stringify(err)?.slice(0, 500) ?? String(err) };
}
