// Shared (server + client) model for the any-appliance electricity cost calculator.

import { annualCost, usageCost, usCents, wattsFromAmps, type Cost, type Rate } from "./compute";
import { DAYS_PER_MONTH, appliance, type Appliance } from "./data";
import { RATE_DEFAULTS, rateOf } from "./rate-model";

export const COST_DEFAULTS = {
  ...RATE_DEFAULTS,
  appliance: "custom",
  /** "watts" | "amps" | "label" (kWh per year from an EnergyGuide/ENERGY STAR rating) */
  input: "watts",
  watts: 1000,
  amps: 10,
  volts: 120,
  kwhYear: 500,
  hours: 3,
  days: Math.round(DAYS_PER_MONTH * 100) / 100,
  months: 12,
  duty: 100,
  qty: 1,
};

export type CostValues = typeof COST_DEFAULTS;

export interface CostCalc {
  rate: Rate;
  cost: Cost;
  /** the same use at the U.S. average price */
  usCost: Cost;
  watts: number;
  annual: boolean;
  appliance?: Appliance;
}

export function computeCostCalc(v: CostValues): CostCalc {
  const rate = rateOf(v);
  const annual = v.input === "label";
  const watts = v.input === "amps" ? wattsFromAmps(v.amps, v.volts) : v.watts;
  const usage = { kw: watts / 1000, hoursPerDay: v.hours, dutyPct: v.duty, daysPerMonth: v.days, monthsPerYear: v.months, qty: v.qty };
  const price = (cents: number) => (annual ? annualCost(v.kwhYear, cents, v.qty) : usageCost(usage, cents));
  return {
    rate,
    cost: price(rate.cents),
    usCost: price(usCents(rate.mode)),
    watts,
    annual,
    appliance: appliance(v.appliance),
  };
}

/** Calculator values for one quick-pick appliance. */
export function valuesForAppliance(a: Appliance): Partial<CostValues> {
  return a.kwhYear != null
    ? { appliance: a.id, input: "label", kwhYear: a.kwhYear, qty: 1 }
    : { appliance: a.id, input: "watts", watts: a.watts ?? 0, hours: a.hours, duty: a.duty, days: a.days ?? COST_DEFAULTS.days, months: 12, qty: 1 };
}
