import { fmt, fmtInt, fmtMoney } from "@/lib/format";
import { RATES } from "../../families/electricity/data";
import { defineTool } from "../types";

/* ───────── shared electricity-rate field (EIA year-to-date averages) ───────── */

export const RATE_OPTIONS = [
  { value: "US", label: `U.S. average — ${fmt(RATES.us.ytdCents, 2)}¢/kWh` },
  ...[...RATES.states].sort((a, b) => a.state.localeCompare(b.state)).map((s) => ({ value: s.code, label: `${s.state} — ${fmt(s.ytdCents, 2)}¢/kWh` })),
  { value: "custom", label: "Enter my own rate" },
];

export function centsFor(state: string, custom: number): { cents: number; label: string } {
  if (state === "custom") return { cents: Math.max(0, custom), label: "your rate" };
  const row = state === "US" ? RATES.us : RATES.states.find((s) => s.code === state) ?? RATES.us;
  return { cents: row.ytdCents, label: `${row.code === "US" ? "U.S." : row.state} average, ${RATES.period} (EIA)` };
}

const rateFields = [
  { kind: "select" as const, key: "state" as const, label: "Electricity rate", options: RATE_OPTIONS, help: `EIA average residential prices, ${RATES.period}. Your bill's "price per kWh" including delivery is the most accurate number.` },
  { kind: "number" as const, key: "cents" as const, label: "Your rate", suffix: "¢/kWh", step: 0.5, min: 0, max: 100, decimals: 2, showIf: (v: Record<string, unknown>) => v.state === "custom" },
];

/* ───────── watts ↔ amps ───────── */

export const BREAKERS = [15, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 90, 100, 110, 125, 150, 175, 200];

export function ampsFrom(watts: number, volts: number, phase: string, pf: number) {
  if (phase === "three") return watts / (Math.sqrt(3) * volts * pf);
  if (phase === "dc") return watts / volts;
  return watts / (volts * pf);
}
export function wattsFrom(amps: number, volts: number, phase: string, pf: number) {
  if (phase === "three") return amps * Math.sqrt(3) * volts * pf;
  if (phase === "dc") return amps * volts;
  return amps * volts * pf;
}

export const wattsAmps = defineTool({
  key: "electricity/watts-to-amps-calculator",
  name: "Watts to Amps Calculator",
  defaults: { dir: "w2a", watts: 1500, amps: 15, volts: 120, phase: "single", pf: 1 },
  sections: [
    {
      fields: [
        {
          kind: "segmented",
          key: "dir",
          label: "Convert",
          options: [
            { value: "w2a", label: "Watts → amps" },
            { value: "a2w", label: "Amps → watts" },
          ],
        },
        { kind: "number", key: "watts", label: "Power", suffix: "W", step: 100, min: 0, decimals: 0, showIf: (v) => v.dir === "w2a" },
        { kind: "number", key: "amps", label: "Current", suffix: "A", step: 1, min: 0, decimals: 2, showIf: (v) => v.dir === "a2w" },
        {
          kind: "segmented",
          key: "volts",
          label: "Voltage",
          columns: 4,
          options: [
            { value: 12, label: "12 V" },
            { value: 120, label: "120 V" },
            { value: 208, label: "208 V" },
            { value: 240, label: "240 V" },
          ],
        },
        {
          kind: "segmented",
          key: "phase",
          label: "Circuit",
          columns: 3,
          options: [
            { value: "single", label: "AC single-phase" },
            { value: "three", label: "AC three-phase" },
            { value: "dc", label: "DC" },
          ],
        },
        { kind: "number", key: "pf", label: "Power factor", step: 0.05, min: 0.3, max: 1, decimals: 2, help: "1.0 for heaters, kettles and incandescent lights; about 0.8–0.9 for motors and compressors. Ignored for DC.", showIf: (v) => v.phase !== "dc" },
      ],
    },
  ],
  compute(v) {
    const V = Number(v.volts);
    const pf = v.phase === "dc" ? 1 : Number(v.pf);
    const w2a = v.dir === "w2a";
    const watts = w2a ? Number(v.watts) : wattsFrom(Number(v.amps), V, String(v.phase), pf);
    const amps = w2a ? ampsFrom(Number(v.watts), V, String(v.phase), pf) : Number(v.amps);
    const breaker = BREAKERS.find((b) => amps <= b * 0.8 + 1e-9);
    const formula = v.phase === "three" ? `W ÷ (1.732 × ${V} V × ${fmt(pf, 2)})` : v.phase === "dc" ? `W ÷ ${V} V` : `W ÷ (${V} V × ${fmt(pf, 2)})`;
    return {
      hero: w2a
        ? { label: `${fmtInt(watts)} W at ${V} V`, value: fmt(amps, 2), unit: "amps", sub: `amps = ${formula}${breaker && v.phase !== "dc" ? ` · continuous load fits a ${breaker} A circuit (80% rule)` : ""}` }
        : { label: `${fmt(amps, 2)} A at ${V} V`, value: fmtInt(watts), unit: "watts", sub: `${fmt(watts / 1000, 2)} kW · ${fmtInt(watts * 3.412)} BTU/h of heat if it's a heater` },
      dock: w2a ? `${fmt(amps, 1)} A` : `${fmtInt(watts)} W`,
      stats: [
        { label: "Amps", value: fmt(amps, 2) },
        { label: "Watts", value: fmtInt(watts), hint: `${fmt(watts / 1000, 3)} kW` },
        ...(v.phase !== "dc" ? [{ label: "Breaker for a continuous load", value: breaker ? `${breaker} A` : "> 200 A", hint: "Load ≤ 80% of breaker rating" }] : []),
        { label: "Same load at 240 V", value: fmt(ampsFrom(watts, 240, v.phase === "dc" ? "single" : String(v.phase), pf), 2), unit: "A", hint: "Double the voltage, half the amps" },
      ],
      tables: [
        {
          title: "Common conversions at 120 V and 240 V",
          caption: "Watts to amps table",
          columns: ["Watts", "Amps at 120 V", "Amps at 240 V"],
          rows: [100, 500, 1000, 1500, 1800, 2400, 3000, 3600, 4800, 5000].map((w) => [fmtInt(w), fmt(w / 120, 2), fmt(w / 240, 2)]),
          note: "Single-phase, power factor 1. A 15 A, 120 V circuit carries 1,800 W at most, and 1,440 W for a continuous load.",
        },
      ],
      notes: [{ tone: "info", text: "Breakers and wire are sized by an electrician to the NEC, which also accounts for wire length, ambient temperature and the type of load. Use this to check what a device will draw, not to size a circuit on its own." }],
      summary: w2a ? `${fmtInt(watts)} W at ${V} V = ${fmt(amps, 2)} A` : `${fmt(amps, 2)} A at ${V} V = ${fmtInt(watts)} W`,
    };
  },
});

/* ───────── kWh ───────── */

export const kwh = defineTool({
  key: "electricity/kwh-calculator",
  name: "kWh Calculator",
  defaults: { watts: 1000, hours: 3, days: 30, qty: 1, state: "US", cents: RATES.us.ytdCents },
  sections: [
    {
      fields: [
        { kind: "number", key: "watts", label: "Power", suffix: "W", step: 50, min: 0, decimals: 0, help: "From the label or manual. For devices that cycle (fridges, ACs) use the average draw, not the maximum." },
        { kind: "number", key: "hours", label: "Hours per day", step: 0.5, min: 0, max: 24, decimals: 2 },
        { kind: "number", key: "days", label: "Days per month", step: 1, min: 1, max: 31, decimals: 0 },
        { kind: "number", key: "qty", label: "How many", step: 1, min: 1, max: 1000, decimals: 0 },
        ...rateFields,
      ],
    },
  ],
  compute(v) {
    const kwhDay = (Number(v.watts) * Number(v.hours) * Number(v.qty)) / 1000;
    const kwhMonth = kwhDay * Number(v.days);
    const r = centsFor(String(v.state), Number(v.cents));
    const cost = (kwhMonth * r.cents) / 100;
    const shareOfAvg = kwhMonth / 870;
    return {
      hero: { label: `${fmtInt(Number(v.watts) * Number(v.qty))} W × ${fmt(Number(v.hours), 2)} h/day`, value: fmt(kwhMonth, 1), unit: "kWh per month", sub: `${fmt(kwhDay, 2)} kWh a day · ${fmtInt(kwhDay * 365)} kWh a year · ${fmtMoney(cost, { cents: true })}/month at ${fmt(r.cents, 2)}¢ (${r.label})` },
      dock: `${fmt(kwhMonth, 1)} kWh/mo`,
      stats: [
        { label: "Per day", value: fmt(kwhDay, 2), unit: "kWh", hint: fmtMoney((kwhDay * r.cents) / 100, { cents: true }) },
        { label: "Per month", value: fmt(kwhMonth, 1), unit: "kWh", hint: fmtMoney(cost, { cents: true }), emphasis: true },
        { label: "Per year", value: fmtInt((kwhDay * 365)), unit: "kWh", hint: fmtMoney((kwhDay * 365 * r.cents) / 100) },
        { label: "Share of an average home", value: `${fmt(shareOfAvg * 100, 1)}%`, hint: "U.S. homes use about 870 kWh a month (EIA)" },
      ],
      tables: [
        {
          title: "Watts to kWh: quick reference",
          caption: "kWh by watts and hours",
          columns: ["Device power", "1 hour", "8 hours a day, per month", `Monthly cost at ${fmt(r.cents, 1)}¢`],
          rows: [10, 60, 150, 500, 1000, 1500, 3000, 5000].map((w) => [`${fmtInt(w)} W`, `${fmt(w / 1000, 3)} kWh`, `${fmt((w * 8 * 30) / 1000, 1)} kWh`, fmtMoney(((w * 8 * 30) / 1000) * (r.cents / 100), { cents: true })]),
        },
      ],
      summary: `${fmt(kwhMonth, 1)} kWh/month (${fmtMoney(cost, { cents: true })}) for ${fmtInt(Number(v.watts) * Number(v.qty))} W, ${v.hours} h/day`,
    };
  },
});

/* ───────── electric bill ───────── */

// EIA: U.S. residential average 870 kWh/month and $156.53/month, 12 months to July 2026 (EIA-861M).
export const US_AVG_KWH = 870;
export const US_AVG_BILL = 156.53;

export const electricBill = defineTool({
  key: "electricity/electric-bill-calculator",
  name: "Electric Bill Calculator",
  defaults: { kwh: 870, state: "US", cents: RATES.us.ytdCents, fixed: 0, days: 30 },
  sections: [
    {
      fields: [
        { kind: "number", key: "kwh", label: "Electricity used", suffix: "kWh", step: 50, min: 0, decimals: 0, help: "On your bill as 'kWh used' or the meter reading difference. The U.S. average is about 870 kWh a month." },
        { kind: "number", key: "days", label: "Days in the billing period", step: 1, min: 1, max: 62, decimals: 0 },
        ...rateFields,
        { kind: "number", key: "fixed", label: "Fixed monthly charge (optional)", prefix: "$", step: 1, min: 0, decimals: 2, help: "The customer or service charge you pay even at zero use — printed on your bill." },
      ],
    },
  ],
  compute(v) {
    const r = centsFor(String(v.state), Number(v.cents));
    const k = Number(v.kwh);
    const energy = (k * r.cents) / 100;
    const bill = energy + Number(v.fixed);
    const perDay = bill / Number(v.days);
    return {
      hero: { label: `${fmtInt(k)} kWh at ${fmt(r.cents, 2)}¢`, value: fmtMoney(bill, { cents: true }), unit: "estimated bill", sub: `${fmtMoney(energy, { cents: true })} for energy${Number(v.fixed) ? ` + ${fmtMoney(Number(v.fixed), { cents: true })} fixed` : ""} · ${fmtMoney(perDay, { cents: true })} a day · ${fmtMoney((bill / Number(v.days)) * 365)} a year · ${r.label}` },
      dock: fmtMoney(bill, { cents: true }),
      stats: [
        { label: "Per day", value: fmtMoney(perDay, { cents: true }), hint: `${fmt(k / Number(v.days), 1)} kWh/day` },
        { label: "Per year", value: fmtMoney((bill / Number(v.days)) * 365) },
        { label: "vs. U.S. average bill", value: `${bill >= US_AVG_BILL ? "+" : "−"}${fmtMoney(Math.abs(bill - US_AVG_BILL))}`, hint: `Average $${US_AVG_BILL}/month (EIA, 12 months to Jul 2026)` },
        { label: "Effective rate", value: `${fmt(k ? (bill / k) * 100 : 0, 2)}¢`, unit: "/kWh", hint: "All-in, including the fixed charge" },
      ],
      tables: [
        {
          title: "Your bill at other usage levels",
          caption: "Bill by monthly kWh",
          columns: ["kWh per month", "Bill", "Per day"],
          rows: [300, 500, 750, 870, 1000, 1250, 1500, 2000].map((x) => {
            const b = (x * r.cents) / 100 + Number(v.fixed);
            return [fmtInt(x), fmtMoney(b, { cents: true }), fmtMoney(b / 30, { cents: true })];
          }),
          highlight: [300, 500, 750, 870, 1000, 1250, 1500, 2000].indexOf(k),
        },
      ],
      notes: [{ tone: "info", text: "Many utilities charge more per kWh above a monthly threshold, by time of day, or by season. If your bill shows tiers or peak hours, enter your blended rate: the energy charge divided by the kWh used." }],
      summary: `${fmtInt(k)} kWh at ${fmt(r.cents, 2)}¢/kWh ≈ ${fmtMoney(bill, { cents: true })}`,
    };
  },
});
