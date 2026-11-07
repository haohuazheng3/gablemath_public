import { ceilQty, fmt, fmtInt, fmtMoney } from "@/lib/format";
import { defineTool } from "../types";

// Vinyl siding is sold by the square (100 sq ft); a carton of double-4 (8 in exposure) 12 ft 6 in
// panels is 24 panels = 2 squares (Owens Corning Reliance/Select, Georgia-Pacific, Alside listings).
export const SIDING = { sqftPerSquare: 100, squaresPerCarton: 2, panelFt: 12.5, trimPieceFt: 12.5, cornerPostFt: 10 };

export const siding = defineTool({
  key: "roofing/siding-calculator",
  name: "Siding Calculator",
  unitToggle: true,
  defaults: { l: 40, w: 28, h: 9, stories: 1, gables: 2, pitch: 6, doors: 2, windows: 10, garage: 0, corners: 4, waste: 10 },
  sections: [
    {
      fields: [
        { kind: "length", key: "l", label: "House length" },
        { kind: "length", key: "w", label: "House width" },
        { kind: "length", key: "h", label: "Wall height per story", help: "Ground to eave on a one-story house; about 9 ft per story is typical." },
        {
          kind: "segmented",
          key: "stories",
          label: "Stories",
          columns: 3,
          options: [
            { value: 1, label: "1" },
            { value: 1.5, label: "1-1/2" },
            { value: 2, label: "2" },
          ],
        },
        {
          kind: "segmented",
          key: "gables",
          label: "Gable ends",
          columns: 3,
          options: [
            { value: 0, label: "None (hip roof)" },
            { value: 1, label: "1" },
            { value: 2, label: "2" },
          ],
        },
        {
          kind: "select",
          key: "pitch",
          label: "Roof pitch (for gables)",
          options: [4, 5, 6, 7, 8, 9, 10, 12].map((p) => ({ value: String(p), label: `${p}/12` })),
          showIf: (v) => Number(v.gables) > 0,
        },
      ],
    },
    {
      title: "Openings, corners & waste",
      more: true,
      fields: [
        { kind: "number", key: "doors", label: "Doors", step: 1, min: 0, max: 20, decimals: 0 },
        { kind: "number", key: "windows", label: "Windows", step: 1, min: 0, max: 80, decimals: 0 },
        { kind: "number", key: "garage", label: "Garage doors (16 × 7 ft)", step: 1, min: 0, max: 4, decimals: 0 },
        { kind: "number", key: "corners", label: "Outside corners", step: 1, min: 0, max: 20, decimals: 0, help: "4 for a plain rectangle; add 2 for each bump-out." },
        { kind: "number", key: "waste", label: "Add for waste", suffix: "%", step: 5, min: 0, max: 25, decimals: 0 },
      ],
    },
  ],
  compute(v) {
    const L = Number(v.l);
    const W = Number(v.w);
    const wallH = Number(v.h) * Number(v.stories);
    const walls = 2 * (L + W) * wallH;
    const rise = Number(v.pitch) / 12;
    const gable = Number(v.gables) * (W / 2) * (W / 2) * rise;
    const openings = Number(v.doors) * 21 + Number(v.windows) * 15 + Number(v.garage) * 112;
    const net = Math.max(0, walls + gable - openings);
    const squares = (net * (1 + Number(v.waste) / 100)) / SIDING.sqftPerSquare;
    const cartons = ceilQty(squares / SIDING.squaresPerCarton);
    const perimeter = 2 * (L + W);
    const starter = ceilQty(perimeter / SIDING.trimPieceFt);
    const corners = Number(v.corners) * ceilQty(wallH / SIDING.cornerPostFt);
    const jFt = Number(v.windows) * 16 + Number(v.doors) * 17 + (Number(v.gables) ? Number(v.gables) * 2 * Math.hypot(W / 2, (W / 2) * rise) : 0);
    const jPieces = ceilQty(jFt / SIDING.trimPieceFt);
    return {
      hero: { label: `${fmtInt(net)} sq ft of wall to side`, value: fmt(Math.ceil(squares * 10 - 1e-9) / 10, 1), unit: "squares of siding", sub: `${fmtInt(cartons)} cartons of double-4 vinyl (2 squares each) · ${fmtInt(walls)} sq ft of walls${gable ? ` + ${fmtInt(gable)} sq ft of gables` : ""} − ${fmtInt(openings)} sq ft of openings + ${fmt(Number(v.waste))}%` },
      dock: `${fmt(squares, 1)} squares`,
      stats: [
        { label: "Cartons", value: fmtInt(cartons), hint: "24 panels × 12 ft 6 in = 2 squares" },
        { label: "Starter strip", value: fmtInt(starter), unit: "pcs", hint: `${fmtInt(perimeter)} ft around the base` },
        { label: "Outside corner posts", value: fmtInt(corners), unit: "pcs", hint: "10 ft posts, stacked on tall walls" },
        { label: "J-channel", value: fmtInt(jPieces), unit: "pcs", hint: `≈ ${fmtInt(jFt)} ft around windows, doors and gable rakes` },
      ],
      tables: [
        {
          caption: "Wall area breakdown",
          columns: ["Part", "Sq ft"],
          rows: [
            [`Walls: ${fmtInt(perimeter)} ft × ${fmt(wallH, 1)} ft`, fmtInt(walls)],
            [`Gables (${v.gables} at ${v.pitch}/12)`, fmtInt(gable)],
            ["Doors, windows, garage doors", `−${fmtInt(openings)}`],
            [`Waste ${fmt(Number(v.waste))}%`, `+${fmtInt(net * (Number(v.waste) / 100))}`],
            ["To order", fmtInt(net * (1 + Number(v.waste) / 100))],
          ],
        },
      ],
      shopping: [
        { id: "siding", name: "vinyl siding, double 4 (2-square carton)", qty: cartons, unit: "cartons" },
        { id: "starter", name: "starter strip 12 ft 6 in", qty: starter, unit: "pcs" },
        { id: "corners", name: "outside corner posts 10 ft", qty: corners, unit: "pcs" },
        { id: "jchan", name: "J-channel 12 ft 6 in", qty: jPieces, unit: "pcs" },
      ],
      notes: [{ tone: "info", text: "Siding is ordered in squares, but trim is what people forget: undersill trim under windows, utility trim at the soffit, and soffit and fascia if you're replacing them. Count those separately once the walls are measured." }],
      summary: `${fmt(squares, 1)} squares (${cartons} cartons) of siding for ${fmtInt(net)} sq ft of wall`,
    };
  },
});

// Gutters: one downspout per 20–30 ft of gutter is the usual guidance (40 ft as an upper limit);
// hangers every 24 in (18 in where snow loads are heavy). Installed seamless aluminum ran roughly
// $6–$13 per linear foot in 2026 cost guides (HomeWyse May 2026: $6.29–$10.45; others $9–$13).
export const gutter = defineTool({
  key: "roofing/gutter-calculator",
  name: "Gutter Calculator",
  unitToggle: true,
  defaults: { eaves: 120, h: 10, corners: 4, ends: 4, spacing: 30, snow: false, price: 9, dsPrice: 0 },
  sections: [
    {
      fields: [
        { kind: "length", key: "eaves", label: "Total length of eaves to gutter", help: "Measure along the roof edges that need gutters — usually the two long sides of a gable roof, all four sides of a hip roof." },
        { kind: "length", key: "h", label: "Eave height above ground", help: "Sets the length of each downspout." },
        { kind: "number", key: "corners", label: "Inside & outside corners (miters)", step: 1, min: 0, max: 20, decimals: 0 },
        { kind: "number", key: "ends", label: "End caps", step: 1, min: 0, max: 20, decimals: 0 },
        {
          kind: "segmented",
          key: "spacing",
          label: "One downspout every",
          columns: 3,
          options: [
            { value: 20, label: "20 ft", sub: "heavy rain" },
            { value: 30, label: "30 ft", sub: "typical" },
            { value: 40, label: "40 ft", sub: "maximum" },
          ],
        },
        { kind: "toggle", key: "snow", label: "Heavy snow area (hangers every 18 in)" },
      ],
    },
    {
      title: "Cost",
      fields: [
        { kind: "number", key: "price", label: "Installed price per foot", prefix: "$", step: 0.5, min: 0, decimals: 2, help: "Seamless aluminum ran about $6–$13 per foot installed in 2026 cost guides. Enter your quote." },
        { kind: "number", key: "dsPrice", label: "Price per downspout (optional)", prefix: "$", step: 5, min: 0, decimals: 0, help: "If your quote prices downspouts separately." },
      ],
    },
  ],
  compute(v) {
    const ft = Number(v.eaves);
    const downspouts = Math.max(1, ceilQty(ft / Number(v.spacing)));
    const dsFt = downspouts * (Number(v.h) + 2);
    const hangers = ceilQty((ft * 12) / (v.snow ? 18 : 24));
    const elbows = downspouts * 3;
    const price = Number(v.price);
    const dsPrice = Number(v.dsPrice);
    const cost = ft * price + downspouts * dsPrice;
    return {
      hero: { label: `${fmtInt(ft)} ft of gutter`, value: price > 0 ? fmtMoney(cost) : fmtInt(ft), unit: price > 0 ? "estimated installed cost" : "ft of gutter", sub: `${downspouts} downspouts (${fmtInt(dsFt)} ft) · ${hangers} hangers · ${v.corners} miters · ${v.ends} end caps${price > 0 ? ` · ${fmtMoney(price, { cents: true })}/ft` : ""}` },
      dock: price > 0 ? fmtMoney(cost) : `${fmtInt(ft)} ft`,
      stats: [
        { label: "Gutter", value: fmtInt(ft), unit: "ft", hint: "Seamless is cut to length on site" },
        { label: "Downspouts", value: fmtInt(downspouts), hint: `${fmtInt(dsFt)} ft incl. 2 ft to the splash block` },
        { label: "Hangers", value: fmtInt(hangers), hint: v.snow ? "Every 18 in" : "Every 24 in" },
        { label: "Elbows", value: fmtInt(elbows), hint: "3 per downspout (2 at the eave, 1 at the bottom)" },
        { label: "Slope", value: "1/4 in", unit: "per 10 ft", hint: "Toward each downspout outlet" },
        ...(price > 0 ? [{ label: "Cost", value: fmtMoney(cost), hint: dsPrice ? "Gutter + downspouts" : "At your per-foot price", emphasis: true }] : []),
      ],
      tables: [
        {
          title: "Installed cost at different prices",
          caption: "Gutter cost by price per foot",
          columns: ["Price per foot", "Your gutters", "150 ft house", "200 ft house"],
          rows: [6.5, 8, 10, 12, 13].map((p) => [fmtMoney(p, { cents: true }), fmtMoney(ft * p), fmtMoney(150 * p), fmtMoney(200 * p)]),
          note: "Seamless aluminum, 5 in K-style. Copper, steel, multi-story homes, guards and old-gutter removal cost more.",
        },
      ],
      shopping: [
        { id: "gutter", name: "5 in K-style gutter", qty: ceilQty(ft), unit: "ft" },
        { id: "ds", name: "2×3 in downspout", qty: ceilQty(dsFt), unit: "ft" },
        { id: "hangers", name: "hidden gutter hangers", qty: hangers, unit: "pcs" },
        { id: "elbows", name: "downspout elbows", qty: elbows, unit: "pcs" },
      ],
      notes: [{ tone: "tip", text: "Put a downspout at every corner where water can run both ways, and discharge each one at least a few feet from the foundation with an extension or splash block." }],
      summary: `${fmtInt(ft)} ft of gutter, ${downspouts} downspouts${price > 0 ? `, ≈ ${fmtMoney(cost)} installed` : ""}`,
    };
  },
});
