// Shared (server + client) model for the air conditioner cost calculator.

import { computeAc, stateInfo, windowSize, type AcType } from "./compute";
import { MINI_SPLIT, SEER2_REGION_MIN } from "./data";
import { RATE_DEFAULTS, rateOf } from "./rate-model";

export const AC_DEFAULTS = {
  ...RATE_DEFAULTS,
  /** "window" | "central" | "minisplit" */
  type: "central",
  btu: 8000,
  tons: 3,
  msBtu: 12000,
  /** window units: "es" (ENERGY STAR average) | "min" (2026 federal minimum) | "custom" */
  ceerMode: "es",
  ceer: 15,
  seer2: 14.3,
  msSeer2: MINI_SPLIT.seer2,
  /** "climate" (hours from the state's cooling degree days) | "custom" */
  usage: "climate",
  hours: 8,
  days: 94,
  qty: 1,
};

export type AcValues = typeof AC_DEFAULTS;

export function acType(v: AcValues): AcType {
  return v.type === "window" || v.type === "minisplit" ? v.type : "central";
}

export function acCapacity(v: AcValues): number {
  const t = acType(v);
  return t === "window" ? v.btu : t === "minisplit" ? v.msBtu : v.tons * 12000;
}

export function acEfficiency(v: AcValues): number {
  const t = acType(v);
  if (t === "central") return v.seer2;
  if (t === "minisplit") return v.msSeer2;
  const size = windowSize(v.btu);
  return v.ceerMode === "min" ? size.minCeer : v.ceerMode === "custom" ? v.ceer : size.esCeer;
}

/** Federal SEER2 minimum for split central AC where the state is. */
export function regionMinSeer2(state: string): number {
  return SEER2_REGION_MIN[stateInfo(state).seer2];
}

export function computeAcCalc(v: AcValues) {
  const rate = rateOf(v);
  const info = stateInfo(v.state);
  return {
    rate,
    info,
    type: acType(v),
    capacity: acCapacity(v),
    efficiency: acEfficiency(v),
    r: computeAc({
      btuh: acCapacity(v),
      efficiency: acEfficiency(v),
      qty: v.qty,
      usage: v.usage === "custom" ? "custom" : "climate",
      hoursPerDay: v.hours,
      daysPerYear: v.days,
      info,
      cents: rate.cents,
    }),
  };
}
