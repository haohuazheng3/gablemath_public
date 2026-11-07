// Shared (server + client) layout values for the wood/vinyl and chain-link calculators: up to six
// connected sides, open ends or a closed loop, walk gates and double drive gates.

import type { GateSpec } from "./compute";

export const MAX_RUNS = 6;

export const LAYOUT_DEFAULTS = {
  runs: 3,
  r1: 50,
  r2: 100,
  r3: 50,
  r4: 100,
  r5: 50,
  r6: 50,
  loop: false,
  wg: 1,
  ww: 48,
  wgs: 1,
  dg: 0,
  dw: 10,
  dgs: 2,
};

export type LayoutValues = typeof LAYOUT_DEFAULTS;

export const RUN_KEYS = ["r1", "r2", "r3", "r4", "r5", "r6"] as const;

export function runCount(v: Pick<LayoutValues, "runs">): number {
  return Math.min(MAX_RUNS, Math.max(1, Math.round(v.runs || 1)));
}

export function runsFrom(v: LayoutValues): number[] {
  return RUN_KEYS.slice(0, runCount(v)).map((k) => v[k]);
}

/** Walk gates (inches) and double drive gates (feet), each placed on the chosen side. */
export function gatesFrom(v: LayoutValues): GateSpec[] {
  const n = runCount(v);
  const side = (s: number) => Math.min(n, Math.max(1, Math.round(s || 1))) - 1;
  return [
    ...Array.from({ length: Math.max(0, Math.round(v.wg)) }, () => ({ widthFt: v.ww / 12, double: false, run: side(v.wgs) })),
    ...Array.from({ length: Math.max(0, Math.round(v.dg)) }, () => ({ widthFt: v.dw, double: true, run: side(v.dgs) })),
  ];
}

/** A straight run with no gates — the shape behind "how many pickets for N ft" searches. */
export function straightRun(lengthFt: number): Partial<LayoutValues> {
  return { runs: 1, r1: lengthFt, loop: false, wg: 0, dg: 0, wgs: 1, dgs: 1 };
}
