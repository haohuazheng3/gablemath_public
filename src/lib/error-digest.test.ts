import { describe, expect, it } from "vitest";
import { buildErrorDigest, type OpenError } from "./error-digest";

const row = (n: number): OpenError => ({
  source: "server",
  name: "TypeError",
  message: `boom ${n}\n  at somewhere`,
  route: `/route-${n}`,
  count: n,
  firstSeen: new Date("2026-10-28T07:10:16Z"),
  lastSeen: new Date("2026-11-02T20:40:16Z"),
});
const now = new Date("2026-11-07T09:20:00Z");

describe("error digest", () => {
  it("sends nothing when there are no open errors", () => {
    expect(buildErrorDigest([], 0, 3, now)).toBeNull();
  });

  it("summarises count, top items and the admin link", () => {
    const d = buildErrorDigest([row(1), row(2)], 2, 1, now)!;
    expect(d.subject).toBe("Daily error digest: 2 open errors (2026-11-07)");
    expect(d.text).toContain("plus 1 open warning");
    expect(d.text).toContain("[server] TypeError: boom 1 at somewhere");
    expect(d.text).toContain("/route-2 · ×2 · first 2026-10-28 · last 2026-11-02 20:40 UTC");
    expect(d.text).toContain("https://gablemath.com/admin");
  });

  it("mentions how many are not listed", () => {
    const d = buildErrorDigest([row(1)], 12, 0, now)!;
    expect(d.subject).toContain("12 open errors");
    expect(d.text).toContain("…and 11 more.");
  });
});
