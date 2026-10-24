import { fmt, fmtInt } from "@/lib/format";
import { BTU_PER_KWH } from "../../families/electricity/data";
import { defineTool } from "../types";

// ENERGY STAR room air conditioner sizing chart (8 ft ceilings) and adjustments: −10% heavily
// shaded, +10% very sunny, +600 BTU per person beyond two, +4,000 BTU in a kitchen.
export const ES_COOLING: [number, number, number][] = [
  [100, 150, 5000],
  [150, 250, 6000],
  [250, 300, 7000],
  [300, 350, 8000],
  [350, 400, 9000],
  [400, 450, 10000],
  [450, 550, 12000],
  [550, 700, 14000],
  [700, 1000, 18000],
  [1000, 1200, 21000],
  [1200, 1400, 23000],
  [1400, 1500, 24000],
  [1500, 2000, 30000],
  [2000, 2500, 34000],
];

export function esCooling(sqft: number): number {
  if (sqft <= 0) return 0;
  const row = ES_COOLING.find(([, hi]) => sqft <= hi);
  if (row) return row[2];
  return Math.round((sqft * 34000) / 2500 / 1000) * 1000; // beyond the chart: same BTU per sq ft as its top row
}

export const btu = defineTool({
  key: "electricity/btu-calculator",
  name: "BTU Calculator",
  unitToggle: true,
  defaults: { l: 15, w: 20, h: 8, sun: "normal", people: 2, kitchen: false },
  sections: [
    {
      fields: [
        { kind: "length", key: "l", label: "Room length" },
        { kind: "length", key: "w", label: "Room width" },
        { kind: "length", key: "h", label: "Ceiling height", help: "The ENERGY STAR chart assumes 8 ft ceilings; taller rooms are scaled up." },
        {
          kind: "segmented",
          key: "sun",
          label: "Sun exposure",
          columns: 3,
          options: [
            { value: "shade", label: "Heavily shaded", sub: "−10%" },
            { value: "normal", label: "Normal" },
            { value: "sunny", label: "Very sunny", sub: "+10%" },
          ],
        },
        { kind: "number", key: "people", label: "People usually in the room", step: 1, min: 1, max: 20, decimals: 0 },
        { kind: "toggle", key: "kitchen", label: "It's a kitchen", help: "Adds 4,000 BTU for cooking heat." },
      ],
    },
  ],
  compute(v) {
    const sqft = Number(v.l) * Number(v.w);
    const base = esCooling(sqft);
    const heightScale = Math.max(1, Number(v.h) / 8);
    let need = base * heightScale;
    if (v.sun === "shade") need *= 0.9;
    if (v.sun === "sunny") need *= 1.1;
    need += Math.max(0, Number(v.people) - 2) * 600;
    if (v.kitchen) need += 4000;
    const sizes = [5000, 6000, 8000, 10000, 12000, 14000, 18000, 24000];
    const unit = sizes.find((s) => s >= need - 1e-9);
    return {
      hero: { label: `${fmtInt(sqft)} sq ft room`, value: fmtInt(Math.round(need / 100) * 100), unit: "BTU/h of cooling", sub: `ENERGY STAR chart: ${fmtInt(base)} BTU for this area${heightScale > 1 ? ` × ${fmt(heightScale, 2)} for ${fmt(Number(v.h), 1)} ft ceilings` : ""}${v.sun !== "normal" ? `, ${v.sun === "sunny" ? "+" : "−"}10% for sun` : ""}${Number(v.people) > 2 ? `, +${fmtInt((Number(v.people) - 2) * 600)} for people` : ""}${v.kitchen ? ", +4,000 for a kitchen" : ""}` },
      dock: `${fmtInt(need)} BTU`,
      stats: [
        { label: "Window unit to buy", value: unit ? fmtInt(unit) : "Split system", unit: unit ? "BTU" : undefined, hint: unit ? "Next common size up" : "Over 24,000 BTU — consider a mini-split" },
        { label: "BTU per sq ft", value: fmt(need / Math.max(1, sqft), 1) },
        { label: "Tons", value: fmt(need / 12000, 2), hint: "1 ton = 12,000 BTU/h" },
        { label: "Watts of cooling", value: fmtInt(need / 3.412), hint: "Thermal, not electrical draw" },
      ],
      tables: [
        {
          title: "ENERGY STAR room AC sizing chart",
          caption: "Cooling capacity by room area",
          columns: ["Room area", "Capacity needed"],
          rows: ES_COOLING.map(([lo, hi, b]) => [`${fmtInt(lo)}–${fmtInt(hi)} sq ft`, `${fmtInt(b)} BTU/h`]),
          highlight: ES_COOLING.findIndex(([, hi]) => sqft <= hi),
        },
      ],
      notes: [{ tone: "tip", text: "Bigger isn't better: an oversized AC cools the air fast and shuts off before it removes humidity, so the room feels clammy. Pick the size closest to the result, not two sizes up." }],
      summary: `${fmtInt(need)} BTU/h of cooling for a ${fmtInt(sqft)} sq ft room`,
    };
  },
});

// Heating rule of thumb, BTU/h per sq ft (Bryant): warm climates 30–35, moderate 40–50, cold 50–60.
// Mapped to IECC climate zones: 1–2 warm, 3–4 moderate, 5–8 cold. Not a substitute for ACCA Manual J.
export const HEAT_BANDS: Record<string, [number, number, string]> = {
  "1": [30, 35, "warm"],
  "2": [30, 35, "warm"],
  "3": [40, 50, "moderate"],
  "4": [40, 50, "moderate"],
  "5": [50, 60, "cold"],
  "6": [50, 60, "cold"],
  "7": [55, 60, "cold"],
  "8": [55, 60, "cold"],
};

export const heatingBtu = defineTool({
  key: "electricity/heating-btu-calculator",
  name: "Heating BTU Calculator",
  unitToggle: true,
  defaults: { mode: "area", area: 1500, l: 15, w: 12, h: 8, zone: "4", ins: "avg", afue: 95 },
  sections: [
    {
      fields: [
        {
          kind: "segmented",
          key: "mode",
          label: "Heating",
          options: [
            { value: "area", label: "Whole house (sq ft)" },
            { value: "room", label: "One room" },
          ],
        },
        { kind: "number", key: "area", label: "Heated floor area", suffix: "sq ft", step: 100, min: 0, decimals: 0, showIf: (v) => v.mode === "area" },
        { kind: "length", key: "l", label: "Room length", showIf: (v) => v.mode === "room" },
        { kind: "length", key: "w", label: "Room width", showIf: (v) => v.mode === "room" },
        { kind: "length", key: "h", label: "Ceiling height" },
        {
          kind: "select",
          key: "zone",
          label: "Climate zone",
          options: [
            { value: "1", label: "Zone 1 — south Florida, Hawaii" },
            { value: "2", label: "Zone 2 — Gulf Coast, south Texas, Arizona deserts" },
            { value: "3", label: "Zone 3 — Southeast, Southwest, coastal California" },
            { value: "4", label: "Zone 4 — Mid-Atlantic, lower Midwest, Pacific NW" },
            { value: "5", label: "Zone 5 — northern Midwest, New England, mountains" },
            { value: "6", label: "Zone 6 — upper Midwest, northern New England" },
            { value: "7", label: "Zone 7 — northern Minnesota, high mountains" },
            { value: "8", label: "Zone 8 — Alaska interior" },
          ],
        },
        {
          kind: "segmented",
          key: "ins",
          label: "Insulation & windows",
          columns: 3,
          options: [
            { value: "good", label: "Newer, tight" },
            { value: "avg", label: "Average" },
            { value: "poor", label: "Older, drafty" },
          ],
        },
        {
          kind: "segmented",
          key: "afue",
          label: "Furnace efficiency (AFUE)",
          columns: 3,
          options: [
            { value: 80, label: "80%" },
            { value: 95, label: "95%" },
            { value: 97, label: "97%" },
          ],
        },
      ],
    },
  ],
  compute(v) {
    const sqft = v.mode === "room" ? Number(v.l) * Number(v.w) : Number(v.area);
    const [lo, hi, band] = HEAT_BANDS[String(v.zone)] ?? HEAT_BANDS["4"];
    const per = v.ins === "good" ? lo : v.ins === "poor" ? hi : (lo + hi) / 2;
    const scale = Math.max(1, Number(v.h) / 8);
    const load = sqft * per * scale;
    const afue = Number(v.afue) / 100;
    const input = load / afue;
    const furnaceSizes = [40000, 60000, 80000, 100000, 120000];
    const furnace = furnaceSizes.find((s) => s * afue >= load - 1e-9);
    return {
      hero: { label: `${fmtInt(sqft)} sq ft, zone ${v.zone} (${band} climate)`, value: fmtInt(Math.round(load / 1000) * 1000), unit: "BTU/h of heat", sub: `${fmt(per * scale, 1)} BTU per sq ft · furnace input ≈ ${fmtInt(Math.round(input / 1000) * 1000)} BTU/h at ${v.afue}% AFUE · ${fmt(load / 12000, 1)} tons of heat pump capacity at design temperature` },
      dock: `${fmtInt(load)} BTU/h`,
      stats: [
        { label: "Heat needed (output)", value: fmtInt(load), unit: "BTU/h", emphasis: true },
        { label: "Furnace input rating", value: fmtInt(input), unit: "BTU/h", hint: `Output ÷ ${v.afue}% AFUE` },
        { label: "Nearest furnace size", value: furnace ? `${fmtInt(furnace / 1000)}k` : "Over 120k", unit: furnace ? "BTU input" : undefined, hint: furnace ? `${fmtInt(furnace * afue)} BTU/h output` : "Get a Manual J" },
        { label: "Electric heat", value: fmt(load / BTU_PER_KWH, 1), unit: "kW", hint: "Resistance heaters, 3,412 BTU per kWh" },
      ],
      tables: [
        {
          title: "What a furnace size heats",
          caption: "Square feet heated by furnace size",
          columns: ["Furnace input", "Output at 80%", "Warm (30–35/sq ft)", "Moderate (40–50)", "Cold (50–60)"],
          rows: [40000, 60000, 70000, 80000, 100000, 120000].map((s) => {
            const out = s * 0.8;
            return [`${fmtInt(s / 1000)}k BTU`, fmtInt(out), `${fmtInt(out / 35)}–${fmtInt(out / 30)} sq ft`, `${fmtInt(out / 50)}–${fmtInt(out / 40)} sq ft`, `${fmtInt(out / 60)}–${fmtInt(out / 50)} sq ft`];
          }),
          note: "Rule-of-thumb ranges. Insulation, windows, air leaks and ceiling height move the real load more than floor area does.",
        },
      ],
      notes: [{ tone: "warn", text: "This is a sanity check, not a sizing method. The Department of Energy points to ACCA Manual J for heating loads, and most installed furnaces are oversized. Ask any contractor quoting a new system for the Manual J numbers." }],
      summary: `${fmtInt(load)} BTU/h of heat for ${fmtInt(sqft)} sq ft in zone ${v.zone}`,
    };
  },
});

// Generac portable generator brochure: running watts and additional starting watts per device.
export const LOADS: { key: string; label: string; run: number; start: number }[] = [
  { key: "fridge", label: "Refrigerator/freezer", run: 700, start: 2200 },
  { key: "sump", label: "Sump pump, 1/2 hp", run: 1050, start: 2150 },
  { key: "well", label: "Well pump, 1/2 hp", run: 1000, start: 2100 },
  { key: "furnace", label: "Furnace fan blower, 1/2 hp", run: 875, start: 2300 },
  { key: "wac", label: "Window AC, 12,000 BTU", run: 3250, start: 3950 },
  { key: "cac", label: "Central AC, 24,000 BTU", run: 3800, start: 4950 },
  { key: "wh", label: "Electric water heater", run: 2000, start: 1000 },
  { key: "micro", label: "Microwave, 1,000 W", run: 1000, start: 0 },
  { key: "coffee", label: "Coffee maker", run: 1500, start: 0 },
  { key: "washer", label: "Washing machine", run: 1150, start: 2300 },
  { key: "tv", label: "Television, 27 in", run: 500, start: 0 },
  { key: "computer", label: "Computer & monitor", run: 800, start: 0 },
  { key: "garage", label: "Garage door opener, 1/2 hp", run: 875, start: 2350 },
];
// Generac GP-series portable sizes from the same brochure (running / starting watts).
export const GENERATORS = [
  { run: 1800, start: 2050 },
  { run: 3250, start: 3750 },
  { run: 5500, start: 6875 },
  { run: 6500, start: 8125 },
  { run: 8000, start: 10000 },
  { run: 15000, start: 22500 },
  { run: 17500, start: 26250 },
];

export const generator = defineTool({
  key: "electricity/generator-size-calculator",
  name: "Generator Size Calculator",
  defaults: { fridge: true, sump: true, well: false, furnace: true, wac: false, cac: false, wh: false, micro: true, coffee: false, washer: false, tv: true, computer: true, garage: false, lights: 300, other: 0 },
  sections: [
    {
      title: "What must run during an outage?",
      fields: [
        ...LOADS.map((l) => ({ kind: "toggle" as const, key: l.key as "fridge", label: `${l.label} — ${fmtInt(l.run)} W${l.start ? ` (+${fmtInt(l.start)} to start)` : ""}` })),
        { kind: "number", key: "lights", label: "Lights (LED)", suffix: "W", step: 50, min: 0, decimals: 0, help: "An LED bulb is about 10 W." },
        { kind: "number", key: "other", label: "Anything else (running watts)", suffix: "W", step: 100, min: 0, decimals: 0 },
      ],
    },
  ],
  compute(v) {
    const on = LOADS.filter((l) => v[l.key as "fridge"]);
    const running = on.reduce((s, l) => s + l.run, 0) + Number(v.lights) + Number(v.other);
    const biggest = on.reduce((m, l) => (l.start > m.start ? l : m), { label: "none", start: 0, run: 0, key: "" });
    const peak = running + biggest.start;
    const pick = GENERATORS.find((g) => g.run >= running && g.start >= peak);
    return {
      hero: { label: `${on.length} appliances + ${fmtInt(Number(v.lights) + Number(v.other))} W of other loads`, value: fmtInt(peak), unit: "starting watts needed", sub: `${fmtInt(running)} running watts + ${fmtInt(biggest.start)} W to start the ${biggest.label.charAt(0).toLowerCase()}${biggest.label.slice(1)} · ${pick ? `a ${fmtInt(pick.run)} W running / ${fmtInt(pick.start)} W starting generator covers it` : "more than a portable generator — consider a standby unit or load management"}` },
      dock: `${fmtInt(peak)} W`,
      stats: [
        { label: "Running watts", value: fmtInt(running), hint: "Everything on at once" },
        { label: "Starting watts", value: fmtInt(peak), hint: "Running + the biggest motor start" },
        { label: "Generator size", value: pick ? `${fmtInt(pick.run)} W` : "Standby", hint: pick ? `${fmtInt(pick.start)} W starting` : "Over 17,500 W running", emphasis: true },
        { label: "Amps at 240 V", value: fmt(running / 240, 1), unit: "A", hint: "For transfer switch sizing" },
      ],
      tables: [
        {
          title: "Appliance wattage chart (Generac)",
          caption: "Running and starting watts",
          columns: ["Appliance", "Running W", "Additional starting W"],
          rows: LOADS.map((l) => [l.label, fmtInt(l.run), l.start ? fmtInt(l.start) : "—"]),
          note: "Approximate figures from Generac's generator guide; modern ENERGY STAR window ACs and refrigerators often draw less. The nameplate (volts × amps) is the best number.",
        },
      ],
      notes: [{ tone: "warn", text: "Never run a generator indoors, in a garage or near windows — carbon monoxide kills. Connect it to house circuits only through a transfer switch or interlock installed by an electrician." }],
      summary: `${fmtInt(running)} running / ${fmtInt(peak)} starting watts${pick ? ` → ${fmtInt(pick.run)} W generator` : ""}`,
    };
  },
});
