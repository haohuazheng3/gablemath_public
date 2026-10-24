import { ceilQty, fmt, fmtInt, fmtMoney } from "@/lib/format";
import { aggregate, PLAY_SURFACES, STONE_BAG_CUFT } from "../../families/landscaping/data";
import { defineTool } from "../types";

function stoneTool(opts: {
  key: string;
  name: string;
  id: "pea" | "river";
  depths: { value: number; label: string; sub?: string }[];
  defDepth: number;
  use: string;
}) {
  const a = aggregate(opts.id);
  return defineTool({
    key: opts.key,
    name: opts.name,
    unitToggle: true,
    defaults: { shape: "rect", l: 20, w: 10, d: opts.defDepth, extra: 10, price: a.price },
    sections: [
      {
        fields: [
          {
            kind: "segmented",
            key: "shape",
            label: "Area",
            columns: 3,
            options: [
              { value: "rect", label: "Rectangle" },
              { value: "circle", label: "Circle" },
              { value: "area", label: "Sq ft" },
            ],
          },
          { kind: "length", key: "l", label: "Length", showIf: (v) => v.shape === "rect" },
          { kind: "length", key: "w", label: "Width", showIf: (v) => v.shape === "rect" },
          { kind: "length", key: "l", label: "Diameter", showIf: (v) => v.shape === "circle" },
          { kind: "number", key: "l", label: "Area", suffix: "sq ft", step: 10, min: 0, decimals: 0, showIf: (v) => v.shape === "area" },
          { kind: "segmented", key: "d", label: "Depth", columns: opts.depths.length > 4 ? 3 : 4, options: opts.depths },
          { kind: "number", key: "extra", label: "Add for settling & uneven ground", suffix: "%", step: 5, min: 0, max: 25, decimals: 0 },
          { kind: "number", key: "price", label: "Bulk price per ton", prefix: "$", step: 5, min: 0, decimals: 2, help: a.priceNote },
        ],
      },
    ],
    compute(v) {
      const L = Number(v.l);
      const area = v.shape === "rect" ? L * Number(v.w) : v.shape === "circle" ? Math.PI * (L / 2) ** 2 : L;
      const d = Number(v.d);
      const yd = ((area * (d / 12)) / 27) * (1 + Number(v.extra) / 100);
      const tons = yd * a.tonsPerYd;
      const bags = ceilQty((yd * 27) / STONE_BAG_CUFT);
      const price = Number(v.price);
      const bulkCost = Math.ceil(tons * 2 - 1e-9) / 2 * price;
      const bagCost = a.bagPrice ? bags * a.bagPrice : 0;
      return {
        hero: { label: `${fmtInt(area)} sq ft at ${fmt(d, 1)} in deep`, value: fmt(tons, 2), unit: `tons of ${a.short}`, sub: `${fmt(yd, 2)} cubic yards · ${fmtInt(yd * 27)} cu ft · or ${fmtInt(bags)} bags of 0.5 cu ft${price > 0 ? ` · about ${fmtMoney(bulkCost)} bulk` : ""}` },
        dock: `${fmt(tons, 1)} tons`,
        stats: [
          { label: "Cubic yards", value: fmt(yd, 2), hint: `${fmt(a.tonsPerYd, 2)} tons per yard` },
          { label: "Bags (0.5 cu ft)", value: fmtInt(bags), hint: a.bagPrice ? `≈ ${fmtMoney(bagCost)} at ${fmtMoney(a.bagPrice, { cents: true })}/bag` : "About 50 lb each" },
          { label: "Coverage per ton", value: fmtInt((27 / a.tonsPerYd) * (12 / d)), unit: "sq ft", hint: `at ${fmt(d, 1)} in deep` },
          ...(price > 0 ? [{ label: "Bulk cost", value: fmtMoney(bulkCost), hint: `${fmt(Math.ceil(tons * 2) / 2, 1)} t × ${fmtMoney(price)}/t, before delivery`, emphasis: true }] : []),
        ],
        tables: [
          {
            title: "Coverage by depth",
            caption: "Tons and bags by depth",
            columns: ["Depth", "Sq ft per ton", "Tons for your area", "0.5 cu ft bags"],
            rows: opts.depths.map((o) => {
              const y = ((area * (o.value / 12)) / 27) * (1 + Number(v.extra) / 100);
              return [o.label, fmtInt((27 / a.tonsPerYd) * (12 / o.value)), fmt(y * a.tonsPerYd, 2), fmtInt(ceilQty((y * 27) / STONE_BAG_CUFT))];
            }),
            highlight: opts.depths.findIndex((o) => o.value === d),
          },
        ],
        shopping: [{ id: opts.id, name: a.name, qty: Math.round(tons * 10) / 10, unit: "tons" }],
        notes: [{ tone: "tip", text: a.bestFor }],
        summary: `${fmt(tons, 2)} tons (${fmt(yd, 2)} yd³) of ${a.short} for ${fmtInt(area)} sq ft at ${d} in`,
      };
    },
  });
}

const pea = PLAY_SURFACES.find((s) => s.id === "pea")!;
export const peaGravel = stoneTool({
  key: "landscaping/pea-gravel-calculator",
  name: "Pea Gravel Calculator",
  id: "pea",
  defDepth: 3,
  use: "paths",
  depths: [
    { value: 2, label: "2 in", sub: "top-up" },
    { value: 3, label: "3 in", sub: "paths" },
    { value: 4, label: "4 in", sub: "patios" },
    { value: pea.depthIn, label: `${pea.depthIn} in`, sub: "play area" },
    { value: 12, label: "12 in", sub: "initial fill" },
  ],
});

export const riverRock = stoneTool({
  key: "landscaping/river-rock-calculator",
  name: "River Rock Calculator",
  id: "river",
  defDepth: 3,
  use: "beds",
  depths: [
    { value: 2, label: "2 in", sub: "small stone" },
    { value: 3, label: "3 in", sub: "1–3 in rock" },
    { value: 4, label: "4 in", sub: "3–5 in rock" },
    { value: 6, label: "6 in", sub: "dry creek" },
  ],
});

// Hot-mix asphalt: 110 lb per square yard per inch of compacted mat (Asphalt Institute rule of thumb).
export const HMA_LB_PER_SY_IN = 110;

export const asphalt = defineTool({
  key: "landscaping/asphalt-calculator",
  name: "Asphalt Calculator",
  unitToggle: true,
  defaults: { l: 60, w: 12, t: 3, base: 6, price: 0 },
  sections: [
    {
      fields: [
        { kind: "length", key: "l", label: "Length" },
        { kind: "length", key: "w", label: "Width" },
        {
          kind: "segmented",
          key: "t",
          label: "Compacted asphalt thickness",
          columns: 4,
          options: [
            { value: 1.5, label: "1-1/2 in", sub: "overlay" },
            { value: 2, label: "2 in" },
            { value: 3, label: "3 in", sub: "on stone base" },
            { value: 4, label: "4 in", sub: "full depth" },
          ],
        },
        {
          kind: "segmented",
          key: "base",
          label: "Gravel base under it",
          columns: 4,
          options: [
            { value: 0, label: "None", sub: "overlay" },
            { value: 4, label: "4 in" },
            { value: 6, label: "6 in" },
            { value: 8, label: "8 in" },
          ],
        },
        { kind: "number", key: "price", label: "Asphalt price per ton (optional)", prefix: "$", step: 5, min: 0, decimals: 0 },
      ],
    },
  ],
  compute(v) {
    const sqft = Number(v.l) * Number(v.w);
    const sy = sqft / 9;
    const t = Number(v.t);
    const tons = (sy * t * HMA_LB_PER_SY_IN) / 2000;
    const baseTons = ((sqft * (Number(v.base) / 12)) / 27) * 1.33 * aggregate("crusher").tonsPerYd;
    const price = Number(v.price);
    return {
      hero: { label: `${fmtInt(sqft)} sq ft (${fmt(sy, 1)} sq yd) at ${fmt(t, 1)} in`, value: fmt(tons, 1), unit: "tons of hot-mix asphalt", sub: `${HMA_LB_PER_SY_IN} lb per sq yd per inch · ${fmt((sqft * (t / 12)) / 27, 2)} yd³ compacted${Number(v.base) ? ` · ${fmt(baseTons, 1)} tons of gravel base` : ""}${price > 0 ? ` · about ${fmtMoney(tons * price)} of asphalt` : ""}` },
      dock: `${fmt(tons, 1)} tons`,
      stats: [
        { label: "Per sq yd", value: fmtInt(HMA_LB_PER_SY_IN * t), unit: "lb", hint: `at ${fmt(t, 1)} in compacted` },
        { label: "Truckloads", value: fmtInt(ceilQty(tons / 18)), hint: "Tandem dump truck ≈ 18 tons" },
        ...(Number(v.base) ? [{ label: "Gravel base", value: fmt(baseTons, 1), unit: "tons", hint: `${v.base} in compacted crusher run` }] : []),
        { label: "Loose depth to lay", value: fmt(t / 0.75, 2), unit: "in", hint: "Compacted is about 3/4 of the loose depth" },
      ],
      tables: [
        {
          title: "Tons by thickness",
          caption: "Asphalt tons by thickness",
          columns: ["Compacted thickness", "lb per sq yd", "Tons for this area"],
          rows: [1.5, 2, 2.5, 3, 4, 5, 6].map((x) => [`${x} in`, fmtInt(HMA_LB_PER_SY_IN * x), fmt((sy * x * HMA_LB_PER_SY_IN) / 2000, 1)]),
        },
      ],
      notes: [{ tone: "info", text: "Illinois Asphalt Pavement Association guidance for driveways: 4–6 in of full-depth asphalt, or 3 in of asphalt over 6–8 in of compacted aggregate. Overlays on a sound old driveway are usually 1-1/2 to 2 in." }],
      summary: `${fmt(tons, 1)} tons of hot-mix asphalt for ${fmtInt(sqft)} sq ft at ${fmt(t, 1)} in`,
    };
  },
});

// Driveway sealer coverage per 4.75–5 gal pail, per coat (label figures): JetCoat 250–350 sq ft;
// Latex-ite sand-mix 400–500 smooth / 300–400 rough.
export const driveSealer = defineTool({
  key: "landscaping/driveway-sealer-calculator",
  name: "Driveway Sealer Calculator",
  unitToggle: true,
  defaults: { l: 60, w: 12, surf: "rough", coats: 2, cov: 0, price: 0 },
  sections: [
    {
      fields: [
        { kind: "length", key: "l", label: "Driveway length" },
        { kind: "length", key: "w", label: "Driveway width" },
        {
          kind: "segmented",
          key: "surf",
          label: "Surface",
          options: [
            { value: "smooth", label: "Smooth / sealed before", sub: "~350 sq ft per pail" },
            { value: "rough", label: "Rough, porous, older", sub: "~250 sq ft per pail" },
          ],
        },
        {
          kind: "segmented",
          key: "coats",
          label: "Coats",
          options: [
            { value: 1, label: "1 coat" },
            { value: 2, label: "2 coats" },
          ],
        },
        { kind: "number", key: "cov", label: "Your sealer's label coverage (optional)", suffix: "sq ft/pail", step: 25, min: 0, max: 1000, decimals: 0, help: "Leave at 0 to use the typical figure for your surface." },
        { kind: "number", key: "price", label: "Price per pail (optional)", prefix: "$", step: 1, min: 0, decimals: 2 },
      ],
    },
  ],
  compute(v) {
    const area = Number(v.l) * Number(v.w);
    const per = Number(v.cov) > 0 ? Number(v.cov) : v.surf === "smooth" ? 350 : 250;
    const coats = Number(v.coats);
    const pails = ceilQty((area * coats) / per);
    const price = Number(v.price);
    return {
      hero: { label: `${fmtInt(area)} sq ft driveway, ${coats} coat${coats === 1 ? "" : "s"}`, value: fmtInt(pails), unit: "pails (4.75–5 gal)", sub: `${fmtInt(per)} sq ft per pail per coat · ${fmtInt(pails * 4.75)} gal${price > 0 ? ` · ${fmtMoney(pails * price)}` : ""}` },
      dock: `${pails} pails`,
      stats: [
        { label: "Per coat", value: fmtInt(ceilQty(area / per)), unit: "pails" },
        { label: "Coverage used", value: fmtInt(per), unit: "sq ft/pail", hint: Number(v.cov) > 0 ? "From your label" : "Label range 250–500" },
        { label: "Crack filler", value: "Check", hint: "Fill cracks over 1/8 in before sealing" },
        ...(price > 0 ? [{ label: "Sealer cost", value: fmtMoney(pails * price), emphasis: true }] : []),
      ],
      tables: [
        {
          title: "Pails by driveway size (2 coats)",
          caption: "Sealer pails by driveway size",
          columns: ["Driveway", "Area", "Smooth (350)", "Rough (250)"],
          rows: [
            [20, 20],
            [40, 10],
            [50, 12],
            [60, 12],
            [100, 12],
          ].map(([l, w]) => [`${l} × ${w} ft`, `${l * w} sq ft`, fmtInt(ceilQty((l * w * 2) / 350)), fmtInt(ceilQty((l * w * 2) / 250))]),
        },
      ],
      shopping: [{ id: "sealer", name: "driveway sealer (4.75 gal pail)", qty: pails, unit: "pails", cost: price > 0 ? pails * price : undefined }],
      notes: [{ tone: "warn", text: "Asphalt sealer is for asphalt only — not concrete or pavers. Apply when it will stay above about 60°F with no rain for 48 hours, and keep cars off for a day or two." }],
      summary: `${pails} pails of driveway sealer for ${fmtInt(area)} sq ft, ${coats} coat(s)`,
    };
  },
});
