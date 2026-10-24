// Pure electricity-cost math shared by the client calculators and the server-rendered answers.
// One core (watts × hours × duty × rate) feeds every appliance; appliance functions only work out
// the watts or kWh that go into it.

import {
  AFUE_HIGH,
  AFUE_OLD,
  BTU_PER_GAL_OIL,
  BTU_PER_GAL_PROPANE,
  BTU_PER_KWH,
  BTU_PER_THERM,
  CHARGE_TIME_FACTOR,
  CHARGER_KW,
  DAYS_IN_MONTH,
  DAYS_PER_MONTH,
  DAYS_PER_YEAR,
  DEHUM_ES_IEF,
  DEHUM_RATING_CROSSWALK,
  DRYER_CYCLES_PER_YEAR,
  DRYER_KWH_YEAR,
  EVSE_IDLE_W,
  FRIDGES,
  HEATING_MONTH_BELOW_F,
  HSPF2_ES_AVG,
  L1_EXTRA_LOSS,
  LABEL_CENTS,
  LITERS_PER_PINT,
  POOL_PUMP,
  RATES,
  ROOM_AC_HOURS_PER_YEAR,
  SPA,
  US_CDD_NORMAL,
  WASHER_CYCLES_PER_YEAR,
  WASHER_KWH_YEAR,
  WINDOW_AC,
  dehumMinIef,
  type StateRate,
} from "./data";
import { STATE_INFO, US_INFO, type StateInfo } from "./state-data";

/* ───────── rates ───────── */

export type RateMode = "ytd" | "month" | "custom";

export interface RateInput {
  /** "US" or a two-letter state code */
  state: string;
  rateMode: string;
  /** user's own rate in cents/kWh (rateMode "custom") */
  cents: number;
}

export interface Rate {
  cents: number;
  code: string;
  name: string;
  mode: RateMode;
  /** "Texas average, Jan–Aug 2026 (EIA)" */
  label: string;
}

export function stateRate(code: string): StateRate {
  return RATES.states.find((s) => s.code === code) ?? RATES.us;
}

export function stateInfo(code: string): StateInfo {
  return STATE_INFO.find((s) => s.code === code) ?? US_INFO;
}

export function stateBySlug(slug: string): StateInfo | undefined {
  return STATE_INFO.find((s) => s.slug === slug);
}

export function centsFor(row: StateRate, mode: RateMode): number {
  return mode === "month" ? row.cents : row.ytdCents;
}

export function resolveRate(r: RateInput): Rate {
  const row = stateRate(r.state);
  const name = row.code === "US" ? "U.S." : row.state;
  if (r.rateMode === "custom") {
    return { cents: Math.max(0, r.cents), code: row.code, name, mode: "custom", label: "your rate" };
  }
  const mode: RateMode = r.rateMode === "month" ? "month" : "ytd";
  return {
    cents: centsFor(row, mode),
    code: row.code,
    name,
    mode,
    label: mode === "month" ? `${name} average, ${RATES.monthLabel} (EIA, preliminary)` : `${name} average, ${RATES.period} (EIA)`,
  };
}

/** States + DC ordered from most to least expensive. */
export function ratesRanked(mode: RateMode = "ytd"): StateRate[] {
  return [...RATES.states].sort((a, b) => centsFor(b, mode) - centsFor(a, mode));
}

/** 1 = most expensive of the 51. */
export function rateRank(code: string, mode: RateMode = "ytd"): number {
  return ratesRanked(mode).findIndex((s) => s.code === code) + 1;
}

export function pctChange(now: number, before: number): number {
  return before > 0 ? ((now - before) / before) * 100 : 0;
}

export function fmtCents(c: number): string {
  return `${c.toFixed(2)}¢`;
}

/* ───────── the shared cost core ───────── */

export interface Usage {
  /** running power, kW */
  kw: number;
  hoursPerDay: number;
  /** percent of in-use time drawing full power */
  dutyPct: number;
  daysPerMonth: number;
  monthsPerYear: number;
  qty: number;
}

export interface Cost {
  kwhHour: number;
  kwhDay: number;
  kwhMonth: number;
  kwhYear: number;
  perHour: number;
  perDay: number;
  perMonth: number;
  perYear: number;
}

const pos = (n: number) => (Number.isFinite(n) && n > 0 ? n : 0);

function priced(kwhHour: number, kwhDay: number, kwhMonth: number, kwhYear: number, cents: number): Cost {
  const d = pos(cents) / 100;
  return { kwhHour, kwhDay, kwhMonth, kwhYear, perHour: kwhHour * d, perDay: kwhDay * d, perMonth: kwhMonth * d, perYear: kwhYear * d };
}

export function usageCost(u: Usage, cents: number): Cost {
  const avgKw = pos(u.kw) * (Math.min(100, pos(u.dutyPct)) / 100) * Math.max(1, Math.round(u.qty || 1));
  const kwhDay = avgKw * Math.min(24, pos(u.hoursPerDay));
  const kwhMonth = kwhDay * Math.min(31, pos(u.daysPerMonth));
  return priced(avgKw, kwhDay, kwhMonth, kwhMonth * Math.min(12, pos(u.monthsPerYear)), cents);
}

/** For products rated in kWh per year (EnergyGuide / ENERGY STAR); "per hour" is the round-the-clock average. */
export function annualCost(kwhYear: number, cents: number, qty = 1): Cost {
  const y = pos(kwhYear) * Math.max(1, Math.round(qty || 1));
  return priced(y / (DAYS_PER_YEAR * 24), y / DAYS_PER_YEAR, y / 12, y, cents);
}

export function wattsFromAmps(amps: number, volts: number): number {
  return pos(amps) * pos(volts);
}

/** What the same kWh would cost at the U.S. average for the same rate basis. */
export function usCents(mode: RateMode): number {
  return mode === "month" ? RATES.us.cents : RATES.us.ytdCents;
}

/* ───────── climate (NOAA CPC degree-day normals) ───────── */

/** Mean monthly temperature: HDD − CDD = days × (65°F − mean), so mean = 65 − (HDD − CDD) / days. */
export function monthlyMeanTempF(info: StateInfo): number[] {
  return info.hdd.map((h, i) => 65 - (h - info.cdd[i]) / DAYS_IN_MONTH[i]);
}

/** Months whose normal mean temperature is below 60°F (index 0 = January). */
export function heatingMonthIdx(info: StateInfo): number[] {
  return monthlyMeanTempF(info)
    .map((t, i) => ({ t, i }))
    .filter((x) => x.t < HEATING_MONTH_BELOW_F)
    .map((x) => x.i);
}

/** Heating-season length for budgeting; states with no month under 60°F get one month of occasional use. */
export function heatingSeasonMonths(info: StateInfo): number {
  return Math.max(1, heatingMonthIdx(info).length);
}

/** DOE's 750-hour room-AC year spread across months by cooling degree days and scaled to the state. */
export function coolingHoursByMonth(info: StateInfo): number[] {
  return info.cdd.map((c) => (ROOM_AC_HOURS_PER_YEAR * c) / US_CDD_NORMAL);
}

/* ───────── heat comparisons ───────── */

export interface HeatSource {
  id: string;
  label: string;
  /** USD per million Btu of delivered heat */
  perMMBtu: number;
  basis: string;
}

const MMBTU = 1_000_000;

export function heatSources(info: StateInfo, elecCents: number): HeatSource[] {
  const kwhPerMMBtu = MMBTU / BTU_PER_KWH;
  const elec = (pos(elecCents) / 100) * kwhPerMMBtu;
  const hpCop = HSPF2_ES_AVG / (BTU_PER_KWH / 1000);
  const thermsPerMMBtu = MMBTU / BTU_PER_THERM;
  const out: HeatSource[] = [
    { id: "resistance", label: "Space heater / baseboard", perMMBtu: elec, basis: "electric resistance, 100% efficient" },
    { id: "heat-pump", label: "Heat pump (ENERGY STAR avg)", perMMBtu: elec / hpCop, basis: `HSPF2 ${HSPF2_ES_AVG} ≈ seasonal COP ${hpCop.toFixed(2)}` },
    { id: "gas-95", label: "Gas furnace, 95% AFUE", perMMBtu: (info.gas * thermsPerMMBtu) / AFUE_HIGH, basis: `$${info.gas.toFixed(2)}/therm (${info.gasYear})` },
    { id: "gas-80", label: "Gas furnace, 80% AFUE", perMMBtu: (info.gas * thermsPerMMBtu) / AFUE_OLD, basis: `$${info.gas.toFixed(2)}/therm, older furnace` },
  ];
  if (info.propane != null) {
    out.push({ id: "propane", label: "Propane furnace, 95% AFUE", perMMBtu: (info.propane * (MMBTU / BTU_PER_GAL_PROPANE)) / AFUE_HIGH, basis: `$${info.propane.toFixed(2)}/gal` });
  }
  if (info.oil != null) {
    out.push({ id: "oil", label: "Oil furnace, 80% AFUE", perMMBtu: (info.oil * (MMBTU / BTU_PER_GAL_OIL)) / AFUE_OLD, basis: `$${info.oil.toFixed(2)}/gal` });
  }
  return out;
}

/* ───────── space heaters ───────── */

export interface HeaterInput {
  watts: number;
  qty: number;
  hours: number;
  days: number;
  duty: number;
  months: number;
  cents: number;
}

export interface HeaterResult {
  cost: Cost;
  /** cost of one hour at full power (thermostat never cycling) */
  fullHour: number;
  /** typical thermostat band (40–70% duty) per month */
  bandMonth: [number, number];
  btuPerHour: number;
  amps: number;
  warnings: string[];
}

export function computeSpaceHeater(i: HeaterInput): HeaterResult {
  const kw = pos(i.watts) / 1000;
  const qty = Math.max(1, Math.round(i.qty || 1));
  const base = { kw, hoursPerDay: i.hours, daysPerMonth: i.days, monthsPerYear: i.months, qty };
  const cost = usageCost({ ...base, dutyPct: i.duty }, i.cents);
  const amps = pos(i.watts) / 120;
  const warnings: string[] = [];
  if (amps * qty > 12) {
    warnings.push(
      qty > 1
        ? `${qty} heaters draw ${Math.round(amps * qty)} A together — never put two 1,500 W heaters on one 15 A household circuit; it will trip or overheat.`
        : `At ${Math.round(amps * 10) / 10} A this heater nearly fills a 15 A circuit on its own. Plug it straight into a wall outlet — no extension cords or power strips.`,
    );
  }
  return {
    cost,
    fullHour: kw * qty * (pos(i.cents) / 100),
    bandMonth: [usageCost({ ...base, dutyPct: 40 }, i.cents).perMonth, usageCost({ ...base, dutyPct: 70 }, i.cents).perMonth],
    btuPerHour: pos(i.watts) * (BTU_PER_KWH / 1000) * qty,
    amps,
    warnings,
  };
}

/* ───────── air conditioning ───────── */

export type AcType = "window" | "central" | "minisplit";

export function windowSize(btu: number) {
  return WINDOW_AC.find((w) => w.btu === btu) ?? WINDOW_AC.reduce((a, b) => (Math.abs(b.btu - btu) < Math.abs(a.btu - btu) ? b : a));
}

/** Running watts: capacity (Btu/h) ÷ efficiency (CEER, SEER2 or EER2 — all Btu per watt-hour). */
export function acWatts(btuh: number, efficiency: number): number {
  return efficiency > 0 ? pos(btuh) / efficiency : 0;
}

export interface AcInput {
  btuh: number;
  efficiency: number;
  qty: number;
  usage: "climate" | "custom";
  hoursPerDay: number;
  daysPerYear: number;
  info: StateInfo;
  cents: number;
}

export interface AcMonth {
  hours: number;
  kwh: number;
  cost: number;
}

export interface AcResult {
  watts: number;
  perHour: number;
  months: AcMonth[];
  annualHours: number;
  annualKwh: number;
  annualCost: number;
  peak: { idx: number; cost: number; hoursPerDay: number };
  /** cost of a 30-day month at the custom schedule, or the peak month in climate mode */
  perMonth: number;
}

export function computeAc(i: AcInput): AcResult {
  const qty = Math.max(1, Math.round(i.qty || 1));
  const watts = acWatts(i.btuh, i.efficiency) * qty;
  const kw = watts / 1000;
  const d = pos(i.cents) / 100;
  const hoursByMonth =
    i.usage === "climate"
      ? coolingHoursByMonth(i.info)
      : (() => {
          const annual = Math.min(24, pos(i.hoursPerDay)) * Math.min(DAYS_PER_YEAR, pos(i.daysPerYear));
          return DAYS_IN_MONTH.map((dm) => (annual * dm) / DAYS_PER_YEAR);
        })();
  const months = hoursByMonth.map((hours) => ({ hours, kwh: hours * kw, cost: hours * kw * d }));
  const annualHours = months.reduce((s, m) => s + m.hours, 0);
  const peakIdx = months.reduce((best, m, idx) => (m.cost > months[best].cost ? idx : best), 0);
  const perMonth = i.usage === "climate" ? months[peakIdx].cost : Math.min(24, pos(i.hoursPerDay)) * DAYS_PER_MONTH * kw * d;
  return {
    watts,
    perHour: kw * d,
    months,
    annualHours,
    annualKwh: annualHours * kw,
    annualCost: annualHours * kw * d,
    peak: { idx: peakIdx, cost: months[peakIdx].cost, hoursPerDay: months[peakIdx].hours / DAYS_IN_MONTH[peakIdx] },
    perMonth,
  };
}

/* ───────── EV charging ───────── */

export interface EvInput {
  kwh100: number;
  miles: number;
  level: "l1" | "l2";
  cents: number;
  gasPrice: number;
  mpg: number;
  range?: number;
}

export interface EvResult {
  kwhMonth: number;
  costMonth: number;
  costYear: number;
  costPerMile: number;
  kwhPerDay: number;
  chargeHoursPerDay: number;
  gasMonth: number;
  gasPerMile: number;
  savingsMonth: number;
  savingsYear: number;
  fullCharge?: { kwh: number; cost: number };
  standbyKwhYear: number;
}

export function computeEv(i: EvInput): EvResult {
  const loss = i.level === "l1" ? 1 + L1_EXTRA_LOSS : 1;
  const kwhPerMile = (pos(i.kwh100) / 100) * loss;
  const d = pos(i.cents) / 100;
  const miles = pos(i.miles);
  const kwhMonth = kwhPerMile * miles;
  const kwhPerDay = kwhMonth / DAYS_PER_MONTH;
  const gasPerMile = i.mpg > 0 ? pos(i.gasPrice) / i.mpg : 0;
  const costMonth = kwhMonth * d;
  const gasMonth = gasPerMile * miles;
  return {
    kwhMonth,
    costMonth,
    costYear: costMonth * 12,
    costPerMile: kwhPerMile * d,
    kwhPerDay,
    chargeHoursPerDay: kwhPerDay / (CHARGER_KW[i.level] * CHARGE_TIME_FACTOR),
    gasMonth,
    gasPerMile,
    savingsMonth: gasMonth - costMonth,
    savingsYear: (gasMonth - costMonth) * 12,
    fullCharge: i.range ? { kwh: i.range * kwhPerMile, cost: i.range * kwhPerMile * d } : undefined,
    standbyKwhYear: (EVSE_IDLE_W * DAYS_PER_YEAR * 24) / 1000,
  };
}

/** mi/kWh ↔ kWh/100 mi */
export function kwh100FromMiPerKwh(miPerKwh: number): number {
  return miPerKwh > 0 ? 100 / miPerKwh : 0;
}

/* ───────── hot tubs ───────── */

export type SpaKind = "standard" | "inflatable";

/** California Title 20 maximum normalized standby power for a spa of this fill volume. */
export function spaMaxStandbyW(gallons: number, kind: SpaKind): number {
  const v23 = Math.pow(pos(gallons), 2 / 3);
  return kind === "inflatable" ? SPA.inflatableCoef * v23 : SPA.standardCoef * v23 + SPA.standardAdd;
}

export interface HotTubInput {
  /** normalized standby watts (at a 37°F water–air difference) */
  standbyW: number;
  setpointF: number;
  location: "outdoor" | "indoor";
  indoorF: number;
  info: StateInfo;
  cents: number;
}

export interface HotTubMonth {
  airF: number;
  avgW: number;
  kwh: number;
  cost: number;
}

export interface HotTubResult {
  months: HotTubMonth[];
  kwhYear: number;
  costYear: number;
  perMonth: number;
  perDay: number;
  worst: { idx: number; cost: number };
}

/** Heat loss through cover and shell is proportional to the water–air temperature difference. */
export function computeHotTub(i: HotTubInput): HotTubResult {
  const temps = i.location === "indoor" ? DAYS_IN_MONTH.map(() => i.indoorF) : monthlyMeanTempF(i.info);
  const d = pos(i.cents) / 100;
  const months = temps.map((airF, m) => {
    const avgW = pos(i.standbyW) * (pos(i.setpointF - airF) / SPA.testDeltaF);
    const kwh = (avgW * DAYS_IN_MONTH[m] * 24) / 1000;
    return { airF, avgW, kwh, cost: kwh * d };
  });
  const kwhYear = months.reduce((s, m) => s + m.kwh, 0);
  const worstIdx = months.reduce((best, m, idx) => (m.cost > months[best].cost ? idx : best), 0);
  return {
    months,
    kwhYear,
    costYear: kwhYear * d,
    perMonth: (kwhYear * d) / 12,
    perDay: (kwhYear * d) / DAYS_PER_YEAR,
    worst: { idx: worstIdx, cost: months[worstIdx].cost },
  };
}

/* ───────── refrigerators ───────── */

export function fridgeType(id: string) {
  return FRIDGES.find((f) => f.id === id) ?? FRIDGES[0];
}

export interface FridgeInput {
  type: string;
  source: "es" | "label" | "meter";
  labelKwh: number;
  meterKwh: number;
  meterDays: number;
  qty: number;
  cents: number;
}

export interface FridgeResult {
  kwhYear: number;
  cost: Cost;
  /** what the EnergyGuide label's 14¢ assumption would say */
  labelCostYear: number;
  /** yearly cost of the ENERGY STAR average of the same type */
  esCostYear: number;
}

export function computeFridge(i: FridgeInput): FridgeResult {
  const t = fridgeType(i.type);
  const kwhYear =
    i.source === "label" ? pos(i.labelKwh) : i.source === "meter" ? (i.meterDays > 0 ? (pos(i.meterKwh) / i.meterDays) * DAYS_PER_YEAR : 0) : t.kwhYear;
  const qty = Math.max(1, Math.round(i.qty || 1));
  return {
    kwhYear,
    cost: annualCost(kwhYear, i.cents, qty),
    labelCostYear: kwhYear * qty * (LABEL_CENTS / 100),
    esCostYear: t.kwhYear * qty * (pos(i.cents) / 100),
  };
}

/* ───────── laundry ───────── */

export function dryerKwhPerLoad(type: string, custom: number): number {
  if (type === "heatpump") return DRYER_KWH_YEAR.heatpump / DRYER_CYCLES_PER_YEAR;
  if (type === "custom") return pos(custom);
  return DRYER_KWH_YEAR.vented / DRYER_CYCLES_PER_YEAR;
}

export function washerKwhPerLoad(washer: string): number {
  if (washer === "front") return WASHER_KWH_YEAR.front / WASHER_CYCLES_PER_YEAR;
  if (washer === "top") return WASHER_KWH_YEAR.top / WASHER_CYCLES_PER_YEAR;
  return 0;
}

export interface LaundryInput {
  dryerKwhLoad: number;
  washer: string;
  loadsPerWeek: number;
  cents: number;
}

export interface LaundryResult {
  dryerPerLoad: number;
  washerPerLoad: number;
  perLoad: number;
  loadsPerYear: number;
  perMonth: number;
  perYear: number;
  kwhYear: number;
  /** yearly saving of an ENERGY STAR heat pump dryer vs this dryer (negative if this one is better) */
  heatPumpSavingYear: number;
}

export function computeLaundry(i: LaundryInput): LaundryResult {
  const d = pos(i.cents) / 100;
  const loadsPerYear = pos(i.loadsPerWeek) * (DAYS_PER_YEAR / 7);
  const dryerKwh = pos(i.dryerKwhLoad);
  const washerKwh = washerKwhPerLoad(i.washer);
  const kwhYear = (dryerKwh + washerKwh) * loadsPerYear;
  return {
    dryerPerLoad: dryerKwh * d,
    washerPerLoad: washerKwh * d,
    perLoad: (dryerKwh + washerKwh) * d,
    loadsPerYear,
    perMonth: (kwhYear * d) / 12,
    perYear: kwhYear * d,
    kwhYear,
    heatPumpSavingYear: (dryerKwh - dryerKwhPerLoad("heatpump", 0)) * loadsPerYear * d,
  };
}

/* ───────── dehumidifiers ───────── */

/** Converts a pre-2019 (80°F test) pint rating to today's 65°F rating via ENERGY STAR's crosswalk. */
export function pintsToCurrentRating(oldPints: number): number {
  const pts = [{ old: 0, now: 0 }, ...DEHUM_RATING_CROSSWALK];
  const p = pos(oldPints);
  for (let k = 1; k < pts.length; k++) {
    if (p <= pts[k].old) {
      const a = pts[k - 1];
      const b = pts[k];
      return a.now + ((p - a.old) * (b.now - a.now)) / (b.old - a.old);
    }
  }
  const last = pts[pts.length - 1];
  return (p * last.now) / last.old;
}

/** Running watts from capacity and Integrated Energy Factor: pints × 0.4732 L ÷ IEF (L/kWh) over 24 h. */
export function dehumidifierWatts(pintsPerDay: number, ief: number): number {
  return ief > 0 ? ((pos(pintsPerDay) * LITERS_PER_PINT) / ief / 24) * 1000 : 0;
}

export function dehumidifierIef(pints: number, wholeHome: boolean, mode: string, custom: number): number {
  if (mode === "custom") return pos(custom);
  if (mode === "min") return dehumMinIef(pints, wholeHome);
  if (wholeHome) return DEHUM_ES_IEF.wholeHome;
  // Above 50 pints the federal minimum (2.80) already beats the ENERGY STAR >30-pint average.
  if (pints > 50) return dehumMinIef(pints, false);
  return pints > 30 ? DEHUM_ES_IEF.portableLarge : DEHUM_ES_IEF.portableAll;
}

/* ───────── pool pumps ───────── */

/** Pump affinity law: power scales with the cube of speed (ENERGY STAR: half speed → one-eighth). */
export function affinityWatts(fullSpeedW: number, speedPct: number): number {
  return pos(fullSpeedW) * Math.pow(Math.min(100, pos(speedPct)) / 100, 3);
}

export interface PoolInput {
  pump: string;
  highW: number;
  lowW: number;
  highHours: number;
  lowHours: number;
  watts: number;
  hours: number;
  months: number;
  cents: number;
}

export interface PoolResult {
  kwhDay: number;
  perDay: number;
  perMonth: number;
  perYear: number;
  kwhYear: number;
  hoursPerDay: number;
  /** same daily hours with a 1.5 hp single-speed pump */
  singleSpeedYear: number;
}

export function computePoolPump(i: PoolInput): PoolResult {
  const vs = i.pump === "vs";
  const hoursPerDay = vs ? Math.min(24, pos(i.highHours) + pos(i.lowHours)) : Math.min(24, pos(i.hours));
  const kwhDay = vs ? (pos(i.highW) * pos(i.highHours) + pos(i.lowW) * pos(i.lowHours)) / 1000 : (pos(i.watts) * hoursPerDay) / 1000;
  const d = pos(i.cents) / 100;
  const months = Math.min(12, pos(i.months));
  const kwhYear = kwhDay * DAYS_PER_MONTH * months;
  return {
    kwhDay,
    perDay: kwhDay * d,
    perMonth: kwhDay * DAYS_PER_MONTH * d,
    perYear: kwhYear * d,
    kwhYear,
    hoursPerDay,
    singleSpeedYear: ((POOL_PUMP.singleSpeed * hoursPerDay) / 1000) * DAYS_PER_MONTH * months * d,
  };
}

/* ───────── bills ───────── */

export function billFor(kwh: number, cents: number): number {
  return pos(kwh) * (pos(cents) / 100);
}
