import { describe, expect, it } from "vitest";
import { AC_DEFAULTS, acCapacity, acEfficiency, acType, computeAcCalc, regionMinSeer2 } from "./air-conditioner-model";
import { DRYER_DEFAULTS, computeDryerCalc } from "./clothes-dryer-model";
import { COST_DEFAULTS, computeCostCalc, valuesForAppliance } from "./cost-model";
import { DEHUM_DEFAULTS, computeDehumCalc } from "./dehumidifier-model";
import { EV_DEFAULTS, computeEvCalc, evGasPrice, evKwh100, evModel } from "./ev-charging-model";
import { HOT_TUB_DEFAULTS, computeHotTubCalc, spaKind, standbyWatts } from "./hot-tub-model";
import { POOL_DEFAULTS, computePoolCalc, pumpWatts } from "./pool-pump-model";
import { RATE_DEFAULTS, rateOf } from "./rate-model";
import { RATES_DEFAULTS, computeRatesCalc } from "./rates-model";
import { FRIDGE_DEFAULTS, computeFridgeCalc } from "./refrigerator-model";
import { HEATER_DEFAULTS, computeHeaterCalc, heaterSeason } from "./space-heater-model";
import { APPLIANCES, MINI_SPLIT, POOL_PUMP, RATES, WINDOW_AC } from "./data";
import { stateInfo } from "./compute";

const US = RATES.us.ytdCents;
const finiteDeep = (o: unknown): boolean =>
  typeof o === "number" ? Number.isFinite(o) : o && typeof o === "object" ? Object.values(o).every(finiteDeep) : true;

describe("rate-model", () => {
  it("defaults to the U.S. YTD average; custom uses the user's cents", () => {
    expect(rateOf(RATE_DEFAULTS).cents).toBe(US);
    expect(rateOf({ ...RATE_DEFAULTS, state: "CA" }).cents).toBe(32.58);
    expect(rateOf({ ...RATE_DEFAULTS, rateMode: "custom", cents: 11 }).cents).toBe(11);
  });
});

describe("cost-model", () => {
  it("watts, amps and label inputs", () => {
    const w = computeCostCalc({ ...COST_DEFAULTS, watts: 1500, hours: 8, days: 30, months: 1 });
    expect(w.cost.perMonth).toBeCloseTo(360 * (US / 100), 6);
    expect(w.annual).toBe(false);
    expect(w.usCost.perMonth).toBeCloseTo(w.cost.perMonth, 9);
    const a = computeCostCalc({ ...COST_DEFAULTS, input: "amps", amps: 10, volts: 240 });
    expect(a.watts).toBe(2400);
    const l = computeCostCalc({ ...COST_DEFAULTS, input: "label", kwhYear: 500, state: "TX" });
    expect(l.annual).toBe(true);
    expect(l.cost.perYear).toBeCloseTo(500 * 0.1603, 9);
    expect(l.usCost.perYear).toBeCloseTo(500 * (US / 100), 9);
    expect(finiteDeep(computeCostCalc({ ...COST_DEFAULTS, watts: NaN, hours: NaN, qty: NaN }).cost)).toBe(true);
  });

  it("valuesForAppliance maps watt-rated and kWh/yr-rated products", () => {
    const heater = APPLIANCES.find((x) => x.id === "space-heater")!;
    expect(valuesForAppliance(heater)).toMatchObject({ appliance: "space-heater", input: "watts", watts: 1500, hours: heater.hours });
    const labelled = APPLIANCES.find((x) => x.kwhYear != null)!;
    expect(valuesForAppliance(labelled)).toEqual({ appliance: labelled.id, input: "label", kwhYear: labelled.kwhYear, qty: 1 });
    expect(computeCostCalc({ ...COST_DEFAULTS, appliance: heater.id }).appliance?.id).toBe("space-heater");
  });
});

describe("rates-model", () => {
  it("bill, rank and comparisons for a state", () => {
    const r = computeRatesCalc({ ...RATES_DEFAULTS, state: "HI", kwh: 500 });
    expect(r.rank).toBe(1);
    expect(r.cents).toBe(46.41);
    expect(r.bill).toBeCloseTo(232.05, 2);
    expect(r.vsUsPct).toBeCloseTo(((46.41 - US) / US) * 100, 9);
    const us = computeRatesCalc(RATES_DEFAULTS);
    expect(us.isUs).toBe(true);
    expect(us.rank).toBe(0);
    expect(us.avgBillNow).toBeCloseTo(stateInfo("US").kwh * (US / 100), 9);
    expect(computeRatesCalc({ ...RATES_DEFAULTS, rateMode: "month" }).cents).toBe(RATES.us.cents);
    expect(computeRatesCalc({ ...RATES_DEFAULTS, kwh: NaN }).bill).toBe(0);
  });
});

describe("space-heater-model", () => {
  it("auto season from the state's climate, or a manual months value", () => {
    expect(heaterSeason({ ...HEATER_DEFAULTS, seasonAuto: false, months: 3 })).toBe(3);
    const r = computeHeaterCalc(HEATER_DEFAULTS);
    expect(r.months).toBeGreaterThanOrEqual(1);
    expect(r.r.cost.perMonth).toBeCloseTo(1.5 * 8 * HEATER_DEFAULTS.days * (US / 100), 6);
    expect(heaterSeason({ ...HEATER_DEFAULTS, state: "FL" })).toBeLessThan(heaterSeason({ ...HEATER_DEFAULTS, state: "MN" }));
  });
});

describe("air-conditioner-model", () => {
  it("type, capacity and efficiency mapping", () => {
    expect(acType({ ...AC_DEFAULTS, type: "junk" })).toBe("central");
    expect(acCapacity(AC_DEFAULTS)).toBe(36000);
    expect(acEfficiency(AC_DEFAULTS)).toBe(14.3);
    const win = { ...AC_DEFAULTS, type: "window", btu: 8000 };
    expect(acCapacity(win)).toBe(8000);
    expect(acEfficiency(win)).toBe(WINDOW_AC[2].esCeer);
    expect(acEfficiency({ ...win, ceerMode: "min" })).toBe(16);
    expect(acEfficiency({ ...win, ceerMode: "custom", ceer: 12 })).toBe(12);
    const ms = { ...AC_DEFAULTS, type: "minisplit" };
    expect(acCapacity(ms)).toBe(12000);
    expect(acEfficiency(ms)).toBe(MINI_SPLIT.seer2);
    expect(regionMinSeer2("MN")).toBe(13.4);
    expect(regionMinSeer2("TX")).toBe(14.3);
  });

  it("computeAcCalc wires state climate and rate", () => {
    const r = computeAcCalc({ ...AC_DEFAULTS, state: "TX" });
    expect(r.rate.cents).toBe(16.03);
    expect(r.r.watts).toBeCloseTo(36000 / 14.3, 6);
    expect(r.r.annualCost).toBeGreaterThan(0);
    expect(computeAcCalc({ ...AC_DEFAULTS, usage: "custom", hours: 8, days: 365 }).r.annualHours).toBeCloseTo(2920, 6);
  });
});

describe("ev-charging-model", () => {
  it("vehicle, custom efficiency and gas price", () => {
    expect(evModel("model-y-lr")?.kwh100).toBe(27);
    expect(evModel("nope")).toBeUndefined();
    expect(evKwh100(EV_DEFAULTS)).toBe(27);
    expect(evKwh100({ ...EV_DEFAULTS, vehicle: "custom", customEff: 30 })).toBe(30);
    expect(evKwh100({ ...EV_DEFAULTS, vehicle: "custom", effUnit: "mikwh", customEff: 4 })).toBe(25);
    expect(evGasPrice({ ...EV_DEFAULTS, state: "CA" })).toBe(stateInfo("CA").gasoline);
    expect(evGasPrice({ ...EV_DEFAULTS, gasAuto: false, gasPrice: 3.5 })).toBe(3.5);
  });

  it("computeEvCalc prices miles at the state rate", () => {
    const r = computeEvCalc(EV_DEFAULTS);
    expect(r.r.kwhMonth).toBeCloseTo(270, 6);
    expect(r.r.costMonth).toBeCloseTo(270 * (US / 100), 6);
    expect(computeEvCalc({ ...EV_DEFAULTS, vehicle: "model-3-std" }).r.fullCharge?.kwh).toBeCloseTo(321 * 0.24, 6);
    expect(computeEvCalc({ ...EV_DEFAULTS, level: "l1" }).r.kwhMonth).toBeCloseTo(297, 6);
  });
});

describe("refrigerator-model", () => {
  it("sources and junk fallback", () => {
    expect(computeFridgeCalc(FRIDGE_DEFAULTS).r.kwhYear).toBe(557);
    expect(computeFridgeCalc({ ...FRIDGE_DEFAULTS, source: "junk" }).source).toBe("es");
    expect(computeFridgeCalc({ ...FRIDGE_DEFAULTS, source: "meter", meterKwh: 1.5, meterDays: 1 }).r.kwhYear).toBeCloseTo(547.5, 9);
  });
});

describe("clothes-dryer-model", () => {
  it("default ≈ DOE 283 loads a year", () => {
    const r = computeDryerCalc(DRYER_DEFAULTS);
    expect(r.kwhLoad).toBeCloseTo(607 / 283, 9);
    // 5.4 loads a week (rounded default) ≈ 282 of the 283 DOE loads
    expect(Math.abs(r.r.loadsPerYear - 283)).toBeLessThan(2);
    expect(computeDryerCalc({ ...DRYER_DEFAULTS, dryer: "custom", kwhLoad: 3 }).kwhLoad).toBe(3);
  });
});

describe("dehumidifier-model", () => {
  it("rating conversion, IEF and band", () => {
    const r = computeDehumCalc(DEHUM_DEFAULTS);
    expect(r.ief).toBe(2.02);
    expect(r.watts).toBeCloseTo(((50 * 0.4732) / 2.02 / 24) * 1000, 6);
    expect(r.band[0]).toBeLessThan(r.band[1]);
    const old = computeDehumCalc({ ...DEHUM_DEFAULTS, rating: "2012", pints: 50 });
    expect(old.pints).toBeCloseTo(30, 9);
    expect(computeDehumCalc({ ...DEHUM_DEFAULTS, kind: "wholehome" }).ief).toBe(2.38);
    const nan = computeDehumCalc({ ...DEHUM_DEFAULTS, pints: NaN, hours: NaN });
    expect(nan.watts).toBe(0);
    expect(finiteDeep(nan.cost) && finiteDeep(nan.band)).toBe(true);
  });
});

describe("pool-pump-model", () => {
  it("pump watts and variable-speed default", () => {
    expect(pumpWatts({ ...POOL_DEFAULTS, pump: "booster" })).toBe(POOL_PUMP.booster);
    expect(pumpWatts({ ...POOL_DEFAULTS, pump: "single", watts: 2000 })).toBe(2000);
    const r = computePoolCalc(POOL_DEFAULTS);
    expect(r.r.kwhDay).toBeCloseTo((786.7 * 2 + 109 * 10) / 1000, 9);
    expect(computePoolCalc({ ...POOL_DEFAULTS, pump: "single", hours: 8 }).r.kwhDay).toBeCloseTo(14, 9);
  });
});

describe("hot-tub-model", () => {
  it("kind, standby source and wiring", () => {
    expect(spaKind({ ...HOT_TUB_DEFAULTS, kind: "junk" })).toBe("standard");
    expect(standbyWatts({ ...HOT_TUB_DEFAULTS, standby: "label", labelW: 150 })).toBe(150);
    const r = computeHotTubCalc(HOT_TUB_DEFAULTS);
    expect(r.standbyW).toBeCloseTo(r.maxW, 9);
    expect(r.r.costYear).toBeGreaterThan(0);
    const indoor = computeHotTubCalc({ ...HOT_TUB_DEFAULTS, location: "indoor", indoorF: 65 });
    expect(indoor.r.kwhYear).toBeCloseTo((indoor.standbyW * 8760) / 1000, 6);
  });
});
