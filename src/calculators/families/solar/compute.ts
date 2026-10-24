// Pure solar math shared by the client calculators and server-rendered preset answers.

import { BATTERY_RTE, PANEL_EFF, PANEL_WATTS, ROOF_PACKING, SQFT_PER_M2, type ExportMode } from "./data";

const pos = (n: number) => (Number.isFinite(n) && n > 0 ? n : 0);

/** kWh per month implied by a bill at an all-in rate (¢/kWh). */
export function kwhFromBill(billUsd: number, rateCents: number): number {
  return rateCents > 0 ? pos(billUsd) / (rateCents / 100) : 0;
}

/** Footprint of one panel, ft²: W ÷ (efficiency × 1,000 W/m²), in square feet. */
export function panelAreaFt2(panelW: number, eff = PANEL_EFF): number {
  return eff > 0 ? (pos(panelW) / (eff * 1000)) * SQFT_PER_M2 : 0;
}

export interface PanelInput {
  monthlyKwh: number;
  /** AC kWh per kW DC per year (losses already applied). */
  yieldKwhPerKw: number;
  offsetPct: number;
  panelW: number;
  /** Peak sun hours, kWh/m²/day (for display / cross-check). */
  psh: number;
}

export function sizeFor(annualKwhTarget: number, yieldKwhPerKw: number, panelW: number) {
  const kwNeeded = yieldKwhPerKw > 0 ? pos(annualKwhTarget) / yieldKwhPerKw : 0;
  const panels = kwNeeded > 0 && panelW > 0 ? Math.ceil((kwNeeded * 1000) / panelW - 1e-9) : 0;
  const kw = (panels * panelW) / 1000;
  const arrayFt2 = panels * panelAreaFt2(panelW);
  return { kwNeeded, panels, kw, arrayFt2, roofFt2: arrayFt2 / ROOF_PACKING };
}

export function computePanels(i: PanelInput) {
  const annualUse = pos(i.monthlyKwh) * 12;
  const target = (annualUse * pos(i.offsetPct)) / 100;
  const y = pos(i.yieldKwhPerKw);
  const s = sizeFor(target, y, pos(i.panelW));
  const annualProd = s.kw * y;
  const perPanelYear = (pos(i.panelW) / 1000) * y;
  return {
    annualUse,
    target,
    ...s,
    annualProd,
    monthlyProd: annualProd / 12,
    dailyProd: annualProd / 365,
    offsetActual: annualUse > 0 ? annualProd / annualUse : 0,
    perPanelYear,
    perPanelDay: perPanelYear / 365,
    /** Effective derate implied by the yield vs. peak sun hours (yield ÷ (PSH × 365)). */
    impliedDerate: i.psh > 0 ? y / (i.psh * 365) : 0,
    byWattage: PANEL_WATTS.map((w) => ({ w, ...sizeFor(target, y, w) })),
  };
}

/* ───────── payback ───────── */

export interface UpfrontIncentive {
  kind: "credit" | "perW";
  pct?: number;
  rate?: number;
  cap?: number;
  /** Max credit usable per year; the rest carries forward (SC). */
  perYear?: number;
}

export interface PaybackInput {
  annualUseKwh: number;
  kw: number;
  yieldKwhPerKw: number;
  costPerW: number;
  rateCents: number;
  escalationPct: number;
  degradationPct: number;
  exportMode: ExportMode;
  /** pct mode: fraction of retail (0–1); cents mode: ¢/kWh; ignored for retail. */
  exportValue: number;
  /** Share of production used on site as it is made (net-billing modes). */
  selfUsePct: number;
  /** Retail mode: ¢/kWh paid for production above annual use. */
  excessCents: number;
  federalPct: number;
  upfront: UpfrontIncentive | null;
  perf: { perMwh: number; years: number } | null;
  fees: { prodCents?: number; perKwMonth?: number; monthly?: number } | null;
  battery: { kwh: number; perKwh: number } | null;
  years: number;
}

export interface PaybackYear {
  year: number;
  production: number;
  rateCents: number;
  billSavings: number;
  /** Performance payments (SREC / SMART). */
  perf: number;
  /** State tax credit taken this year (credits capped per year). */
  stateCredit: number;
  fees: number;
  net: number;
  cumulative: number;
}

export function stateIncentiveAmount(u: UpfrontIncentive | null, grossSolar: number, kw: number): number {
  if (!u) return 0;
  const raw = u.kind === "credit" ? (u.pct ?? 0) * grossSolar : (u.rate ?? 0) * kw * 1000;
  return Math.max(0, Math.min(raw, u.cap ?? Infinity));
}

/** Bill value of one year of production at a given retail rate. */
export function yearValue(
  prod: number,
  use: number,
  rateCents: number,
  i: Pick<PaybackInput, "exportMode" | "exportValue" | "selfUsePct" | "excessCents" | "battery">,
) {
  const rate = rateCents / 100;
  if (i.exportMode === "retail") {
    const offset = Math.min(prod, use);
    return { selfUsed: offset, exported: Math.max(prod - use, 0), shifted: 0, value: offset * rate + Math.max(prod - use, 0) * (pos(i.excessCents) / 100) };
  }
  const selfUsed = Math.min(prod * Math.min(pos(i.selfUsePct), 100) / 100, use);
  const exported = prod - selfUsed;
  const charge = i.battery ? Math.min(exported, pos(i.battery.kwh) * 365) : 0;
  const shifted = Math.min(charge * BATTERY_RTE, Math.max(use - selfUsed, 0));
  const exportPrice = i.exportMode === "cents" ? pos(i.exportValue) / 100 : pos(i.exportValue) * rate;
  return { selfUsed, exported: exported - charge, shifted, value: (selfUsed + shifted) * rate + (exported - charge) * exportPrice };
}

export function computePayback(i: PaybackInput) {
  const kw = pos(i.kw);
  const use = pos(i.annualUseKwh);
  const years = Math.max(1, Math.round(i.years || 25));
  const grossSolar = kw * 1000 * pos(i.costPerW);
  const grossBattery = i.battery ? pos(i.battery.kwh) * pos(i.battery.perKwh) : 0;
  const gross = grossSolar + grossBattery;
  const federal = (gross * Math.min(pos(i.federalPct), 100)) / 100;
  const stateTotal = stateIncentiveAmount(i.upfront, grossSolar, kw);
  const perYearCap = i.upfront?.perYear;
  const stateUpfront = perYearCap ? 0 : stateTotal;
  const netCost = gross - federal - stateTotal;

  const esc = i.escalationPct / 100;
  const deg = pos(i.degradationPct) / 100;
  const prod1 = kw * pos(i.yieldKwhPerKw);
  const rows: PaybackYear[] = [];
  let cum = -(gross - federal - stateUpfront);
  let stateLeft = stateTotal - stateUpfront;
  let payback: number | null = cum >= 0 ? 0 : null;
  for (let n = 1; n <= years; n++) {
    const production = prod1 * Math.pow(1 - deg, n - 1);
    const rateCents = pos(i.rateCents) * Math.pow(1 + esc, n - 1);
    const billSavings = yearValue(production, use, rateCents, i).value;
    const perf = i.perf && n <= i.perf.years ? (production / 1000) * pos(i.perf.perMwh) : 0;
    let stateCredit = 0;
    if (stateLeft > 0 && perYearCap) {
      stateCredit = Math.min(perYearCap, stateLeft);
      stateLeft -= stateCredit;
    }
    const f = i.fees;
    const fees = f ? (production * pos(f.prodCents ?? 0)) / 100 + pos(f.perKwMonth ?? 0) * kw * 12 + pos(f.monthly ?? 0) * 12 : 0;
    const net = billSavings + perf + stateCredit - fees;
    const prev = cum;
    cum += net;
    if (payback == null && cum >= 0 && net > 0) payback = n - 1 + -prev / net;
    rows.push({ year: n, production, rateCents, billSavings, perf, stateCredit, fees, net, cumulative: cum });
  }
  const y1 = rows[0];
  const v1 = yearValue(prod1, use, pos(i.rateCents), i);
  return {
    kw,
    grossSolar,
    grossBattery,
    gross,
    federal,
    stateTotal,
    netCost,
    /** Cash out of pocket at install (state credits paid out over years are excluded). */
    outlay: gross - federal - stateUpfront,
    production1: prod1,
    offset1: use > 0 ? prod1 / use : 0,
    year1: y1,
    split1: v1,
    billBefore1: (use * pos(i.rateCents)) / 100,
    /** Year-1 savings from the system itself: bill savings + performance payments − solar fees. */
    savings1: y1 ? y1.billSavings + y1.perf - y1.fees : 0,
    rows,
    paybackYears: payback,
    netAfterYears: cum,
    lifetimeSavings: rows.reduce((a, r) => a + r.net, 0),
    simplePayback: y1 && y1.billSavings + y1.perf - y1.fees > 0 ? netCost / (y1.billSavings + y1.perf - y1.fees) : null,
  };
}

export type PaybackResult = ReturnType<typeof computePayback>;

export type Verdict = "strong" | "solid" | "marginal" | "weak";

/** Plain-language verdict from payback years (null = not within the analysis period). */
export function verdictFor(payback: number | null): Verdict {
  if (payback == null || payback > 16) return "weak";
  if (payback > 12) return "marginal";
  if (payback > 8) return "solid";
  return "strong";
}
