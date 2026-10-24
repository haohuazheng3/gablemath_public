// Shared (server + client) model for the refrigerator & freezer cost calculator.

import { computeFridge, fridgeType } from "./compute";
import { RATE_DEFAULTS, rateOf } from "./rate-model";

export const FRIDGE_DEFAULTS = {
  ...RATE_DEFAULTS,
  type: "french-door",
  /** "es" (ENERGY STAR average) | "label" (EnergyGuide kWh/yr) | "meter" (plug-in meter reading) */
  source: "es",
  labelKwh: 557,
  meterKwh: 1.5,
  meterDays: 1,
  qty: 1,
};

export type FridgeValues = typeof FRIDGE_DEFAULTS;

export function computeFridgeCalc(v: FridgeValues) {
  const rate = rateOf(v);
  const source = v.source === "label" || v.source === "meter" ? v.source : "es";
  return {
    rate,
    type: fridgeType(v.type),
    source,
    r: computeFridge({ type: v.type, source, labelKwh: v.labelKwh, meterKwh: v.meterKwh, meterDays: v.meterDays, qty: v.qty, cents: rate.cents }),
  };
}
