// Shared (server + client) model for the dehumidifier cost calculator.

import { dehumidifierIef, dehumidifierWatts, pintsToCurrentRating, usageCost } from "./compute";
import { DAYS_PER_MONTH } from "./data";
import { RATE_DEFAULTS, rateOf } from "./rate-model";

export const DEHUM_DEFAULTS = {
  ...RATE_DEFAULTS,
  /** "portable" | "wholehome" */
  kind: "portable",
  pints: 50,
  /** pint rating printed on the box: "2019" (current DOE test, 65°F) | "2012" (older 80°F test) */
  rating: "2019",
  /** "es" | "min" | "custom" */
  iefMode: "es",
  ief: 2,
  hours: 24,
  duty: 100,
  months: 12,
  qty: 1,
};

export type DehumValues = typeof DEHUM_DEFAULTS;

export function computeDehumCalc(v: DehumValues) {
  const rate = rateOf(v);
  const wholeHome = v.kind === "wholehome";
  const pints = v.rating === "2012" ? pintsToCurrentRating(v.pints) : v.pints;
  const ief = dehumidifierIef(pints, wholeHome, v.iefMode, v.ief);
  const watts = dehumidifierWatts(pints, ief);
  const usage = { kw: watts / 1000, hoursPerDay: v.hours, daysPerMonth: DAYS_PER_MONTH, monthsPerYear: v.months, qty: v.qty };
  return {
    rate,
    pints,
    ief,
    watts,
    cost: usageCost({ ...usage, dutyPct: v.duty }, rate.cents),
    band: [usageCost({ ...usage, dutyPct: 25 }, rate.cents).perMonth, usageCost({ ...usage, dutyPct: 75 }, rate.cents).perMonth] as [number, number],
  };
}
