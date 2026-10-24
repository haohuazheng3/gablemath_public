import { ceilQty, fmt, fmtInt } from "@/lib/format";
import { defineTool } from "../types";

// Self-leveling underlayment: a 50 lb bag yields about 0.5 cu ft (MAPEI Ultraplan Easy data sheet);
// CUSTOM LevelQuik RS covers 46–48 sq ft per 50 lb bag at 1/8 in and pours up to 1-1/2 in neat.
export const SLU_CUFT_PER_50LB = 0.5;

export function sluBags(areaSqft: number, avgDepthIn: number, wastePct: number) {
  const cuft = areaSqft * (avgDepthIn / 12);
  return { cuft, bags: ceilQty((cuft / SLU_CUFT_PER_50LB) * (1 + wastePct / 100)) };
}

export const selfLeveler = defineTool({
  key: "flooring/self-leveling-concrete-calculator",
  name: "Self-Leveling Concrete Calculator",
  unitToggle: true,
  defaults: { l: 12, w: 12, mode: "avg", d: 0.25, lo: 0.125, hi: 0.5, waste: 10 },
  sections: [
    {
      fields: [
        { kind: "length", key: "l", label: "Floor length" },
        { kind: "length", key: "w", label: "Floor width" },
        {
          kind: "segmented",
          key: "mode",
          label: "Depth",
          options: [
            { value: "avg", label: "Average depth" },
            { value: "range", label: "Shallowest & deepest" },
          ],
        },
        {
          kind: "segmented",
          key: "d",
          label: "Average depth",
          columns: 5,
          showIf: (v) => v.mode === "avg",
          options: [
            { value: 0.125, label: "1/8 in" },
            { value: 0.25, label: "1/4 in" },
            { value: 0.375, label: "3/8 in" },
            { value: 0.5, label: "1/2 in" },
            { value: 1, label: "1 in" },
          ],
        },
        { kind: "length", key: "lo", label: "Shallowest point", base: "in", allowZero: true, showIf: (v) => v.mode === "range", help: "Pour at least 1/8 in over the high spots." },
        { kind: "length", key: "hi", label: "Deepest point", base: "in", showIf: (v) => v.mode === "range" },
        { kind: "number", key: "waste", label: "Add for waste & low spots", suffix: "%", step: 5, min: 0, max: 30, decimals: 0 },
      ],
    },
  ],
  compute(v) {
    const area = Number(v.l) * Number(v.w);
    const depth = v.mode === "range" ? (Math.max(0.125, Number(v.lo)) + Number(v.hi)) / 2 : Number(v.d);
    const r = sluBags(area, depth, Number(v.waste));
    const tooDeep = (v.mode === "range" ? Number(v.hi) : depth) > 1.5;
    return {
      hero: { label: `${fmtInt(area)} sq ft at ${fmt(depth, 3)} in average`, value: fmtInt(r.bags), unit: "× 50 lb bags", sub: `${fmt(r.cuft, 2)} cu ft of material + ${fmt(Number(v.waste))}% · ${fmt((SLU_CUFT_PER_50LB * 12) / depth, 0)} sq ft per bag at this depth · ${fmtInt(r.bags * 50)} lb` },
      dock: `${fmtInt(r.bags)} bags`,
      stats: [
        { label: "Coverage per bag", value: fmt((SLU_CUFT_PER_50LB * 12) / depth, 1), unit: "sq ft", hint: `at ${fmt(depth, 3)} in` },
        { label: "Weight to carry", value: fmtInt(r.bags * 50), unit: "lb" },
      ],
      tables: [
        {
          title: "Bags by depth for this floor",
          caption: "Self-leveler bags by depth",
          columns: ["Depth", "Sq ft per 50 lb bag", "Bags (+waste)"],
          rows: [0.125, 0.25, 0.375, 0.5, 0.75, 1].map((d) => [`${fmt(d, 3)} in`, fmt((SLU_CUFT_PER_50LB * 12) / d, 1), fmtInt(sluBags(area, d, Number(v.waste)).bags)]),
          highlight: [0.125, 0.25, 0.375, 0.5, 0.75, 1].indexOf(depth),
        },
      ],
      notes: [
        ...(tooDeep ? [{ tone: "warn" as const, text: "Most self-levelers pour up to about 1-1/2 in neat. Deeper fills need an extended mix with pea gravel or a different product — check the data sheet." }] : []),
        { tone: "info", text: "Prime the subfloor first with the primer the leveler's maker specifies, and add water exactly as the bag says — extra water weakens the surface and makes it dust." },
        { tone: "tip", text: "Mix one bag at a time with a paddle on a 1/2 in drill, pour in a continuous ribbon and keep a wet edge. Most levelers give you 10–15 minutes of flow." },
      ],
      shopping: [{ id: "slu", name: "self-leveling underlayment (50 lb)", qty: r.bags, unit: "bags" }],
      summary: `${r.bags} bags of self-leveler (50 lb) for ${fmtInt(area)} sq ft at ${fmt(depth, 3)} in`,
    };
  },
});

// Epoxy: theoretical coverage = 1,604 sq ft per gallon at 1 mil × volume solids ÷ film thickness (mils).
// DIY water-based kits (e.g. Rust-Oleum EpoxyShield) are labeled up to 250 sq ft per gallon on smooth
// concrete and about 125–200 on rough, porous floors.
export const SQFT_PER_GAL_AT_1MIL = 1604;

export const epoxy = defineTool({
  key: "flooring/epoxy-floor-calculator",
  name: "Epoxy Floor Calculator",
  unitToggle: true,
  defaults: { size: "2car", l: 20, w: 20, prod: "kit", surf: "smooth", solids: 100, mils: 10, coats: 1, top: true },
  sections: [
    {
      fields: [
        {
          kind: "segmented",
          key: "size",
          label: "Garage",
          columns: 4,
          options: [
            { value: "1car", label: "1-car", sub: "12×22 ft" },
            { value: "2car", label: "2-car", sub: "20×20 ft" },
            { value: "3car", label: "3-car", sub: "32×22 ft" },
            { value: "custom", label: "Custom" },
          ],
        },
        { kind: "length", key: "l", label: "Length", showIf: (v) => v.size === "custom" },
        { kind: "length", key: "w", label: "Width", showIf: (v) => v.size === "custom" },
        {
          kind: "segmented",
          key: "prod",
          label: "Product",
          options: [
            { value: "kit", label: "DIY epoxy kit", sub: "water-based, 1 gal" },
            { value: "solids", label: "Pro epoxy by mils", sub: "100% solids etc." },
          ],
        },
        {
          kind: "segmented",
          key: "surf",
          label: "Concrete surface",
          showIf: (v) => v.prod === "kit",
          options: [
            { value: "smooth", label: "Smooth, sealed", sub: "~250 sq ft/gal" },
            { value: "porous", label: "Rough, porous", sub: "~160 sq ft/gal" },
          ],
        },
        { kind: "number", key: "solids", label: "Volume solids", suffix: "%", step: 5, min: 20, max: 100, decimals: 0, showIf: (v) => v.prod === "solids", help: "On the product data sheet. 100% solids epoxy has no solvent or water to evaporate." },
        { kind: "number", key: "mils", label: "Dry film thickness per coat", suffix: "mils", step: 1, min: 2, max: 40, decimals: 0, showIf: (v) => v.prod === "solids", help: "Typical: 8–12 mils for a roll-coat base, 3–5 for a clear topcoat." },
        { kind: "number", key: "coats", label: "Coats", step: 1, min: 1, max: 4, decimals: 0 },
        { kind: "toggle", key: "top", label: "Add a clear topcoat", help: "Adds wear and chemical resistance, especially over decorative flakes." },
      ],
    },
  ],
  compute(v) {
    const dims: Record<string, [number, number]> = { "1car": [12, 22], "2car": [20, 20], "3car": [32, 22] };
    const [L, W] = v.size === "custom" ? [Number(v.l), Number(v.w)] : dims[String(v.size)];
    const area = L * W;
    const kit = v.prod === "kit";
    const perGal = kit ? (v.surf === "porous" ? 160 : 250) : (SQFT_PER_GAL_AT_1MIL * (Number(v.solids) / 100)) / Math.max(1, Number(v.mils));
    const coats = Number(v.coats);
    const gal = (area * coats) / perGal;
    const units = kit ? ceilQty(gal) : ceilQty(gal * 10) / 10;
    const topGal = v.top ? area / (SQFT_PER_GAL_AT_1MIL / 4) : 0;
    return {
      hero: kit
        ? { label: `${fmtInt(area)} sq ft garage floor`, value: fmtInt(units), unit: `× 1-gallon kit${units === 1 ? "" : "s"}`, sub: `${fmt(perGal, 0)} sq ft per gallon on ${v.surf === "porous" ? "rough, porous" : "smooth"} concrete × ${coats} coat${coats === 1 ? "" : "s"}${v.top ? ` · plus ${fmt(topGal, 1)} gal clear topcoat` : ""}` }
        : { label: `${fmtInt(area)} sq ft at ${fmt(Number(v.mils), 0)} mils`, value: fmt(gal, 1), unit: "gallons of epoxy", sub: `${fmt(perGal, 0)} sq ft per gallon (1,604 × ${fmt(Number(v.solids), 0)}% ÷ ${fmt(Number(v.mils), 0)} mils) × ${coats} coat${coats === 1 ? "" : "s"}${v.top ? ` · plus ${fmt(topGal, 1)} gal topcoat at 4 mils` : ""}` },
      dock: kit ? `${units} kits` : `${fmt(gal, 1)} gal`,
      stats: [
        { label: "Floor area", value: fmtInt(area), unit: "sq ft", hint: `${fmt(L, 1)} × ${fmt(W, 1)} ft` },
        { label: "Coverage", value: fmt(perGal, 0), unit: "sq ft/gal", hint: kit ? "Kit label coverage" : "Theoretical, before roller and surface loss" },
        ...(v.top ? [{ label: "Clear topcoat", value: fmt(topGal, 1), unit: "gal", hint: "4 mils of 100% solids clear" }] : []),
        { label: "Before you drive on it", value: "3–7 days", hint: "Varies by product and temperature — check the label" },
      ],
      notes: [
        { tone: "warn", text: "Epoxy fails on damp or dirty concrete. Tape an 18 × 18 in sheet of plastic to the floor for at least 16 hours (ASTM D4263) — if the underside is wet or the concrete darkens, moisture is coming up and the coating will peel." },
        { tone: "tip", text: "Etch or grind the floor first: the surface should feel like medium-grit sandpaper. Smooth, troweled concrete is the reason most DIY garage coatings lift under hot tires." },
      ],
      shopping: kit
        ? [{ id: "kit", name: "epoxy garage floor kit (1 gal)", qty: units, unit: "kits" }]
        : [{ id: "epoxy", name: "floor epoxy", qty: ceilQty(gal), unit: "gal" }],
      summary: kit ? `${units} one-gallon epoxy kits for a ${fmtInt(area)} sq ft garage floor` : `${fmt(gal, 1)} gal of epoxy at ${v.mils} mils for ${fmtInt(area)} sq ft`,
    };
  },
});
