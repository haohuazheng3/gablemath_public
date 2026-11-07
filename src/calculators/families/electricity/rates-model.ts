// Shared (server + client) model for the electricity-rates-by-state lookup.

import { billFor, centsFor, pctChange, rateRank, stateInfo, stateRate, type RateMode } from "./compute";
import { RATES } from "./data";

export const RATES_DEFAULTS = {
  state: "US",
  /** "ytd" | "month" */
  rateMode: "ytd",
  /** monthly use to price; follows the state's average when the state changes */
  kwh: stateInfo("US").kwh,
};

export type RatesValues = typeof RATES_DEFAULTS;

export function computeRatesCalc(v: RatesValues) {
  const row = stateRate(v.state);
  const info = stateInfo(v.state);
  const mode: Exclude<RateMode, "custom"> = v.rateMode === "month" ? "month" : "ytd";
  const cents = centsFor(row, mode);
  const usC = centsFor(RATES.us, mode);
  return {
    row,
    info,
    mode,
    cents,
    usCents: usC,
    isUs: row.code === "US",
    rank: row.code === "US" ? 0 : rateRank(row.code, mode),
    vsUsPct: pctChange(cents, usC),
    yoyMonthPct: pctChange(row.cents, row.centsPrevYear),
    yoyYtdPct: pctChange(row.ytdCents, row.ytdPrevYearCents),
    bill: billFor(v.kwh, cents),
    usBill: billFor(v.kwh, usC),
    avgBillNow: billFor(info.kwh, cents),
  };
}
