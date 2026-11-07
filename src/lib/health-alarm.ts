/**
 * Uptime alarm for https://gablemath.com/api/health — pure decision logic, persisted by
 * /api/cron/health-alarm (job_runs rows, job = "health-alarm").
 *
 *  - DOWN email only after FAIL_THRESHOLD consecutive failed probes (a single blip never emails)
 *  - while it stays down: silent, except one reminder per REMINDER_MS (24 h)
 *  - one RECOVERED email when /api/health answers 200 again
 *
 * A probe fails when /api/health is unreachable, times out or answers anything but 200. Open
 * error-inbox items do NOT make it fail (they are informational in /api/health and arrive in the
 * daily digest instead).
 */
export const FAIL_THRESHOLD = 2;
export const REMINDER_MS = 24 * 3600_000;
/** When the state store itself is unreachable (normally: the database is down), email at most once per this many UTC hours. */
export const STATELESS_EVERY_HOURS = 6;

export interface AlarmState {
  status: "up" | "down";
  /** Consecutive failed probes, capped at FAIL_THRESHOLD so a long outage doesn't rewrite state every run. */
  failures: number;
  /** Start of the current run of failed probes (ISO). */
  failingSince: string | null;
  /** Last DOWN or reminder email (ISO). */
  lastAlertAt: string | null;
}

export const INITIAL_STATE: AlarmState = { status: "up", failures: 0, failingSince: null, lastAlertAt: null };

export interface ProbeResult {
  ok: boolean;
  /** HTTP status, 0 when there was no response. */
  status: number;
  /** "HTTP 503", "timed out after 15 s", "fetch failed: …" */
  reason: string;
  /** First part of the response body (for the email). */
  body: string;
}

export interface AlarmEmail {
  kind: "down" | "reminder" | "recovered" | "stateless";
  subject: string;
  text: string;
}

const ADMIN_URL = "https://gablemath.com/admin";
const HEALTH_URL = "https://gablemath.com/api/health";

export function formatDuration(ms: number): string {
  const min = Math.max(0, Math.round(ms / 60_000));
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 48) return `${h} h ${min % 60} min`;
  return `${Math.floor(h / 24)} d ${h % 24} h`;
}

/** Accept whatever was stored; anything malformed falls back to the initial state. */
export function parseState(raw: unknown): AlarmState {
  const s = (raw ?? {}) as Partial<AlarmState>;
  if (s.status !== "up" && s.status !== "down") return { ...INITIAL_STATE };
  return {
    status: s.status,
    failures: Number.isInteger(s.failures) ? Math.min(Math.max(s.failures as number, 0), FAIL_THRESHOLD) : 0,
    failingSince: typeof s.failingSince === "string" ? s.failingSince : null,
    lastAlertAt: typeof s.lastAlertAt === "string" ? s.lastAlertAt : null,
  };
}

export function sameState(a: AlarmState, b: AlarmState): boolean {
  return a.status === b.status && a.failures === b.failures && a.failingSince === b.failingSince && a.lastAlertAt === b.lastAlertAt;
}

function footer(): string {
  return [
    "",
    "How this alarm behaves: an email when /api/health fails twice in a row (10 min apart), one reminder per 24 h while it stays down, and one email when it recovers.",
    "Open error-inbox items never trigger it — they arrive in the daily digest.",
    `Owner console: ${ADMIN_URL}`,
  ].join("\n");
}

export function decide(prev: AlarmState, probe: ProbeResult, now: Date): { next: AlarmState; email: AlarmEmail | null } {
  const iso = now.toISOString();

  if (probe.ok) {
    const next: AlarmState = { ...INITIAL_STATE };
    if (prev.status !== "down") return { next, email: null };
    const since = prev.failingSince ? Date.parse(prev.failingSince) : NaN;
    const downFor = Number.isFinite(since) ? ` (down ${formatDuration(now.getTime() - since)})` : "";
    return {
      next,
      email: {
        kind: "recovered",
        subject: `Recovered: /api/health is OK again${downFor}`,
        text: [`${HEALTH_URL} answered 200 again at ${iso}${downFor}.`, "", probe.body, footer()].join("\n"),
      },
    };
  }

  const failures = Math.min(prev.failures + 1, FAIL_THRESHOLD);
  const failingSince = prev.failingSince && (prev.failures > 0 || prev.status === "down") ? prev.failingSince : iso;
  const base: AlarmState = { ...prev, failures, failingSince };

  if (prev.status === "up") {
    if (failures < FAIL_THRESHOLD) return { next: base, email: null };
    return {
      next: { ...base, status: "down", lastAlertAt: iso },
      email: {
        kind: "down",
        subject: `DOWN: /api/health ${probe.reason}`,
        text: [
          `${HEALTH_URL} failed ${FAIL_THRESHOLD} checks in a row (first failure ${failingSince}, latest ${iso}).`,
          "",
          `Result: ${probe.reason}`,
          "",
          probe.body,
          footer(),
        ].join("\n"),
      },
    };
  }

  // Already down: stay quiet, except one reminder per REMINDER_MS.
  const last = prev.lastAlertAt ? Date.parse(prev.lastAlertAt) : NaN;
  if (Number.isFinite(last) && now.getTime() - last < REMINDER_MS) return { next: base, email: null };
  const since = Date.parse(failingSince);
  return {
    next: { ...base, lastAlertAt: iso },
    email: {
      kind: "reminder",
      subject: `Still down: /api/health ${probe.reason} (for ${formatDuration(now.getTime() - since)})`,
      text: [`${HEALTH_URL} has been failing since ${failingSince}. Latest check ${iso}: ${probe.reason}.`, "", probe.body, footer()].join("\n"),
    },
  };
}

/** If the email for a transition could not be delivered, keep the old status so the next run retries it. */
export function undelivered(prev: AlarmState, next: AlarmState): AlarmState {
  return { ...next, status: prev.status, lastAlertAt: prev.lastAlertAt, failingSince: next.failingSince ?? prev.failingSince };
}

/**
 * The state store is unreachable (normally because the database itself is down, which also fails
 * the probe). Without memory we can't de-duplicate, so only email from the first run of every
 * STATELESS_EVERY_HOURS-hour UTC block — at most 4 emails a day for an outage that long.
 */
export function statelessEmail(probe: ProbeResult, now: Date): AlarmEmail | null {
  if (probe.ok) return null;
  if (now.getUTCHours() % STATELESS_EVERY_HOURS !== 0 || now.getUTCMinutes() >= 10) return null;
  return {
    kind: "stateless",
    subject: `DOWN: /api/health ${probe.reason} (alarm state unavailable)`,
    text: [
      `${HEALTH_URL} is failing (${probe.reason}) at ${now.toISOString()}, and the alarm could not read its state from the database.`,
      `Until the database answers again you get this at most once every ${STATELESS_EVERY_HOURS} hours, and no "Recovered" email for this stretch — check ${HEALTH_URL} directly.`,
      "",
      probe.body,
      footer(),
    ].join("\n"),
  };
}
