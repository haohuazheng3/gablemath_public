// Shared (server + client) model for the pool pump cost calculator.

import { computePoolPump } from "./compute";
import { POOL_PUMP } from "./data";
import { RATE_DEFAULTS, rateOf } from "./rate-model";

export const POOL_DEFAULTS = {
  ...RATE_DEFAULTS,
  /** "vs" (variable speed) | "single" | "booster" | "custom" */
  pump: "vs",
  /** "inground" | "above" */
  ground: "inground",
  highW: POOL_PUMP.inground.high,
  lowW: POOL_PUMP.inground.low,
  highHours: 2,
  lowHours: 10,
  watts: POOL_PUMP.singleSpeed,
  hours: 8,
  months: 12,
};

export type PoolValues = typeof POOL_DEFAULTS;

export function pumpWatts(v: PoolValues): number {
  return v.pump === "booster" ? POOL_PUMP.booster : v.watts;
}

export function computePoolCalc(v: PoolValues) {
  const rate = rateOf(v);
  return {
    rate,
    r: computePoolPump({
      pump: v.pump === "vs" ? "vs" : "fixed",
      highW: v.highW,
      lowW: v.lowW,
      highHours: v.highHours,
      lowHours: v.lowHours,
      watts: pumpWatts(v),
      hours: v.hours,
      months: v.months,
      cents: rate.cents,
    }),
  };
}
