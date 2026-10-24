import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  acWatts,
  affinityWatts,
  annualCost,
  billFor,
  centsFor,
  computeAc,
  computeEv,
  computeFridge,
  computeHotTub,
  computeLaundry,
  computePoolPump,
  computeSpaceHeater,
  coolingHoursByMonth,
  dehumidifierIef,
  dehumidifierWatts,
  dryerKwhPerLoad,
  fmtCents,
  fridgeType,
  heatingMonthIdx,
  heatingSeasonMonths,
  heatSources,
  kwh100FromMiPerKwh,
  monthlyMeanTempF,
  pctChange,
  pintsToCurrentRating,
  rateRank,
  ratesRanked,
  resolveRate,
  spaMaxStandbyW,
  stateBySlug,
  stateInfo,
  stateRate,
  usCents,
  usageCost,
  washerKwhPerLoad,
  wattsFromAmps,
  windowSize,
  type AcInput,
  type HotTubInput,
  type PoolInput,
} from "./compute";
import { EER2_TYPICAL, EV_MODELS, LABEL_CENTS, RATES, ROOM_AC_HOURS_PER_YEAR, US_CDD_NORMAL, WINDOW_AC } from "./data";
import { STATE_INFO, US_INFO } from "./state-data";

/* Reference values from the verified research file (looked up by key so a refresh keeps the tests honest). */
const research = JSON.parse(readFileSync(join(process.cwd(), "research/electricity.verified.json"), "utf8")) as {
  parameters: { key: string; value: unknown }[];
};
const ref = (key: string): number => {
  const p = research.parameters.find((x) => x.key === key);
  if (!p || typeof p.value !== "number") throw new Error(`missing numeric research key ${key}`);
  return p.value;
};

const US = RATES.us.ytdCents;
const TX = stateInfo("TX");
const finite = (o: object) => Object.values(o).every((v) => typeof v !== "number" || Number.isFinite(v));

describe("research reference numbers", () => {
  it("U.S. year-to-date residential rate matches the EIA figure in research", () => {
    expect(RATES.us.ytdCents).toBe(ref("us_res_price_ytd"));
  });

  it("1,500 W × 8 h × 30 days at the U.S. average = 360 kWh ≈ $65.48", () => {
    const c = usageCost({ kw: ref("space_heater_high_watts") / 1000, hoursPerDay: 8, dutyPct: 100, daysPerMonth: 30, monthsPerYear: 1, qty: 1 }, US);
    expect(c.kwhMonth).toBeCloseTo(360, 6);
    expect(c.perMonth).toBeCloseTo(360 * 0.1819, 6);
    expect(c.perMonth).toBeCloseTo(65.48, 2);
  });

  it("a 1,500 W heater gives 3,412 Btu per kWh → 5,118 Btu/h", () => {
    const r = computeSpaceHeater({ watts: 1500, qty: 1, hours: 1, days: 1, duty: 100, months: 1, cents: US });
    expect(r.btuPerHour).toBeCloseTo(1.5 * ref("btu_per_kwh"), 6);
  });

  it("window AC running watts (Btu/h ÷ ENERGY STAR CEER) match research within 1 W", () => {
    for (const size of [5000, 6000, 8000, 10000, 12000, 14000, 18000, 24000]) {
      const w = acWatts(size, windowSize(size).esCeer);
      expect(Math.abs(w - ref(`window_ac_${size}_btu`)), `${size} Btu`).toBeLessThan(1);
    }
  });

  it("central AC ≈ 1,043 W per ton at EER2 11.49", () => {
    expect(Math.abs(acWatts(12000, EER2_TYPICAL) - ref("central_ac_watts_per_ton_default"))).toBeLessThan(2);
  });

  it("vented electric dryer ≈ 2.14 kWh per load; heat pump dryer 378 kWh/yr basis", () => {
    expect(Math.round(dryerKwhPerLoad("vented", 0) * 100) / 100).toBe(ref("dryer_electric_kwh_per_load"));
    expect(dryerKwhPerLoad("heatpump", 0) * 283).toBeCloseTo(ref("dryer_heat_pump_es_kwh_yr"), 6);
  });

  it("French-door fridge 557 kWh/yr at the EnergyGuide 14¢ = $77.98", () => {
    const r = computeFridge({ type: "french-door", source: "es", labelKwh: 0, meterKwh: 0, meterDays: 0, qty: 1, cents: US });
    expect(r.kwhYear).toBe(ref("fridge_bottom_freezer_french_door_kwh_yr"));
    expect(LABEL_CENTS).toBe(ref("energyguide_label_electric_rate"));
    expect(r.labelCostYear).toBeCloseTo(77.98, 2);
  });

  it("Model Y LR (27 kWh/100 mi) over 1,000 mi on Level 2 = 270 kWh", () => {
    const y = EV_MODELS.find((m) => m.id === "model-y-lr")!;
    expect(y.kwh100).toBe(ref("ev_tesla_model_y_lr_awd_kwh_per_100mi"));
    const r = computeEv({ kwh100: y.kwh100, miles: 1000, level: "l2", cents: US, gasPrice: 4, mpg: 25 });
    expect(r.kwhMonth).toBeCloseTo(270, 6);
    expect(r.costMonth).toBeCloseTo(270 * 0.1819, 6);
    // ~6.9 W idle charger ≈ 60 kWh a year
    expect(r.standbyKwhYear).toBeCloseTo((ref("evse_idle_watts") * 8760) / 1000, 0);
  });

  it("U.S. average household use is 878 kWh/month (2025)", () => {
    expect(US_INFO.kwh).toBe(ref("us_avg_monthly_kwh_2025"));
  });

  it("pool pump affinity: half speed draws one-eighth the power", () => {
    expect(affinityWatts(1000, 50)).toBeCloseTo(125, 6);
  });
});

describe("rates", () => {
  it("looks up EIA state rows and falls back to U.S.", () => {
    expect(stateRate("CA").ytdCents).toBe(32.58);
    expect(stateRate("TX").ytdCents).toBe(16.03);
    expect(stateRate("ZZ").code).toBe("US");
    expect(stateInfo("ZZ")).toBe(US_INFO);
    expect(stateBySlug("texas")?.code).toBe("TX");
    expect(stateBySlug("nowhere")).toBeUndefined();
  });

  it("centsFor picks the month or YTD column", () => {
    expect(centsFor(RATES.us, "month")).toBe(RATES.us.cents);
    expect(centsFor(RATES.us, "ytd")).toBe(RATES.us.ytdCents);
    expect(centsFor(RATES.us, "custom")).toBe(RATES.us.ytdCents);
    expect(usCents("month")).toBe(RATES.us.cents);
    expect(usCents("ytd")).toBe(RATES.us.ytdCents);
  });

  it("resolveRate handles state, month, custom and junk modes", () => {
    const tx = resolveRate({ state: "TX", rateMode: "ytd", cents: 0 });
    expect(tx).toMatchObject({ cents: 16.03, code: "TX", name: "Texas", mode: "ytd" });
    expect(tx.label).toContain("Texas average");
    expect(resolveRate({ state: "US", rateMode: "month", cents: 0 })).toMatchObject({ cents: RATES.us.cents, name: "U.S.", mode: "month" });
    expect(resolveRate({ state: "TX", rateMode: "custom", cents: 12.5 })).toMatchObject({ cents: 12.5, mode: "custom", label: "your rate" });
    expect(resolveRate({ state: "TX", rateMode: "custom", cents: -5 }).cents).toBe(0);
    expect(resolveRate({ state: "TX", rateMode: "bogus", cents: 0 }).mode).toBe("ytd");
  });

  it("ranks the 50 states + DC from most to least expensive", () => {
    const ranked = ratesRanked();
    expect(ranked).toHaveLength(51);
    for (let k = 1; k < ranked.length; k++) expect(ranked[k - 1].ytdCents).toBeGreaterThanOrEqual(ranked[k].ytdCents);
    expect(rateRank("HI")).toBe(1);
    expect(rateRank("ND")).toBe(51);
    expect(rateRank("US")).toBe(0);
    expect(ratesRanked("month")[0].cents).toBeGreaterThanOrEqual(ratesRanked("month")[50].cents);
  });

  it("pctChange, fmtCents and billFor", () => {
    expect(pctChange(110, 100)).toBeCloseTo(10, 9);
    expect(pctChange(5, 0)).toBe(0);
    expect(fmtCents(18.19)).toBe("18.19¢");
    expect(fmtCents(7)).toBe("7.00¢");
    expect(billFor(863, 18.19)).toBeCloseTo(156.98, 2);
    expect(billFor(-1, 18)).toBe(0);
    expect(billFor(NaN, 18)).toBe(0);
    expect(billFor(100, NaN)).toBe(0);
  });
});

describe("usage core", () => {
  const base = { kw: 1, hoursPerDay: 10, dutyPct: 50, daysPerMonth: 30, monthsPerYear: 12, qty: 2 };

  it("scales watts × hours × duty × qty", () => {
    const c = usageCost(base, 20);
    expect(c.kwhHour).toBeCloseTo(1, 9);
    expect(c.kwhDay).toBeCloseTo(10, 9);
    expect(c.kwhMonth).toBeCloseTo(300, 9);
    expect(c.kwhYear).toBeCloseTo(3600, 9);
    expect(c.perYear).toBeCloseTo(720, 9);
  });

  it("returns zeros for zero / negative / NaN inputs", () => {
    for (const bad of [0, -3, NaN]) {
      const c = usageCost({ ...base, kw: bad }, 20);
      expect(c.perYear).toBe(0);
      expect(usageCost(base, bad).perYear).toBe(0);
    }
    expect(finite(usageCost({ kw: NaN, hoursPerDay: NaN, dutyPct: NaN, daysPerMonth: NaN, monthsPerYear: NaN, qty: NaN }, NaN))).toBe(true);
  });

  it("clamps huge inputs to physical limits (24 h, 100% duty, 31 days, 12 months)", () => {
    const c = usageCost({ kw: 1, hoursPerDay: 1e9, dutyPct: 1e9, daysPerMonth: 1e9, monthsPerYear: 1e9, qty: 1 }, 10);
    expect(c.kwhDay).toBe(24);
    expect(c.kwhMonth).toBe(24 * 31);
    expect(c.kwhYear).toBe(24 * 31 * 12);
  });

  it("annualCost spreads a label kWh/yr over the year", () => {
    const c = annualCost(365, 20, 2);
    expect(c.kwhYear).toBe(730);
    expect(c.kwhDay).toBeCloseTo(2, 9);
    expect(c.kwhHour).toBeCloseTo(2 / 24, 9);
    expect(c.perYear).toBeCloseTo(146, 9);
    expect(annualCost(NaN, 20).perYear).toBe(0);
    expect(annualCost(100, 20, NaN).kwhYear).toBe(100);
  });

  it("wattsFromAmps", () => {
    expect(wattsFromAmps(12.5, 120)).toBe(1500);
    expect(wattsFromAmps(NaN, 240)).toBe(0);
    expect(wattsFromAmps(-1, 240)).toBe(0);
  });
});

describe("climate helpers", () => {
  it("mean temperature, heating season and cooling hours", () => {
    const temps = monthlyMeanTempF(US_INFO);
    expect(temps).toHaveLength(12);
    expect(temps[0]).toBeLessThan(temps[6]);
    const idx = heatingMonthIdx(US_INFO);
    expect(idx).toContain(0);
    expect(idx).not.toContain(6);
    expect(heatingSeasonMonths(US_INFO)).toBe(idx.length);
    for (const s of STATE_INFO) expect(heatingSeasonMonths(s)).toBeGreaterThanOrEqual(1);
    const hours = coolingHoursByMonth(US_INFO);
    const total = hours.reduce((a, b) => a + b, 0);
    expect(total).toBeCloseTo((ROOM_AC_HOURS_PER_YEAR * US_INFO.cdd.reduce((a, b) => a + b, 0)) / US_CDD_NORMAL, 6);
  });

  it("heatSources prices delivered heat per MMBtu", () => {
    const s = heatSources(US_INFO, 18.19);
    const resist = s.find((x) => x.id === "resistance")!;
    expect(resist.perMMBtu).toBeCloseTo((0.1819 * 1e6) / 3412, 6);
    expect(s.find((x) => x.id === "heat-pump")!.perMMBtu).toBeLessThan(resist.perMMBtu);
    expect(s.find((x) => x.id === "gas-80")!.perMMBtu).toBeGreaterThan(s.find((x) => x.id === "gas-95")!.perMMBtu);
    expect(s.map((x) => x.id)).toEqual(expect.arrayContaining(["propane", "oil"]));
    expect(heatSources(STATE_INFO.find((x) => x.propane == null && x.oil == null)!, 15)).toHaveLength(4);
    expect(heatSources(US_INFO, NaN)[0].perMMBtu).toBe(0);
  });
});

describe("space heaters", () => {
  it("costs, thermostat band and circuit warnings", () => {
    const r = computeSpaceHeater({ watts: 1500, qty: 1, hours: 8, days: 30, duty: 100, months: 5, cents: 20 });
    expect(r.cost.perMonth).toBeCloseTo(72, 9);
    expect(r.cost.perYear).toBeCloseTo(360, 9);
    expect(r.fullHour).toBeCloseTo(0.3, 9);
    expect(r.bandMonth[0]).toBeCloseTo(72 * 0.4, 9);
    expect(r.bandMonth[1]).toBeCloseTo(72 * 0.7, 9);
    expect(r.amps).toBeCloseTo(12.5, 9);
    expect(r.warnings).toHaveLength(1);
    expect(computeSpaceHeater({ watts: 1500, qty: 2, hours: 8, days: 30, duty: 100, months: 5, cents: 20 }).warnings[0]).toContain("2 heaters");
    expect(computeSpaceHeater({ watts: 750, qty: 1, hours: 8, days: 30, duty: 100, months: 5, cents: 20 }).warnings).toHaveLength(0);
  });

  it("is finite and zero for NaN / zero input", () => {
    const r = computeSpaceHeater({ watts: NaN, qty: NaN, hours: NaN, days: NaN, duty: NaN, months: NaN, cents: NaN });
    expect(r.cost.perYear).toBe(0);
    expect(finite(r)).toBe(true);
    expect(computeSpaceHeater({ watts: 0, qty: 1, hours: 8, days: 30, duty: 100, months: 5, cents: 20 }).cost.perYear).toBe(0);
  });
});

describe("air conditioning", () => {
  const climate: AcInput = { btuh: 36000, efficiency: 14.3, qty: 1, usage: "climate", hoursPerDay: 8, daysPerYear: 94, info: TX, cents: 16 };

  it("windowSize snaps to the nearest listed size", () => {
    expect(windowSize(8000).btu).toBe(8000);
    expect(windowSize(9000).btu).toBe(8000);
    expect(windowSize(100000).btu).toBe(WINDOW_AC[WINDOW_AC.length - 1].btu);
    expect(acWatts(8000, 0)).toBe(0);
    expect(acWatts(8000, NaN)).toBe(0);
  });

  it("climate mode spreads hours by cooling degree days; peak month is summer", () => {
    const r = computeAc(climate);
    expect(r.watts).toBeCloseTo(36000 / 14.3, 6);
    expect(r.months).toHaveLength(12);
    expect(r.annualHours).toBeCloseTo(coolingHoursByMonth(TX).reduce((a, b) => a + b, 0), 6);
    expect(r.annualCost).toBeCloseTo(r.annualKwh * 0.16, 6);
    expect(r.peak.idx).toBeGreaterThanOrEqual(5);
    expect(r.peak.idx).toBeLessThanOrEqual(8);
    expect(r.perMonth).toBe(r.peak.cost);
  });

  it("custom schedule: hours × days, 30.4-day month", () => {
    const r = computeAc({ ...climate, usage: "custom", hoursPerDay: 8, daysPerYear: 365, qty: 2 });
    expect(r.annualHours).toBeCloseTo(2920, 6);
    expect(r.watts).toBeCloseTo((2 * 36000) / 14.3, 6);
    expect(r.perMonth).toBeCloseTo(8 * (365 / 12) * (r.watts / 1000) * 0.16, 6);
  });

  it("NaN / huge inputs stay finite and clamped", () => {
    expect(finite(computeAc({ ...climate, btuh: NaN, efficiency: NaN, qty: NaN, cents: NaN }))).toBe(true);
    expect(computeAc({ ...climate, usage: "custom", hoursPerDay: 1e6, daysPerYear: 1e6 }).annualHours).toBeCloseTo(8760, 6);
  });
});

describe("EV charging", () => {
  const ev = { kwh100: 30, miles: 1000, level: "l2" as const, cents: 15, gasPrice: 4, mpg: 25 };

  it("costs, gas comparison and charge time", () => {
    const r = computeEv(ev);
    expect(r.kwhMonth).toBeCloseTo(300, 9);
    expect(r.costMonth).toBeCloseTo(45, 9);
    expect(r.costYear).toBeCloseTo(540, 9);
    expect(r.costPerMile).toBeCloseTo(0.045, 9);
    expect(r.gasMonth).toBeCloseTo(160, 9);
    expect(r.savingsMonth).toBeCloseTo(115, 9);
    expect(r.savingsYear).toBeCloseTo(1380, 9);
    expect(r.chargeHoursPerDay).toBeCloseTo(300 / (365 / 12) / (7.2 * 0.9), 9);
    expect(r.fullCharge).toBeUndefined();
    expect(computeEv({ ...ev, range: 300 }).fullCharge).toEqual({ kwh: expect.closeTo(90, 9), cost: expect.closeTo(13.5, 9) });
  });

  it("Level 1 adds 10% loss", () => {
    expect(computeEv({ ...ev, level: "l1" }).kwhMonth).toBeCloseTo(330, 9);
  });

  it("zero / NaN inputs give zeros, not NaN", () => {
    const r = computeEv({ kwh100: NaN, miles: NaN, level: "l2", cents: NaN, gasPrice: NaN, mpg: 0, range: NaN });
    expect(r.costMonth).toBe(0);
    expect(r.gasPerMile).toBe(0);
    expect(finite(r)).toBe(true);
  });

  it("kwh100FromMiPerKwh", () => {
    expect(kwh100FromMiPerKwh(4)).toBe(25);
    expect(kwh100FromMiPerKwh(0)).toBe(0);
    expect(kwh100FromMiPerKwh(NaN)).toBe(0);
  });
});

describe("hot tubs", () => {
  const tub: HotTubInput = { standbyW: 200, setpointF: 102, location: "indoor", indoorF: 65, info: US_INFO, cents: 20 };

  it("Title 20 standby limits", () => {
    expect(spaMaxStandbyW(400, "standard")).toBeCloseTo(3.75 * Math.pow(400, 2 / 3) + 40, 9);
    expect(spaMaxStandbyW(400, "inflatable")).toBeCloseTo(7 * Math.pow(400, 2 / 3), 9);
    expect(spaMaxStandbyW(NaN, "standard")).toBe(40);
  });

  it("indoor at the 37°F test gap runs at the rated standby watts all year", () => {
    const r = computeHotTub(tub);
    for (const m of r.months) expect(m.avgW).toBeCloseTo(200, 9);
    expect(r.kwhYear).toBeCloseTo((200 * 8760) / 1000, 6);
    expect(r.costYear).toBeCloseTo(r.kwhYear * 0.2, 9);
    expect(r.perMonth).toBeCloseTo(r.costYear / 12, 9);
    expect(r.perDay).toBeCloseTo(r.costYear / 365, 9);
  });

  it("outdoor: winter is the worst month; warm air above setpoint costs nothing", () => {
    const r = computeHotTub({ ...tub, location: "outdoor" });
    expect([0, 1, 11]).toContain(r.worst.idx);
    expect(computeHotTub({ ...tub, indoorF: 110 }).costYear).toBe(0);
  });

  it("NaN inputs stay finite", () => {
    expect(finite(computeHotTub({ ...tub, standbyW: NaN, setpointF: NaN, indoorF: NaN, cents: NaN }))).toBe(true);
    expect(computeHotTub({ ...tub, setpointF: NaN }).costYear).toBe(0);
  });
});

describe("refrigerators", () => {
  const f = { type: "top-freezer", source: "es" as const, labelKwh: 400, meterKwh: 1.2, meterDays: 1, qty: 1, cents: 20 };

  it("ENERGY STAR, label and meter sources", () => {
    expect(fridgeType("nope").id).toBe("french-door");
    expect(computeFridge(f).kwhYear).toBe(366);
    expect(computeFridge({ ...f, source: "label" }).kwhYear).toBe(400);
    expect(computeFridge({ ...f, source: "meter" }).kwhYear).toBeCloseTo(438, 9);
    const two = computeFridge({ ...f, qty: 2 });
    expect(two.cost.perYear).toBeCloseTo(366 * 2 * 0.2, 9);
    expect(two.esCostYear).toBeCloseTo(366 * 2 * 0.2, 9);
  });

  it("zero / NaN meter days do not divide by zero", () => {
    expect(computeFridge({ ...f, source: "meter", meterDays: 0 }).kwhYear).toBe(0);
    expect(finite(computeFridge({ ...f, source: "meter", meterDays: NaN, meterKwh: NaN, qty: NaN, cents: NaN }))).toBe(true);
  });
});

describe("laundry", () => {
  it("per-load kWh by dryer and washer type", () => {
    expect(dryerKwhPerLoad("custom", 3)).toBe(3);
    expect(dryerKwhPerLoad("custom", NaN)).toBe(0);
    expect(dryerKwhPerLoad("anything", 0)).toBe(dryerKwhPerLoad("vented", 0));
    expect(washerKwhPerLoad("front")).toBeCloseTo(102 / 295, 9);
    expect(washerKwhPerLoad("top")).toBeCloseTo(165 / 295, 9);
    expect(washerKwhPerLoad("none")).toBe(0);
  });

  it("weekly loads to monthly and yearly cost; heat pump saving", () => {
    const r = computeLaundry({ dryerKwhLoad: 2, washer: "none", loadsPerWeek: 7, cents: 20 });
    expect(r.loadsPerYear).toBeCloseTo(365, 9);
    expect(r.perLoad).toBeCloseTo(0.4, 9);
    expect(r.kwhYear).toBeCloseTo(730, 9);
    expect(r.perYear).toBeCloseTo(146, 9);
    expect(r.perMonth).toBeCloseTo(146 / 12, 9);
    expect(r.heatPumpSavingYear).toBeCloseTo((2 - 378 / 283) * 365 * 0.2, 9);
    expect(computeLaundry({ dryerKwhLoad: 0.5, washer: "front", loadsPerWeek: 5, cents: 20 }).heatPumpSavingYear).toBeLessThan(0);
  });

  it("NaN inputs give zeros", () => {
    const r = computeLaundry({ dryerKwhLoad: NaN, washer: "x", loadsPerWeek: NaN, cents: NaN });
    expect(r.perYear).toBe(0);
    expect(finite(r)).toBe(true);
  });
});

describe("dehumidifiers", () => {
  it("old-to-new pint crosswalk", () => {
    expect(pintsToCurrentRating(30)).toBeCloseTo(20, 9);
    expect(pintsToCurrentRating(50)).toBeCloseTo(30, 9);
    expect(pintsToCurrentRating(40)).toBeCloseTo(25, 9);
    expect(pintsToCurrentRating(70)).toBeCloseTo(42.5, 9);
    expect(pintsToCurrentRating(140)).toBeCloseTo(85, 9);
    expect(pintsToCurrentRating(NaN)).toBe(0);
  });

  it("IEF by mode and size (federal minimums: 1.30 / 1.60 / 2.80)", () => {
    expect(dehumidifierIef(20, false, "min", 0)).toBe(1.3);
    expect(dehumidifierIef(35, false, "min", 0)).toBe(1.6);
    expect(dehumidifierIef(60, false, "min", 0)).toBe(2.8);
    expect(dehumidifierIef(35, false, "es", 0)).toBe(2.02);
    expect(dehumidifierIef(20, false, "es", 0)).toBe(1.92);
    expect(dehumidifierIef(60, false, "es", 0)).toBe(2.8);
    expect(dehumidifierIef(90, true, "es", 0)).toBe(2.38);
    expect(dehumidifierIef(30, false, "custom", 2.5)).toBe(2.5);
    expect(dehumidifierIef(30, false, "custom", NaN)).toBe(0);
  });

  it("running watts = pints × 0.4732 ÷ IEF ÷ 24 h", () => {
    expect(dehumidifierWatts(50, 2.02)).toBeCloseTo(((50 * 0.4732) / 2.02 / 24) * 1000, 9);
    expect(dehumidifierWatts(50, 0)).toBe(0);
    expect(dehumidifierWatts(NaN, 2)).toBe(0);
  });
});

describe("pool pumps", () => {
  const vs: PoolInput = { pump: "vs", highW: 800, lowW: 100, highHours: 2, lowHours: 10, watts: 1750, hours: 8, months: 12, cents: 20 };

  it("variable speed: two-speed schedule vs single-speed baseline", () => {
    const r = computePoolPump(vs);
    expect(r.kwhDay).toBeCloseTo(2.6, 9);
    expect(r.hoursPerDay).toBe(12);
    expect(r.perDay).toBeCloseTo(0.52, 9);
    expect(r.kwhYear).toBeCloseTo(2.6 * 365, 6);
    expect(r.perYear).toBeCloseTo(2.6 * 365 * 0.2, 6);
    expect(r.singleSpeedYear).toBeCloseTo(1.75 * 12 * 365 * 0.2, 6);
  });

  it("fixed speed and clamps", () => {
    const r = computePoolPump({ ...vs, pump: "fixed", hours: 30, months: 20 });
    expect(r.hoursPerDay).toBe(24);
    expect(r.kwhDay).toBeCloseTo(1.75 * 24, 9);
    expect(r.kwhYear).toBeCloseTo(1.75 * 24 * 365, 6);
    expect(affinityWatts(1000, 200)).toBe(1000);
    expect(affinityWatts(NaN, 50)).toBe(0);
  });

  it("NaN inputs stay finite", () => {
    const nan = NaN;
    expect(finite(computePoolPump({ pump: "vs", highW: nan, lowW: nan, highHours: nan, lowHours: nan, watts: nan, hours: nan, months: nan, cents: nan }))).toBe(true);
  });
});
