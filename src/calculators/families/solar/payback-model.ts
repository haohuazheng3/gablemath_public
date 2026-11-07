// Shared (server + client) model for the solar payback calculator.

import { computePayback, sizeFor, type PaybackInput } from "./compute";
import {
  ANALYSIS_YEARS,
  BATTERY_KWH,
  DEFAULT_PANEL_W,
  DEGRADATION_PCT,
  ESCALATION_PCT,
  FEDERAL,
  SELF_USE_PCT,
  US_TYPICAL,
  defaultOffset,
  stateSolar,
  type ExportMode,
  type StateSolar,
} from "./data";

export const PAYBACK_DEFAULTS = {
  state: "US",
  kwh: US_TYPICAL.avgKwh,
  sizeMode: "auto",
  offset: defaultOffset(US_TYPICAL),
  kw: 8,
  costW: US_TYPICAL.costPerW,
  rate: US_TYPICAL.rate,
  esc: ESCALATION_PCT,
  deg: DEGRADATION_PCT,
  exportMode: "retail",
  /** pct mode: % of retail; cents mode: ¢/kWh. */
  exportVal: 100,
  selfUse: SELF_USE_PCT,
  excess: 0,
  fed: FEDERAL.credit25dPct2026,
  stateInc: true,
  battery: false,
  battKwh: BATTERY_KWH,
  battCost: US_TYPICAL.batteryPerKwh,
};

export type PaybackValues = typeof PAYBACK_DEFAULTS;

/** The state-specific part of the inputs (used by presets and when the visitor picks a state). */
export function stateValues(s: StateSolar): Partial<PaybackValues> {
  const e = s.export;
  return {
    state: s.code,
    offset: defaultOffset(s),
    costW: s.costPerW,
    rate: s.rate,
    exportMode: e.mode,
    exportVal: e.mode === "pct" ? Math.round(e.value * 100) : e.mode === "cents" ? e.value : 100,
    excess: s.excessCents ?? 0,
    battCost: s.batteryPerKwh,
  };
}

export function paybackPresetValues(code: string): PaybackValues {
  const s = stateSolar(code);
  return { ...PAYBACK_DEFAULTS, ...stateValues(s), kwh: s.avgKwh } as PaybackValues;
}

export function systemKw(v: PaybackValues): number {
  if (v.sizeMode === "custom") return Math.max(0, v.kw);
  const s = stateSolar(v.state);
  return sizeFor(v.kwh * 12 * (v.offset / 100), s.yield, DEFAULT_PANEL_W).kw;
}

export function paybackInputFrom(v: PaybackValues): PaybackInput {
  const s = stateSolar(v.state);
  const mode = (v.exportMode === "pct" || v.exportMode === "cents" ? v.exportMode : "retail") as ExportMode;
  return {
    annualUseKwh: v.kwh * 12,
    kw: systemKw(v),
    yieldKwhPerKw: s.yield,
    costPerW: v.costW,
    rateCents: v.rate,
    escalationPct: v.esc,
    degradationPct: v.deg,
    exportMode: mode,
    exportValue: mode === "pct" ? v.exportVal / 100 : v.exportVal,
    selfUsePct: v.selfUse,
    excessCents: v.excess,
    federalPct: v.fed,
    upfront: v.stateInc && s.upfront ? s.upfront : null,
    perf: v.stateInc && s.perf ? { perMwh: s.perf.perMwh, years: s.perf.years } : null,
    fees: s.fees ?? null,
    battery: v.battery ? { kwh: v.battKwh, perKwh: v.battCost } : null,
    years: ANALYSIS_YEARS,
  };
}

export function computePaybackCalc(v: PaybackValues) {
  return computePayback(paybackInputFrom(v));
}
