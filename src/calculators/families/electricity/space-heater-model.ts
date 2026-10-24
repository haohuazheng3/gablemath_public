// Shared (server + client) model for the space heater cost calculator.

import { computeSpaceHeater, heatingSeasonMonths, stateInfo } from "./compute";
import { DAYS_PER_MONTH } from "./data";
import { RATE_DEFAULTS, rateOf } from "./rate-model";

export const HEATER_DEFAULTS = {
  ...RATE_DEFAULTS,
  watts: 1500,
  qty: 1,
  hours: 8,
  days: Math.round(DAYS_PER_MONTH * 100) / 100,
  duty: 100,
  /** use the state's heating season (months averaging under 60°F) */
  seasonAuto: true,
  months: 5,
};

export type HeaterValues = typeof HEATER_DEFAULTS;

export function heaterSeason(v: HeaterValues): number {
  return v.seasonAuto ? heatingSeasonMonths(stateInfo(v.state)) : v.months;
}

export function computeHeaterCalc(v: HeaterValues) {
  const rate = rateOf(v);
  const months = heaterSeason(v);
  return {
    rate,
    months,
    info: stateInfo(v.state),
    r: computeSpaceHeater({ watts: v.watts, qty: v.qty, hours: v.hours, days: v.days, duty: v.duty, months, cents: rate.cents }),
  };
}
