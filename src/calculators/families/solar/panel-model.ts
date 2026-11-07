// Shared (server + client) model for the solar panel calculator.

import { computePanels, kwhFromBill } from "./compute";
import { DEFAULT_PANEL_W, OFFSET_RETAIL, US_RATE_CENTS, stateSolar } from "./data";

export const PANEL_DEFAULTS = {
  state: "US",
  mode: "kwh",
  kwh: 874,
  bill: 160,
  rate: US_RATE_CENTS,
  offset: OFFSET_RETAIL,
  panelW: DEFAULT_PANEL_W,
};

export type PanelValues = typeof PANEL_DEFAULTS;

export function monthlyKwhOf(v: PanelValues): number {
  return v.mode === "bill" ? kwhFromBill(v.bill, v.rate) : v.kwh;
}

export function panelInputFrom(v: PanelValues) {
  const s = stateSolar(v.state);
  return { monthlyKwh: monthlyKwhOf(v), yieldKwhPerKw: s.yield, offsetPct: v.offset, panelW: v.panelW, psh: s.psh };
}

export function computePanelCalc(v: PanelValues) {
  return computePanels(panelInputFrom(v));
}
