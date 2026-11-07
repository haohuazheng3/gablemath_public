import { ceilQty, fmt, fmtInt, fmtMoney } from "@/lib/format";
import { BATTERY_KWH, BATTERY_PER_KWH_US, BATTERY_RTE, FEDERAL } from "../../families/solar/data";
import { defineTool } from "../types";

// Usable depth of discharge by chemistry: lithium iron phosphate home batteries publish usable kWh
// (treat as 100% of the usable rating); flooded/AGM lead-acid banks are sized at 50% DoD.
export const CHEM = {
  lfp: { label: "Lithium (LFP) — usable rating", dod: 1 },
  lead: { label: "Lead-acid (AGM/flooded) — 50% depth", dod: 0.5 },
};

export const solarBattery = defineTool({
  key: "solar/solar-battery-calculator",
  name: "Solar Battery Calculator",
  defaults: { mode: "backup", daily: 10, monthly: 870, days: 1, chem: "lfp", volts: 48, ah: 200, bv: 12, load: 500 },
  sections: [
    {
      fields: [
        {
          kind: "segmented",
          key: "mode",
          label: "I want to",
          columns: 3,
          options: [
            { value: "backup", label: "Back up essentials" },
            { value: "home", label: "Cover my whole usage" },
            { value: "runtime", label: "Check a battery's runtime" },
          ],
        },
        { kind: "number", key: "daily", label: "Essential loads per day", suffix: "kWh", step: 1, min: 0, decimals: 1, help: "Fridge, lights, internet, a sump pump and a furnace fan run about 8–12 kWh a day. Use the kWh calculator to add up your own.", showIf: (v) => v.mode === "backup" },
        { kind: "number", key: "monthly", label: "Monthly use from your bill", suffix: "kWh", step: 50, min: 0, decimals: 0, help: "U.S. homes average about 870 kWh a month (EIA).", showIf: (v) => v.mode === "home" },
        { kind: "number", key: "days", label: "Days of backup", step: 0.5, min: 0.25, max: 7, decimals: 2, help: "Without solar recharging. With panels refilling the battery each day, 1 day is usually enough.", showIf: (v) => v.mode !== "runtime" },
        {
          kind: "segmented",
          key: "chem",
          label: "Battery type",
          options: [
            { value: "lfp", label: "Lithium (LFP)" },
            { value: "lead", label: "Lead-acid" },
          ],
          showIf: (v) => v.mode !== "runtime",
        },
        {
          kind: "segmented",
          key: "volts",
          label: "Bank voltage (for amp-hours)",
          columns: 3,
          options: [
            { value: 12, label: "12 V" },
            { value: 24, label: "24 V" },
            { value: 48, label: "48 V" },
          ],
          showIf: (v) => v.mode !== "runtime",
        },
        { kind: "number", key: "ah", label: "Battery capacity", suffix: "Ah", step: 10, min: 1, decimals: 0, showIf: (v) => v.mode === "runtime" },
        {
          kind: "segmented",
          key: "bv",
          label: "Battery voltage",
          columns: 3,
          options: [
            { value: 12, label: "12 V" },
            { value: 24, label: "24 V" },
            { value: 48, label: "48 V" },
          ],
          showIf: (v) => v.mode === "runtime",
        },
        { kind: "number", key: "load", label: "Load", suffix: "W", step: 50, min: 1, decimals: 0, showIf: (v) => v.mode === "runtime" },
      ],
    },
  ],
  compute(v) {
    if (v.mode === "runtime") {
      const kwhNominal = (Number(v.ah) * Number(v.bv)) / 1000;
      const lfpHours = (kwhNominal * 0.9 * 1000) / Number(v.load);
      const leadHours = (kwhNominal * 0.5 * 0.9 * 1000) / Number(v.load);
      return {
        hero: { label: `${fmtInt(Number(v.ah))} Ah × ${v.bv} V = ${fmt(kwhNominal, 2)} kWh`, value: fmt(lfpHours, 1), unit: "hours (lithium)", sub: `at ${fmtInt(Number(v.load))} W through an inverter (≈90% efficient) · ${fmt(leadHours, 1)} hours if it's lead-acid, which shouldn't go below 50%` },
        dock: `${fmt(lfpHours, 1)} h`,
        stats: [
          { label: "Stored energy", value: fmt(kwhNominal, 2), unit: "kWh" },
          { label: "Lithium runtime", value: fmt(lfpHours, 1), unit: "h" },
          { label: "Lead-acid runtime", value: fmt(leadHours, 1), unit: "h", hint: "50% depth of discharge" },
          { label: "Amps drawn from battery", value: fmt(Number(v.load) / 0.9 / Number(v.bv), 1), unit: "A" },
        ],
        summary: `${v.ah} Ah at ${v.bv} V runs ${fmtInt(Number(v.load))} W for about ${fmt(lfpHours, 1)} h (lithium)`,
      };
    }
    const daily = v.mode === "home" ? Number(v.monthly) / 30.4 : Number(v.daily);
    const chem = v.chem === "lead" ? CHEM.lead : CHEM.lfp;
    const usable = (daily * Number(v.days)) / BATTERY_RTE;
    const nominal = usable / chem.dod;
    const units = ceilQty(usable / BATTERY_KWH);
    const ah = (nominal * 1000) / Number(v.volts);
    const cost = usable * BATTERY_PER_KWH_US;
    return {
      hero: { label: `${fmt(daily, 1)} kWh/day × ${fmt(Number(v.days), 2)} day${Number(v.days) === 1 ? "" : "s"}`, value: fmt(usable, 1), unit: "kWh of usable storage", sub: `${units} home batter${units === 1 ? "y" : "ies"} of ${BATTERY_KWH} kWh · ${fmtInt(ah)} Ah at ${v.volts} V${chem.dod < 1 ? ` (${fmt(nominal, 1)} kWh nominal at 50% depth)` : ""} · ≈ ${fmtMoney(cost)} at the H1 2026 median price before incentives` },
      dock: `${fmt(usable, 1)} kWh`,
      stats: [
        { label: `${BATTERY_KWH} kWh batteries`, value: fmtInt(units), hint: "Powerwall-class units" },
        { label: "Amp-hours", value: fmtInt(ah), unit: `Ah @ ${v.volts} V`, hint: chem.label },
        { label: "Installed cost", value: fmtMoney(cost), hint: `${fmtMoney(BATTERY_PER_KWH_US)}/kWh, EnergySage H1 2026 median` },
        { label: "Federal credit", value: `${FEDERAL.credit25dPct2026}%`, hint: "25D ended for systems installed after 2025" },
      ],
      tables: [
        {
          title: "Backup days vs battery size",
          caption: "Usable kWh by days of backup",
          columns: ["Days", "Usable kWh", `${BATTERY_KWH} kWh units`, "Approx. cost"],
          rows: [0.5, 1, 2, 3].map((d) => {
            const u = (daily * d) / BATTERY_RTE;
            return [fmt(d, 1), fmt(u, 1), fmtInt(ceilQty(u / BATTERY_KWH)), fmtMoney(u * BATTERY_PER_KWH_US)];
          }),
        },
      ],
      notes: [
        { tone: "info", text: "Storage (kWh) and power (kW) are different limits. A battery that holds enough energy may still not start a central AC or well pump — check its continuous and peak kW ratings against your biggest loads." },
      ],
      summary: `${fmt(usable, 1)} kWh of usable storage (${units} × ${BATTERY_KWH} kWh) for ${fmt(daily, 1)} kWh/day × ${v.days} day(s)`,
    };
  },
});
