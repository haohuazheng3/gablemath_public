import { ceilQty, fmt, fmtInt, fmtMoney } from "@/lib/format";
import { aggregate, PAVER_USES } from "../../families/landscaping/data";
import { defineTool } from "../types";

// Paver face sizes (in). Count per sq ft = 144 ÷ (length × width); joints are 1/16–1/8 in sand-filled.
export const PAVERS = [
  { value: "4x8", label: "4 × 8 in (brick paver)", w: 4, l: 8 },
  { value: "6x6", label: "6 × 6 in", w: 6, l: 6 },
  { value: "6x9", label: "6 × 9 in", w: 6, l: 9 },
  { value: "6x12", label: "6 × 12 in", w: 6, l: 12 },
  { value: "12x12", label: "12 × 12 in", w: 12, l: 12 },
  { value: "16x16", label: "16 × 16 in", w: 16, l: 16 },
  { value: "24x24", label: "24 × 24 in", w: 24, l: 24 },
];

export const pavers = defineTool({
  key: "landscaping/paver-calculator",
  name: "Paver Calculator",
  unitToggle: true,
  defaults: { shape: "rect", l: 12, w: 12, area: 144, size: "6x9", use: "patio", waste: 10, edge: true, price: 0 },
  sections: [
    {
      fields: [
        {
          kind: "segmented",
          key: "shape",
          label: "Area",
          options: [
            { value: "rect", label: "Length × width" },
            { value: "area", label: "Square feet" },
          ],
        },
        { kind: "length", key: "l", label: "Length", showIf: (v) => v.shape === "rect" },
        { kind: "length", key: "w", label: "Width", showIf: (v) => v.shape === "rect" },
        { kind: "number", key: "area", label: "Area", suffix: "sq ft", step: 10, min: 0, decimals: 0, showIf: (v) => v.shape === "area" },
        { kind: "select", key: "size", label: "Paver size", options: PAVERS.map((p) => ({ value: p.value, label: p.label })) },
        { kind: "select", key: "use", label: "Used for", options: PAVER_USES.map((u) => ({ value: u.id, label: `${u.label} — ${u.range[0]}–${u.range[1]} in base` })) },
        { kind: "number", key: "waste", label: "Add for cuts", suffix: "%", step: 5, min: 0, max: 25, decimals: 0, help: "5% for a square patio in running bond, 10% typical, 15% for herringbone, curves or a circle kit." },
        { kind: "toggle", key: "edge", label: "Include edge restraint", help: "Plastic or aluminum edging around the open sides keeps pavers from creeping." },
        { kind: "number", key: "price", label: "Price per paver (optional)", prefix: "$", step: 0.1, min: 0, decimals: 2 },
      ],
    },
  ],
  compute(v) {
    const area = v.shape === "rect" ? Number(v.l) * Number(v.w) : Number(v.area);
    const p = PAVERS.find((x) => x.value === v.size) ?? PAVERS[2];
    const perSqft = 144 / (p.w * p.l);
    const count = ceilQty(area * perSqft * (1 + Number(v.waste) / 100));
    const use = PAVER_USES.find((u) => u.id === v.use) ?? PAVER_USES[0];
    const base = aggregate("crusher");
    const baseYd = ((area * (use.baseIn / 12)) / 27) * 1.33;
    const baseTons = baseYd * base.tonsPerYd;
    const sandYd = (area * (1 / 12)) / 27;
    const edgeFt = v.edge ? (v.shape === "rect" ? 2 * (Number(v.l) + Number(v.w)) : 4 * Math.sqrt(area)) : 0;
    const price = Number(v.price);
    return {
      hero: { label: `${fmtInt(area)} sq ft ${use.label.toLowerCase()}`, value: fmtInt(count), unit: `pavers (${p.w} × ${p.l} in)`, sub: `${fmt(perSqft, 2)} per sq ft + ${fmt(Number(v.waste))}% · ${fmt(baseTons, 1)} tons of base · ${fmt(sandYd, 2)} yd³ of bedding sand${edgeFt ? ` · ${fmtInt(edgeFt)} ft of edging` : ""}` },
      dock: `${fmtInt(count)} pavers`,
      stats: [
        { label: "Pavers per sq ft", value: fmt(perSqft, 2), hint: `${p.w} × ${p.l} in face` },
        { label: "Gravel base", value: fmt(baseTons, 1), unit: "tons", hint: `${use.baseIn} in compacted (Unilock), crusher run` },
        { label: "Bedding sand", value: fmt(sandYd * 27, 1), unit: "cu ft", hint: "1 in screeded coarse sand" },
        ...(price > 0 ? [{ label: "Paver cost", value: fmtMoney(count * price), emphasis: true }] : edgeFt ? [{ label: "Edge restraint", value: fmtInt(edgeFt), unit: "ft", hint: "Open sides only if one side is a wall" }] : []),
      ],
      tables: [
        {
          title: "Same area, other paver sizes",
          caption: "Pavers by size",
          columns: ["Size", "Per sq ft", "Pavers with waste"],
          rows: PAVERS.map((x) => [x.label, fmt(144 / (x.w * x.l), 2), fmtInt(ceilQty(area * (144 / (x.w * x.l)) * (1 + Number(v.waste) / 100)))]),
          highlight: PAVERS.findIndex((x) => x.value === p.value),
        },
      ],
      shopping: [
        { id: "pavers", name: `pavers ${p.w}×${p.l} in`, qty: count, unit: "pavers", cost: price > 0 ? count * price : undefined },
        { id: "base", name: "crusher run / paver base", qty: Math.round(baseTons * 10) / 10, unit: "tons" },
        { id: "sand", name: "coarse bedding sand", qty: Math.round(sandYd * 27 * 10) / 10, unit: "cu ft" },
        ...(edgeFt ? [{ id: "edge", name: "paver edge restraint", qty: ceilQty(edgeFt), unit: "ft" }] : []),
      ],
      notes: [{ tone: "info", text: "Buy all the pavers for one area at the same time, from the same production run, so the color matches — and keep a few spares for future repairs." }],
      summary: `${count} pavers (${p.w}×${p.l} in) for ${fmtInt(area)} sq ft, ${fmt(baseTons, 1)} tons of base`,
    };
  },
});

// Retaining wall blocks (face height × length, in). Pavestone RockWall small 4 × 11.75 in (≈0.32 sq ft,
// 144 pcs / 46.5 sq ft pallet); Allan Block Classic 8 × 18 in (≈1 sq ft face). Allan Block: bury the
// first course, 6 in of compacted base rock, wall rock behind the blocks, drain pipe over 4 ft.
export const WALL_BLOCKS = [
  { value: "small", label: "Small garden block — 4 × 11.75 in face", h: 4, l: 11.75, lb: 22.4 },
  { value: "large", label: "Large block — 8 × 18 in face (Allan Block type)", h: 8, l: 18, lb: 76.5 },
];

export const retainingWall = defineTool({
  key: "landscaping/retaining-wall-calculator",
  name: "Retaining Wall Calculator",
  unitToggle: true,
  defaults: { len: 30, h: 2, block: "small", caps: true, price: 0, capPrice: 0 },
  sections: [
    {
      fields: [
        { kind: "length", key: "len", label: "Wall length" },
        { kind: "length", key: "h", label: "Exposed height", help: "Height above finished grade. The calculator adds the buried first course." },
        { kind: "select", key: "block", label: "Block", options: WALL_BLOCKS.map((b) => ({ value: b.value, label: b.label })) },
        { kind: "toggle", key: "caps", label: "Cap the top course" },
      ],
    },
    {
      title: "Prices for a cost estimate",
      more: true,
      fields: [
        { kind: "number", key: "price", label: "Price per block", prefix: "$", step: 0.25, min: 0, decimals: 2 },
        { kind: "number", key: "capPrice", label: "Price per cap", prefix: "$", step: 0.25, min: 0, decimals: 2 },
      ],
    },
  ],
  compute(v) {
    const L = Number(v.len);
    const H = Number(v.h);
    const b = WALL_BLOCKS.find((x) => x.value === v.block) ?? WALL_BLOCKS[0];
    const exposed = ceilQty((H * 12) / b.h);
    const courses = exposed + 1;
    const perCourse = ceilQty((L * 12) / b.l);
    const blocks = ceilQty(courses * perCourse * 1.05);
    const caps = v.caps ? ceilQty(L * 1.05) : 0;
    const baseYd = (L * 2 * 0.5) / 27; // 24 in wide trench, 6 in compacted base
    const drainYd = (L * (courses * (b.h / 12)) * 1) / 27; // 12 in of drain rock behind the wall
    const tons = (baseYd * 1.33 * aggregate("crusher").tonsPerYd) + drainYd * aggregate("57").tonsPerYd;
    const cost = blocks * Number(v.price) + caps * Number(v.capPrice);
    const tall = H > 3;
    return {
      hero: { label: `${fmt(L, 1)} ft long × ${fmt(H, 2)} ft high`, value: fmtInt(blocks), unit: "wall blocks", sub: `${courses} courses (1 buried) × ${perCourse} blocks + 5% · ${caps ? `${caps} caps · ` : ""}${fmt(tons, 1)} tons of base and drain rock · ${fmt((blocks * b.lb) / 2000, 1)} tons of block` },
      dock: `${fmtInt(blocks)} blocks`,
      stats: [
        { label: "Courses", value: fmtInt(courses), hint: `${exposed} exposed + 1 buried, ${b.h} in each` },
        { label: "Base gravel", value: fmt(baseYd * 1.33 * aggregate("crusher").tonsPerYd, 1), unit: "tons", hint: "6 in compacted in a 24 in wide trench" },
        { label: "Drain rock", value: fmt(drainYd * aggregate("57").tonsPerYd, 1), unit: "tons", hint: "12 in of clean #57 stone behind the wall" },
        ...(cost > 0 ? [{ label: "Block & cap cost", value: fmtMoney(cost), emphasis: true }] : [{ label: "Face area", value: fmtInt(L * H), unit: "sq ft", hint: "Exposed wall face" }]),
      ],
      notes: [
        ...(tall ? [{ tone: "warn" as const, text: "Walls taller than about 3 ft usually need geogrid reinforcement, and many towns require a permit or an engineer's design over 4 ft. Small 4 in garden blocks are rated for low walls only — check the maker's maximum height." }] : []),
        { tone: "info", text: "Bury the first course, set it on 6 in of compacted base, and backfill with clean drain rock — water pressure, not soil, is what pushes most failed walls over." },
      ],
      shopping: [
        { id: "blocks", name: `retaining wall blocks (${b.h}×${b.l} in)`, qty: blocks, unit: "blocks", cost: Number(v.price) ? blocks * Number(v.price) : undefined },
        ...(caps ? [{ id: "caps", name: "wall caps", qty: caps, unit: "caps", cost: Number(v.capPrice) ? caps * Number(v.capPrice) : undefined }] : []),
        { id: "base", name: "crusher run (base)", qty: Math.round(baseYd * 1.33 * aggregate("crusher").tonsPerYd * 10) / 10, unit: "tons" },
        { id: "drain", name: "#57 drain rock", qty: Math.round(drainYd * aggregate("57").tonsPerYd * 10) / 10, unit: "tons" },
      ],
      summary: `${blocks} wall blocks${caps ? ` and ${caps} caps` : ""} for a ${fmt(L, 1)} × ${fmt(H, 2)} ft retaining wall`,
    };
  },
});
