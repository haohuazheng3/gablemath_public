import { describe, expect, it } from "vitest";
import { computePanels, computePayback, kwhFromBill, panelAreaFt2, sizeFor, stateIncentiveAmount, verdictFor, yearValue, type PaybackInput } from "./compute";
import { FEDERAL, STATES, US_RATE_CENTS, US_TYPICAL, stateSolar } from "./data";
import { solarPanelCalculator } from "./panel";
import { PANEL_DEFAULTS, computePanelCalc } from "./panel-model";
import { solarPaybackCalculator } from "./payback";
import { PAYBACK_DEFAULTS, computePaybackCalc, paybackPresetValues, systemKw } from "./payback-model";

const base: PaybackInput = {
  annualUseKwh: 10000,
  kw: 1,
  yieldKwhPerKw: 1000,
  costPerW: 1,
  rateCents: 10,
  escalationPct: 0,
  degradationPct: 0,
  exportMode: "retail",
  exportValue: 1,
  selfUsePct: 40,
  excessCents: 0,
  federalPct: 0,
  upfront: null,
  perf: null,
  fees: null,
  battery: null,
  years: 25,
};

describe("panel sizing", () => {
  it("converts a bill to kWh", () => {
    expect(kwhFromBill(150, 15)).toBeCloseTo(1000, 6);
    expect(kwhFromBill(150, 0)).toBe(0);
  });

  it("440-W panel footprint matches the research value (21.5 sq ft)", () => {
    expect(panelAreaFt2(440)).toBeCloseTo(21.5, 1);
  });

  it("1,000 kWh/month at 1,340 kWh/kW → 8.96 kW → 21 × 440 W", () => {
    const r = computePanels({ monthlyKwh: 1000, yieldKwhPerKw: 1340, offsetPct: 100, panelW: 440, psh: 4.93 });
    expect(r.kwNeeded).toBeCloseTo(8.955, 3);
    expect(r.panels).toBe(21);
    expect(r.kw).toBeCloseTo(9.24, 6);
    expect(r.annualProd).toBeCloseTo(9.24 * 1340, 6);
    expect(r.roofFt2).toBeCloseTo((21 * panelAreaFt2(440)) / 0.8, 6);
    expect(r.byWattage.map((b) => b.panels)).toEqual([23, 22, 21, 20]);
  });

  it("PVWatts v8 references: Arizona 440-W panel ≈ 2.12 kWh/day; 12,360 kWh/yr → 7.04 kW → 17 panels", () => {
    const az = stateSolar("AZ");
    expect(az.yield).toBe(1755);
    const r = computePanels({ monthlyKwh: 12360 / 12, yieldKwhPerKw: az.yield, offsetPct: 100, panelW: 440, psh: az.psh });
    expect(r.perPanelDay).toBeCloseTo(2.12, 2);
    expect(r.kwNeeded).toBeCloseTo(7.04, 2);
    expect(r.panels).toBe(17);
  });

  it("PVWatts v8 references: Texas 13,323 kWh/yr → 9.37 kW → 22 panels; Florida → 21", () => {
    expect(sizeFor(13323, stateSolar("TX").yield, 440).panels).toBe(22);
    expect(sizeFor(13323, stateSolar("TX").yield, 440).kwNeeded).toBeCloseTo(9.37, 1);
    expect(sizeFor(13239, stateSolar("FL").yield, 440).panels).toBe(21);
  });

  it("handles zero and huge inputs", () => {
    const z = computePanels({ monthlyKwh: 0, yieldKwhPerKw: 1300, offsetPct: 100, panelW: 440, psh: 4.7 });
    expect(z.panels).toBe(0);
    expect(z.offsetActual).toBe(0);
    expect(computePanels({ monthlyKwh: 500, yieldKwhPerKw: 0, offsetPct: 100, panelW: 440, psh: 0 }).panels).toBe(0);
    const big = computePanels({ monthlyKwh: 100000, yieldKwhPerKw: 1300, offsetPct: 100, panelW: 460, psh: 4.7 });
    expect(big.panels).toBe(Math.ceil((1200000 / 1300) * (1000 / 460)));
    expect(Number.isFinite(big.roofFt2)).toBe(true);
  });

  it("bill mode and state change flow through the model", () => {
    const r = computePanelCalc({ ...PANEL_DEFAULTS, mode: "bill", bill: 181.9, rate: 18.19 });
    expect(r.annualUse).toBeCloseTo(12000, 6);
    expect(computePanelCalc({ ...PANEL_DEFAULTS, state: "WA" }).panels).toBeGreaterThan(computePanelCalc({ ...PANEL_DEFAULTS, state: "AZ" }).panels);
  });
});

describe("payback", () => {
  it("simple retail case: $1,000 system saving $100/yr pays back in exactly 10 years", () => {
    const r = computePayback(base);
    expect(r.netCost).toBe(1000);
    expect(r.savings1).toBeCloseTo(100, 6);
    expect(r.paybackYears).toBeCloseTo(10, 6);
    expect(r.netAfterYears).toBeCloseTo(1500, 6);
    expect(r.simplePayback).toBeCloseTo(10, 6);
  });

  it("matches the research illustration for Florida (9.1 kW, $2.12/W, 1:1 net metering)", () => {
    const fl = stateSolar("FL");
    const r = computePayback({ ...base, annualUseKwh: 13239, kw: 9.1, yieldKwhPerKw: fl.yield, costPerW: 2.12, rateCents: 15.32, escalationPct: 3, degradationPct: 0.5 });
    expect(r.savings1).toBeCloseTo(2028, -1);
    expect(r.simplePayback!).toBeCloseTo(9.5, 1);
    expect(Math.ceil(r.paybackYears!)).toBe(9);
  });

  it("net billing: 40% self-use at retail, 60% exported at 4¢", () => {
    const v = yearValue(1000, 10000, 10, { exportMode: "cents", exportValue: 4, selfUsePct: 40, excessCents: 0, battery: null });
    expect(v.value).toBeCloseTo(400 * 0.1 + 600 * 0.04, 6);
    const pct = yearValue(1000, 10000, 10, { exportMode: "pct", exportValue: 0.75, selfUsePct: 40, excessCents: 0, battery: null });
    expect(pct.value).toBeCloseTo(400 * 0.1 + 600 * 0.075, 6);
  });

  it("battery shifts exports at 90% round-trip efficiency, and adds nothing under 1:1 net metering", () => {
    const v = yearValue(1000, 10000, 10, { exportMode: "cents", exportValue: 4, selfUsePct: 40, excessCents: 0, battery: { kwh: 1, perKwh: 1000 } });
    expect(v.shifted).toBeCloseTo(365 * 0.9, 6);
    expect(v.value).toBeCloseTo((400 + 328.5) * 0.1 + 235 * 0.04, 6);
    const retail = computePayback({ ...base, battery: { kwh: 10, perKwh: 1000 } });
    expect(retail.grossBattery).toBe(10000);
    expect(retail.savings1).toBeCloseTo(100, 6);
  });

  it("excess production beyond annual use earns only the payout rate", () => {
    const v = yearValue(12000, 10000, 10, { exportMode: "retail", exportValue: 1, selfUsePct: 40, excessCents: 5, battery: null });
    expect(v.value).toBeCloseTo(1000 + 100, 6);
  });

  it("state incentives: capped credits, per-watt rebates, per-year credit schedules", () => {
    expect(stateIncentiveAmount({ kind: "credit", pct: 0.25, cap: 5000 }, 40000, 10)).toBe(5000);
    expect(stateIncentiveAmount({ kind: "credit", pct: 0.25, cap: 5000 }, 8000, 3)).toBe(2000);
    expect(stateIncentiveAmount({ kind: "perW", rate: 0.3 }, 20000, 8)).toBeCloseTo(2400, 6);
    const sc = computePayback({ ...base, kw: 10, costPerW: 2, upfront: { kind: "credit", pct: 0.25, cap: 35000, perYear: 3500 } });
    expect(sc.stateTotal).toBe(5000);
    expect(sc.outlay).toBe(20000);
    expect(sc.rows[0].stateCredit).toBe(3500);
    expect(sc.rows[1].stateCredit).toBe(1500);
    expect(sc.rows[2].stateCredit).toBe(0);
  });

  it("performance payments and solar fees", () => {
    const r = computePayback({ ...base, kw: 10, perf: { perMwh: 77, years: 15 }, fees: { prodCents: 4.02, perKwMonth: 0.44, monthly: 1 } });
    expect(r.rows[0].perf).toBeCloseTo(10 * 77, 6);
    expect(r.rows[15].perf).toBe(0);
    expect(r.rows[0].fees).toBeCloseTo(10000 * 0.0402 + 0.44 * 10 * 12 + 12, 6);
  });

  it("no payback when savings never catch up; zero-size system is safe", () => {
    expect(computePayback({ ...base, costPerW: 100 }).paybackYears).toBeNull();
    const z = computePayback({ ...base, kw: 0 });
    expect(z.netCost).toBe(0);
    expect(z.paybackYears).toBe(0);
  });

  it("2026 federal rules: 25D is 0%; 48E dates for lease/PPA", () => {
    expect(FEDERAL.credit25dPct2026).toBe(0);
    expect(PAYBACK_DEFAULTS.fed).toBe(0);
    expect(FEDERAL.tpoBeginConstruction).toBe("2026-07-04");
    expect(FEDERAL.tpoPlacedInService).toBe("2027-12-31");
  });

  it("verdict thresholds", () => {
    expect(verdictFor(6)).toBe("strong");
    expect(verdictFor(10)).toBe("solid");
    expect(verdictFor(14)).toBe("marginal");
    expect(verdictFor(20)).toBe("weak");
    expect(verdictFor(null)).toBe("weak");
  });

  it("auto sizing follows the offset target; custom size overrides it", () => {
    const v = paybackPresetValues("CA");
    expect(v.offset).toBe(70);
    expect(systemKw({ ...v, sizeMode: "custom", kw: 6 })).toBe(6);
    expect(systemKw({ ...v, offset: 100 })).toBeGreaterThan(systemKw(v));
  });
});

describe("data and presets", () => {
  it("covers all 50 states + DC with sun, price and policy data", () => {
    expect(STATES).toHaveLength(51);
    for (const s of STATES) {
      expect(s.yield).toBeGreaterThan(800);
      expect(s.psh).toBeGreaterThan(2.5);
      expect(s.rate).toBeGreaterThan(5);
      expect(s.costPerW).toBeGreaterThan(1.5);
      expect(s.policy).toBeTruthy();
    }
    expect(US_TYPICAL.rate).toBe(US_RATE_CENTS);
  });

  it("payback presets: 51 states, unique slugs, distinct answers, SEO lengths", () => {
    const p = solarPaybackCalculator.presets!;
    expect(p).toHaveLength(51);
    expect(new Set(p.map((x) => x.slug)).size).toBe(51);
    expect(new Set(p.map((x) => x.metaDescription)).size).toBe(51);
    const paybacks = new Set(p.map((x) => computePaybackCalc(x.values).paybackYears?.toFixed(2)));
    expect(paybacks.size).toBeGreaterThan(40);
    for (const x of p) {
      expect(x.metaTitle.length).toBeLessThanOrEqual(60);
      expect(x.metaDescription.length).toBeLessThanOrEqual(158);
      const a = solarPaybackCalculator.presetAnswer!(x.values);
      expect(a.bullets.length).toBeGreaterThanOrEqual(4);
      expect(a.notes![0]).toMatch(/Verdict/);
    }
  });

  it("panel presets and meta fit the SEO limits", () => {
    const p = solarPanelCalculator.presets!;
    expect(p.map((x) => x.slug)).toEqual(["500-kwh-per-month", "750-kwh-per-month", "1000-kwh-per-month", "1500-kwh-per-month", "2000-kwh-per-month"]);
    for (const x of p) {
      expect(x.metaTitle.length).toBeLessThanOrEqual(60);
      expect(x.metaDescription.length).toBeLessThanOrEqual(158);
      expect(solarPanelCalculator.presetAnswer!(x.values).table!.rows).toHaveLength(9);
    }
    for (const c of [solarPanelCalculator, solarPaybackCalculator]) {
      expect(c.meta.metaTitle.length).toBeLessThanOrEqual(60);
      expect(c.meta.metaDescription.length).toBeLessThanOrEqual(158);
      expect(c.meta.faq.length).toBeGreaterThanOrEqual(5);
    }
  });
});
