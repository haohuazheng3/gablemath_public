import { ceilQty, fmt, fmtInt, fmtMoney } from "@/lib/format";
import { defineTool } from "../types";

// Sod sizes: 16 × 24 in slabs (2.67 sq ft) on 400/450/500 sq ft pallets in the South; 10 sq ft rolls
// on 500–700 sq ft pallets in the North (Sod Solutions, The Grass Outlet).
export const SOD_FORMATS = [
  { value: "slab", label: "Slabs 16 × 24 in (2.67 sq ft)", pieceSqft: 384 / 144 },
  { value: "mini", label: "Mini rolls 18 × 40 in (5 sq ft)", pieceSqft: 5 },
  { value: "roll", label: "Rolls 2 × 5 ft (10 sq ft)", pieceSqft: 10 },
];

export const sod = defineTool({
  key: "landscaping/sod-calculator",
  name: "Sod Calculator",
  unitToggle: true,
  defaults: { mode: "dims", l: 30, w: 20, area: 600, fmt: "slab", pallet: 450, waste: 5, price: 0 },
  sections: [
    {
      fields: [
        {
          kind: "segmented",
          key: "mode",
          label: "Lawn size",
          options: [
            { value: "dims", label: "Length × width" },
            { value: "area", label: "Square feet" },
          ],
        },
        { kind: "length", key: "l", label: "Length", showIf: (v) => v.mode === "dims" },
        { kind: "length", key: "w", label: "Width", showIf: (v) => v.mode === "dims" },
        { kind: "number", key: "area", label: "Area", suffix: "sq ft", step: 50, min: 0, decimals: 0, help: "Add up several areas with the square footage calculator first.", showIf: (v) => v.mode === "area" },
        { kind: "select", key: "fmt", label: "Sod comes as", options: SOD_FORMATS.map((f) => ({ value: f.value, label: f.label })) },
        {
          kind: "segmented",
          key: "pallet",
          label: "Pallet size from your farm",
          columns: 4,
          options: [
            { value: 400, label: "400 sq ft" },
            { value: 450, label: "450 sq ft" },
            { value: 500, label: "500 sq ft" },
            { value: 600, label: "600 sq ft" },
          ],
        },
        { kind: "number", key: "waste", label: "Add for cuts & curves", suffix: "%", step: 5, min: 0, max: 20, decimals: 0, help: "5% for a rectangle, 10% around beds, trees and curved edges." },
        { kind: "number", key: "price", label: "Price per pallet (optional)", prefix: "$", step: 10, min: 0, decimals: 0 },
      ],
    },
  ],
  compute(v) {
    const area = v.mode === "dims" ? Number(v.l) * Number(v.w) : Number(v.area);
    const f = SOD_FORMATS.find((x) => x.value === v.fmt) ?? SOD_FORMATS[0];
    const order = area * (1 + Number(v.waste) / 100);
    const pieces = ceilQty(order / f.pieceSqft);
    const pallet = Number(v.pallet);
    const pallets = order / pallet;
    const fullPallets = Math.floor(pallets + 1e-9);
    const extraPieces = ceilQty((order - fullPallets * pallet) / f.pieceSqft);
    const price = Number(v.price);
    return {
      hero: { label: `${fmtInt(area)} sq ft of lawn`, value: fmt(Math.ceil(pallets * 10 - 1e-9) / 10, 1), unit: `pallets (${pallet} sq ft)`, sub: `${fmtInt(pieces)} ${f.value === "slab" ? "slabs" : "rolls"} · ${fullPallets} full pallet${fullPallets === 1 ? "" : "s"}${extraPieces ? ` + ${extraPieces} loose pieces` : ""} · ${fmtInt(area / 9)} sq yd` },
      dock: `${fmt(pallets, 1)} pallets`,
      stats: [
        { label: f.value === "slab" ? "Slabs" : "Rolls", value: fmtInt(pieces), hint: `${fmt(f.pieceSqft, 2)} sq ft each` },
        { label: "Square yards", value: fmtInt(area / 9), hint: "Some farms quote per sq yd" },
        { label: "Pallet weight", value: `${fmtInt(Math.ceil(pallets) * 1500)}–${fmtInt(Math.ceil(pallets) * 3000)}`, unit: "lb", hint: "1,500–3,000 lb per pallet, heavier when wet" },
        ...(price > 0 ? [{ label: "Sod cost", value: fmtMoney(Math.ceil(pallets) * price), hint: `${Math.ceil(pallets)} pallets × ${fmtMoney(price)}`, emphasis: true }] : [{ label: "Lay it within", value: "24 h", hint: "Sod on a pallet heats up and yellows fast" }]),
      ],
      tables: [
        {
          title: "Pallets for common lawn sizes",
          caption: "Pallets by lawn size",
          columns: ["Lawn", "Area", "400 sq ft pallets", "450", "500"],
          rows: [
            [20, 25],
            [30, 20],
            [40, 25],
            [50, 40],
            [100, 50],
          ].map(([l, w]) => {
            const a = l * w * (1 + Number(v.waste) / 100);
            return [`${l} × ${w} ft`, `${fmtInt(l * w)} sq ft`, fmt(Math.ceil((a / 400) * 10) / 10, 1), fmt(Math.ceil((a / 450) * 10) / 10, 1), fmt(Math.ceil((a / 500) * 10) / 10, 1)];
          }),
        },
      ],
      shopping: [{ id: "sod", name: `sod (${f.label.split(" (")[0].toLowerCase()})`, qty: pieces, unit: f.value === "slab" ? "slabs" : "rolls" }],
      notes: [{ tone: "tip", text: "Order sod for the day you'll lay it, with the soil already graded, amended and watered. Stagger the joints like brickwork and water within 30 minutes of laying each section." }],
      summary: `${fmt(pallets, 1)} pallets (${pieces} pieces) of sod for ${fmtInt(area)} sq ft`,
    };
  },
});

// Seeding rates, lb per 1,000 sq ft for a new lawn: Purdue AY-13-W (Kentucky bluegrass, tall fescue,
// blends), UW–Madison Extension (perennial ryegrass, fine fescue), Univ. of Kentucky (bermudagrass),
// Univ. of Arkansas MP476 (zoysiagrass, PLS).
export const SEEDS = [
  { value: "kbg", label: "Kentucky bluegrass", lo: 1.5, hi: 2, days: "14–30 days to germinate" },
  { value: "tf", label: "Tall fescue", lo: 6, hi: 9, days: "7–14 days" },
  { value: "pr", label: "Perennial ryegrass", lo: 7, hi: 9, days: "5–10 days" },
  { value: "ff", label: "Fine fescue", lo: 3.5, hi: 4.5, days: "7–14 days" },
  { value: "kbgpr", label: "Bluegrass + 10–15% ryegrass", lo: 3, hi: 4, days: "5–30 days" },
  { value: "kbgff", label: "Bluegrass + 30–50% fine fescue (shade)", lo: 4, hi: 5, days: "7–30 days" },
  { value: "berm", label: "Bermudagrass (hulled)", lo: 1, hi: 2, days: "7–14 days in warm soil" },
  { value: "zoy", label: "Zoysiagrass", lo: 1, hi: 2, days: "14–21 days in warm soil" },
];

export const grassSeed = defineTool({
  key: "landscaping/grass-seed-calculator",
  name: "Grass Seed Calculator",
  unitToggle: true,
  defaults: { mode: "dims", l: 40, w: 25, area: 1000, seed: "tf", job: "new", bag: 7 },
  sections: [
    {
      fields: [
        {
          kind: "segmented",
          key: "mode",
          label: "Lawn size",
          options: [
            { value: "dims", label: "Length × width" },
            { value: "area", label: "Square feet" },
          ],
        },
        { kind: "length", key: "l", label: "Length", showIf: (v) => v.mode === "dims" },
        { kind: "length", key: "w", label: "Width", showIf: (v) => v.mode === "dims" },
        { kind: "number", key: "area", label: "Area", suffix: "sq ft", step: 100, min: 0, decimals: 0, help: "One acre is 43,560 sq ft.", showIf: (v) => v.mode === "area" },
        { kind: "select", key: "seed", label: "Grass type", options: SEEDS.map((s) => ({ value: s.value, label: s.label })) },
        {
          kind: "segmented",
          key: "job",
          label: "Seeding",
          options: [
            { value: "new", label: "New lawn / bare soil" },
            { value: "over", label: "Overseeding thin turf" },
          ],
        },
        {
          kind: "segmented",
          key: "bag",
          label: "Bag size",
          columns: 4,
          options: [
            { value: 3, label: "3 lb" },
            { value: 7, label: "7 lb" },
            { value: 20, label: "20 lb" },
            { value: 50, label: "50 lb" },
          ],
        },
      ],
    },
  ],
  compute(v) {
    const area = v.mode === "dims" ? Number(v.l) * Number(v.w) : Number(v.area);
    const s = SEEDS.find((x) => x.value === v.seed) ?? SEEDS[1];
    const factor = v.job === "over" ? 0.5 : 1;
    const lo = (area / 1000) * s.lo * factor;
    const hi = (area / 1000) * s.hi * factor;
    const bag = Number(v.bag);
    return {
      hero: { label: `${s.label}, ${v.job === "over" ? "overseeding" : "new lawn"}`, value: `${fmt(lo, 1)}–${fmt(hi, 1)}`, unit: "lb of seed", sub: `${fmt(s.lo * factor, 2)}–${fmt(s.hi * factor, 2)} lb per 1,000 sq ft over ${fmtInt(area)} sq ft · ${ceilQty(hi / bag)} × ${bag} lb bag${ceilQty(hi / bag) === 1 ? "" : "s"} at the upper rate` },
      dock: `${fmt(hi, 1)} lb`,
      stats: [
        { label: "Rate", value: `${fmt(s.lo * factor, 2)}–${fmt(s.hi * factor, 2)}`, unit: "lb / 1,000 sq ft", hint: v.job === "over" ? "Half the new-lawn rate" : "Extension new-lawn rate" },
        { label: `${bag} lb bags`, value: fmtInt(ceilQty(hi / bag)), hint: "At the upper rate" },
        { label: "Per acre", value: `${fmtInt(s.lo * factor * 43.56)}–${fmtInt(s.hi * factor * 43.56)}`, unit: "lb" },
        { label: "Germination", value: s.days.split(" ")[0], unit: "days", hint: s.days },
      ],
      tables: [
        {
          title: "Seed for this lawn by grass type",
          caption: "Seed by grass type",
          columns: ["Grass", "New lawn", "Overseed", "Your lawn (new)"],
          rows: SEEDS.map((x) => [x.label, `${x.lo}–${x.hi} lb`, `${fmt(x.lo / 2, 2)}–${fmt(x.hi / 2, 2)} lb`, `${fmt((area / 1000) * x.lo, 1)}–${fmt((area / 1000) * x.hi, 1)} lb`]),
          highlight: SEEDS.findIndex((x) => x.value === s.value),
          note: "Rates are pounds per 1,000 sq ft. Coated seed weighs more per seed — follow the bag's rate if it's higher.",
        },
      ],
      shopping: [{ id: "seed", name: `${s.label} seed (${bag} lb)`, qty: ceilQty(hi / bag), unit: "bags" }],
      notes: [{ tone: "tip", text: "Spread half the seed in one direction and half at right angles for even coverage, rake it in about 1/4 in, and keep the top inch of soil moist until the new grass is mowed twice." }],
      summary: `${fmt(lo, 1)}–${fmt(hi, 1)} lb of ${s.label.toLowerCase()} seed for ${fmtInt(area)} sq ft`,
    };
  },
});
