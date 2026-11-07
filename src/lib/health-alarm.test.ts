import { describe, expect, it } from "vitest";
import { decide, formatDuration, INITIAL_STATE, parseState, statelessEmail, undelivered, type AlarmState, type ProbeResult } from "./health-alarm";

const ok: ProbeResult = { ok: true, status: 200, reason: "HTTP 200", body: '{"status":"ok"}' };
const fail: ProbeResult = { ok: false, status: 503, reason: "HTTP 503", body: '{"status":"degraded"}' };
const t = (iso: string) => new Date(iso);

/** Run a sequence of probes 10 minutes apart and collect the emails that would go out. */
function run(probes: ProbeResult[], start = "2026-11-07T00:00:00Z", state: AlarmState = INITIAL_STATE) {
  const emails: string[] = [];
  let s = state;
  probes.forEach((p, i) => {
    const r = decide(s, p, new Date(Date.parse(start) + i * 600_000));
    if (r.email) emails.push(r.email.kind);
    s = r.next;
  });
  return { emails, state: s };
}

describe("health alarm", () => {
  it("never emails for a single failed probe (blip)", () => {
    expect(run([ok, fail, ok, fail, ok, ok]).emails).toEqual([]);
  });

  it("emails DOWN only after two consecutive failures, then RECOVERED once", () => {
    const r = run([ok, fail, fail, fail, fail, ok, ok]);
    expect(r.emails).toEqual(["down", "recovered"]);
    expect(r.state).toEqual(INITIAL_STATE);
  });

  it("stays silent while down, with at most one reminder per 24 h", () => {
    const day = Array.from({ length: 6 * 50 }, () => fail); // 50 hours of failures
    expect(run(day).emails).toEqual(["down", "reminder", "reminder"]);
  });

  it("does not rewrite state on every run during a long outage", () => {
    const a = run([fail, fail, fail]).state;
    const b = decide(a, fail, t("2026-11-07T01:00:00Z")).next;
    expect(b).toEqual(a);
  });

  it("the old flapping pattern (503/200 alternating) sends nothing", () => {
    expect(run([fail, ok, fail, ok, fail, ok, fail, ok]).emails).toEqual([]);
  });

  it("recovery email reports the downtime", () => {
    const down = run([fail, fail]).state;
    const r = decide(down, ok, t("2026-11-07T01:30:00Z"));
    expect(r.email?.subject).toContain("down 1 h 30 min");
  });

  it("an undelivered DOWN email is retried on the next failed probe", () => {
    const one = run([fail]).state;
    const r = decide(one, fail, t("2026-11-07T00:10:00Z"));
    expect(r.email?.kind).toBe("down");
    const kept = undelivered(one, r.next);
    expect(kept.status).toBe("up");
    expect(decide(kept, fail, t("2026-11-07T00:20:00Z")).email?.kind).toBe("down");
  });

  it("an undelivered RECOVERED email is retried on the next good probe", () => {
    const down = run([fail, fail]).state;
    const r = decide(down, ok, t("2026-11-07T00:30:00Z"));
    const kept = undelivered(down, r.next);
    expect(kept.status).toBe("down");
    expect(decide(kept, ok, t("2026-11-07T00:40:00Z")).email?.kind).toBe("recovered");
  });

  it("parses stored state defensively", () => {
    expect(parseState(null)).toEqual(INITIAL_STATE);
    expect(parseState({ status: "weird" })).toEqual(INITIAL_STATE);
    expect(parseState({ status: "down", failures: 99, failingSince: "x", lastAlertAt: 5 })).toEqual({ status: "down", failures: 2, failingSince: "x", lastAlertAt: null });
  });

  it("without state, emails only in the first slot of each 6-hour UTC block", () => {
    expect(statelessEmail(fail, t("2026-11-07T06:00:30Z"))?.kind).toBe("stateless");
    expect(statelessEmail(fail, t("2026-11-07T06:10:30Z"))).toBeNull();
    expect(statelessEmail(fail, t("2026-11-07T07:00:30Z"))).toBeNull();
    expect(statelessEmail(ok, t("2026-11-07T06:00:30Z"))).toBeNull();
  });

  it("formats durations", () => {
    expect(formatDuration(25 * 60_000)).toBe("25 min");
    expect(formatDuration(190 * 60_000)).toBe("3 h 10 min");
    expect(formatDuration(52 * 3600_000)).toBe("2 d 4 h");
  });
});
