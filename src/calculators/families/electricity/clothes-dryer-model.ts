// Shared (server + client) model for the clothes dryer cost calculator.

import { computeLaundry, dryerKwhPerLoad } from "./compute";
import { DRYER_CYCLES_PER_YEAR, DRYER_KWH_YEAR } from "./data";
import { RATE_DEFAULTS, rateOf } from "./rate-model";

export const DRYER_DEFAULTS = {
  ...RATE_DEFAULTS,
  /** "vented" | "heatpump" | "custom" */
  dryer: "vented",
  kwhLoad: Math.round((DRYER_KWH_YEAR.vented / DRYER_CYCLES_PER_YEAR) * 100) / 100,
  /** DOE test basis: 283 loads a year ≈ 5.4 a week */
  loads: Math.round((DRYER_CYCLES_PER_YEAR / 52.14) * 10) / 10,
  /** "none" | "front" | "top" */
  washer: "none",
};

export type DryerValues = typeof DRYER_DEFAULTS;

export function computeDryerCalc(v: DryerValues) {
  const rate = rateOf(v);
  const kwhLoad = dryerKwhPerLoad(v.dryer, v.kwhLoad);
  return { rate, kwhLoad, r: computeLaundry({ dryerKwhLoad: kwhLoad, washer: v.washer, loadsPerWeek: v.loads, cents: rate.cents }) };
}
