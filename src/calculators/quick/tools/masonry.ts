import { ceilQty, fmt, fmtInt } from "@/lib/format";
import { defineTool } from "../types";

// Brick and mortar quantities: Brick Industry Association Technical Note 10, Table 4
// (3/8 in joints, no waste). Mortar bags: QUIKRETE Mortar Mix data sheet — an 80 lb bag lays up to
// 37 standard bricks or 12 standard 8×8×16 blocks.
export interface BrickSize {
  id: string;
  name: string;
  size: string;
  per100: number;
  mortarPer1000: number;
}
export const BRICKS: BrickSize[] = [
  { id: "modular", name: "Modular", size: "3-5/8 × 2-1/4 × 7-5/8 in", per100: 675, mortarPer1000: 8.1 },
  { id: "standard", name: "Standard (non-modular)", size: "3-5/8 × 2-1/4 × 8 in", per100: 655, mortarPer1000: 14.5 },
  { id: "queen", name: "Queen", size: "2-3/4 × 2-3/4 × 7-5/8 in", per100: 550, mortarPer1000: 12.2 },
  { id: "king", name: "King", size: "2-3/4 × 2-5/8 × 9-5/8 in", per100: 455, mortarPer1000: 14.2 },
  { id: "engineer", name: "Engineer modular", size: "3-5/8 × 2-13/16 × 7-5/8 in", per100: 563, mortarPer1000: 8.5 },
  { id: "norman", name: "Norman", size: "3-5/8 × 2-1/4 × 11-5/8 in", per100: 450, mortarPer1000: 11.2 },
  { id: "utility", name: "Utility", size: "3-5/8 × 3-5/8 × 11-5/8 in", per100: 300, mortarPer1000: 12.3 },
];
export const MORTAR_BAG = { lb: 80, bricks: 37, blocks: 12 } as const;
/** Masons' rule of thumb quoted by BIA TN 10: eight bags of masonry cement lay 1,000 modular brick. */
export const MASONRY_CEMENT_BAGS_PER_1000_BRICK = 8;

function wallArea(v: Record<string, unknown>) {
  const gross = Number(v.len) * Number(v.h);
  const openings = Number(v.doors) * 21 + Number(v.windows) * 15;
  return Math.max(0, gross - openings);
}

const wallFields = [
  { kind: "length" as const, key: "len" as const, label: "Wall length", help: "Add the lengths of every wall face you're building." },
  { kind: "length" as const, key: "h" as const, label: "Wall height" },
  { kind: "number" as const, key: "doors" as const, label: "Doors", step: 1, min: 0, max: 20, decimals: 0 },
  { kind: "number" as const, key: "windows" as const, label: "Windows", step: 1, min: 0, max: 40, decimals: 0 },
];

export const brick = defineTool({
  key: "concrete/brick-calculator",
  name: "Brick Calculator",
  unitToggle: true,
  defaults: { len: 20, h: 8, doors: 0, windows: 1, size: "modular", waste: 5 },
  sections: [
    {
      fields: [
        ...wallFields,
        { kind: "select", key: "size", label: "Brick size", options: BRICKS.map((b) => ({ value: b.id, label: `${b.name} — ${b.size}` })) },
        { kind: "number", key: "waste", label: "Add for breakage & cuts", suffix: "%", step: 5, min: 0, max: 25, decimals: 0, help: "5% for a plain running-bond wall; 10% or more with many corners, openings or a pattern bond." },
      ],
    },
  ],
  compute(v) {
    const area = wallArea(v);
    const b = BRICKS.find((x) => x.id === v.size) ?? BRICKS[0];
    const exact = (area * b.per100) / 100;
    const bricks = ceilQty(exact * (1 + Number(v.waste) / 100));
    const mortarCuft = (exact / 1000) * b.mortarPer1000;
    const bags = ceilQty(bricks / MORTAR_BAG.bricks);
    return {
      hero: { label: `${fmtInt(area)} sq ft of single-wythe wall`, value: fmtInt(bricks), unit: `${b.name.toLowerCase()} bricks`, sub: `${fmt(b.per100 / 100, 2)} bricks per sq ft (BIA, 3/8 in joints) + ${fmt(Number(v.waste))}% · ${fmtInt(bags)} × 80 lb bags of mortar mix` },
      dock: `${fmtInt(bricks)} bricks`,
      stats: [
        { label: "Bricks per sq ft", value: fmt(b.per100 / 100, 2), hint: b.size },
        { label: "Mortar mix (80 lb)", value: fmtInt(bags), unit: "bags", hint: `${MORTAR_BAG.bricks} bricks per bag (QUIKRETE)` },
        { label: "Or masonry cement", value: fmtInt(ceilQty((bricks / 1000) * MASONRY_CEMENT_BAGS_PER_1000_BRICK)), unit: "bags + sand", hint: "Masons' rule: 8 bags per 1,000 modular brick" },
        { label: "Mortar in the wall", value: fmt(mortarCuft, 1), unit: "cu ft", hint: "Theoretical, BIA Table 4 — before waste" },
      ],
      tables: [
        {
          title: "Same wall, other brick sizes",
          caption: "Bricks by size",
          columns: ["Brick", "Per sq ft", "Bricks with waste"],
          rows: BRICKS.map((x) => [x.name, fmt(x.per100 / 100, 2), fmtInt(ceilQty(((area * x.per100) / 100) * (1 + Number(v.waste) / 100)))]),
          highlight: BRICKS.findIndex((x) => x.id === b.id),
        },
      ],
      shopping: [
        { id: "brick", name: `${b.name.toLowerCase()} bricks`, qty: bricks, unit: "bricks" },
        { id: "mortar", name: "mortar mix (80 lb)", qty: bags, unit: "bags" },
      ],
      notes: [{ tone: "info", text: "Counts are for one wythe (one brick thick). A double-wythe wall or a brick-and-block wall needs the count for each layer." }],
      summary: `${bricks} ${b.name.toLowerCase()} bricks and ${bags} bags of mortar mix for ${fmtInt(area)} sq ft of wall`,
    };
  },
});

export const BLOCKS_PER_SQFT = 144 / (8 * 16); // nominal 8 × 16 in face

export const concreteBlock = defineTool({
  key: "concrete/concrete-block-calculator",
  name: "Concrete Block Calculator",
  unitToggle: true,
  defaults: { len: 40, h: 4, doors: 0, windows: 0, width: "8", waste: 5, caps: true },
  sections: [
    {
      fields: [
        ...wallFields,
        {
          kind: "segmented",
          key: "width",
          label: "Block width",
          columns: 4,
          options: [
            { value: "4", label: "4 in" },
            { value: "6", label: "6 in" },
            { value: "8", label: "8 in" },
            { value: "12", label: "12 in" },
          ],
          help: "All standard CMU are 8 × 16 in on the face (7-5/8 × 15-5/8 in actual), so the count per square foot is the same.",
        },
        { kind: "toggle", key: "caps", label: "Add cap blocks along the top" },
        { kind: "number", key: "waste", label: "Add for breakage", suffix: "%", step: 5, min: 0, max: 20, decimals: 0 },
      ],
    },
  ],
  compute(v) {
    const area = wallArea(v);
    const exact = area * BLOCKS_PER_SQFT;
    const blocks = ceilQty(exact * (1 + Number(v.waste) / 100));
    const courses = ceilQty((Number(v.h) * 12) / 8);
    const caps = v.caps ? ceilQty((Number(v.len) * 12) / 16) : 0;
    const bags = ceilQty(blocks / MORTAR_BAG.blocks);
    return {
      hero: { label: `${fmtInt(area)} sq ft of ${v.width}-in block wall`, value: fmtInt(blocks), unit: "8×16 blocks", sub: `1.125 blocks per sq ft + ${fmt(Number(v.waste))}% · ${courses} courses high · ${fmtInt(bags)} × 80 lb bags of mortar mix${caps ? ` · ${caps} cap blocks` : ""}` },
      dock: `${fmtInt(blocks)} blocks`,
      stats: [
        { label: "Blocks per sq ft", value: "1.125", hint: "One 8×16 face = 0.889 sq ft" },
        { label: "Courses", value: fmtInt(courses), hint: `${fmt(courses * 8, 0)} in at 8 in per course` },
        { label: "Mortar mix (80 lb)", value: fmtInt(bags), unit: "bags", hint: `${MORTAR_BAG.blocks} blocks per bag (QUIKRETE)` },
        ...(caps ? [{ label: "Cap blocks", value: fmtInt(caps), hint: "16 in long, one per block along the top" }] : []),
      ],
      tables: [
        {
          title: "Blocks by wall size",
          caption: "Blocks for common wall sizes",
          columns: ["Wall", "Area", "Blocks (+5%)", "Mortar bags"],
          rows: [
            [10, 4],
            [20, 4],
            [40, 4],
            [20, 8],
            [40, 8],
          ].map(([l, h]) => {
            const n = ceilQty(l * h * BLOCKS_PER_SQFT * 1.05);
            return [`${l} × ${h} ft`, `${l * h} sq ft`, fmtInt(n), fmtInt(ceilQty(n / MORTAR_BAG.blocks))];
          }),
        },
      ],
      shopping: [
        { id: "cmu", name: `${v.width} in concrete blocks 8×16`, qty: blocks, unit: "blocks" },
        { id: "mortar", name: "mortar mix (80 lb)", qty: bags, unit: "bags" },
        ...(caps ? [{ id: "caps", name: "cap blocks", qty: caps, unit: "caps" }] : []),
      ],
      notes: [{ tone: "warn", text: "Retaining and below-grade block walls need a footing, rebar and grouted cores sized by code or an engineer — this count covers the block and mortar only." }],
      summary: `${blocks} concrete blocks and ${bags} bags of mortar for ${fmtInt(area)} sq ft of wall`,
    };
  },
});

export const mortar = defineTool({
  key: "concrete/mortar-calculator",
  name: "Mortar Calculator",
  defaults: { unit: "brick", count: 1000, size: "modular", waste: 10 },
  sections: [
    {
      fields: [
        {
          kind: "segmented",
          key: "unit",
          label: "Laying",
          options: [
            { value: "brick", label: "Bricks" },
            { value: "block", label: "8×8×16 blocks" },
          ],
        },
        { kind: "number", key: "count", label: "How many units", step: 50, min: 1, max: 100000, decimals: 0, help: "Don't know yet? The brick and block calculators count them from your wall size." },
        { kind: "select", key: "size", label: "Brick size", options: BRICKS.map((b) => ({ value: b.id, label: b.name })), showIf: (v) => v.unit === "brick" },
        { kind: "number", key: "waste", label: "Add for droppings & waste", suffix: "%", step: 5, min: 0, max: 30, decimals: 0 },
      ],
    },
  ],
  compute(v) {
    const n = Number(v.count);
    const w = 1 + Number(v.waste) / 100;
    if (v.unit === "block") {
      const bags = ceilQty((n / MORTAR_BAG.blocks) * w);
      return {
        hero: { label: `${fmtInt(n)} concrete blocks`, value: fmtInt(bags), unit: "× 80 lb bags of mortar mix", sub: `QUIKRETE: one 80 lb bag lays up to 12 standard blocks · + ${fmt(Number(v.waste))}%` },
        stats: [
          { label: "Blocks per bag", value: "12", hint: "80 lb premixed Type N mortar" },
          { label: "Mortar weight", value: fmtInt(bags * 80), unit: "lb" },
        ],
        shopping: [{ id: "mortar", name: "mortar mix (80 lb)", qty: bags, unit: "bags" }],
        notes: [{ tone: "tip", text: "Mix only what you can use in about 2 hours, and retemper once with a splash of water if it stiffens — never after it starts to set." }],
        summary: `${bags} bags of mortar mix for ${fmtInt(n)} blocks`,
      };
    }
    const b = BRICKS.find((x) => x.id === v.size) ?? BRICKS[0];
    const premix = ceilQty((n / MORTAR_BAG.bricks) * w);
    const cuft = (n / 1000) * b.mortarPer1000;
    const cement = ceilQty((n / 1000) * MASONRY_CEMENT_BAGS_PER_1000_BRICK * (b.mortarPer1000 / 8.1));
    const sandCuft = cement * 3;
    return {
      hero: { label: `${fmtInt(n)} ${b.name.toLowerCase()} bricks`, value: fmtInt(premix), unit: "× 80 lb bags of mortar mix", sub: `or ${fmtInt(cement)} bags of masonry cement + ${fmtInt(sandCuft)} cu ft of sand · ${fmt(cuft, 1)} cu ft of mortar in the joints` },
      dock: `${fmtInt(premix)} bags`,
      stats: [
        { label: "Premixed (80 lb)", value: fmtInt(premix), unit: "bags", hint: "37 bricks per bag (QUIKRETE)" },
        { label: "Masonry cement", value: fmtInt(cement), unit: "bags", hint: "BIA rule: 8 per 1,000 modular, scaled by size" },
        { label: "Mason sand", value: fmtInt(sandCuft), unit: "cu ft", hint: `≈ ${fmt((sandCuft / 27) * 1.4, 2)} tons · 3 parts sand to 1 cement` },
        { label: "Mortar volume", value: fmt(cuft, 1), unit: "cu ft", hint: `${b.mortarPer1000} cu ft per 1,000 (BIA Table 4)` },
      ],
      shopping: [{ id: "mortar", name: "mortar mix (80 lb)", qty: premix, unit: "bags" }],
      notes: [{ tone: "info", text: "Type N is the everyday mortar for above-grade brick and block. Use Type S below grade, in retaining walls and where the wall takes lateral load." }],
      summary: `${premix} bags of mortar mix (or ${cement} bags of masonry cement + ${sandCuft} cu ft sand) for ${fmtInt(n)} bricks`,
    };
  },
});
