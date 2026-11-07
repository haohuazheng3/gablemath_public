// Landscaping materials data — gravel, sand, soil, mulch and paver base. Every number traces to
// research/aggregates_landscape.verified.json (URLs, quotes, verification notes). Densities are
// LOOSE, as-delivered short tons per cubic yard unless a name says otherwise. Prices are typical
// snapshots for planning and are editable in every calculator. Update LANDSCAPING_CHECKED when
// re-verifying.

import type { SourceRef } from "@/calculators/types";

export const LANDSCAPING_CHECKED = "2026-10-23";

/** 27 cu ft × 12 in: one cubic yard spread 1 in deep covers 324 sq ft (Mulch Pros: 162 @ 2 in, 108 @ 3 in). */
export const SQFT_PER_CUYD_AT_1IN = 324;

/** Mulch Pros (Cumming, GA): single-axle dump up to ~5 t; over 5 t rides a tandem, up to 18 t per trip. */
export const TRUCK = { singleAxleTons: 5, tandemTons: 18 } as const;

/** Nominal "half-ton" pickup payload class — users should read their door-jamb Tire & Loading label. */
export const DEFAULT_PAYLOAD_LB = 1000;

/** Flat delivery default; LawnStarter (Oct 2026) $70–$140, Mulch Pros $60 minimum, Roseville free from 4 yd. */
export const DEFAULT_DELIVERY = 75;

/** Unilock Basic Tech Guide (2024): compact gravel base "in layers 2 in - 3 in thick". */
export const MAX_LIFT_IN = 3;

/** Roseville Rock Supply and Stone Center both build a 10% buffer into their calculators. */
export const DEFAULT_EXTRA_PCT = 10;

/** Dense-graded base: Penn State DSA bulletin places 8 in loose to finish at 6 in compacted (8/6 = 1.33). */
export const CF_DENSE_GRADED = 1.33;
/** Fines such as DG and screenings: Roseville "base materials like crushed granite may need up to 15% extra". */
export const CF_FINES = 1.15;

/** Nebraska DOT: soil weight compacted in place 110 lb/ft³ = 1.49 t/yd³ (excavation haul-off estimate). */
export const SOIL_IN_PLACE_TONS_PER_YD = 1.49;

/* ───────────────────────── gravel & stone ───────────────────────── */

export type GravelId = "pea" | "57" | "crusher" | "river" | "dg" | "concrete" | "screenings";

export interface Aggregate {
  id: GravelId;
  name: string;
  short: string;
  /** Regional names that mean the same product (shown in the picker and the guide). */
  aka: string;
  /** Loose, as-delivered short tons per cubic yard (calculator default). */
  tonsPerYd: number;
  /** Spread of published factors for the same product (t/yd³). */
  range: [number, number];
  densityNote: string;
  /** Loose-to-compacted volume factor when placed as a compacted layer; absent for clean stone. */
  compaction?: number;
  /** How yards in the price source sell it. */
  sellBy: "ton" | "yd";
  /** Typical bulk price in `sellBy` units. */
  price: number;
  priceNote: string;
  /** Price of a 0.5 cu ft (~50 lb) retail bag, where the product is sold bagged. */
  bagPrice?: number;
  bestFor: string;
}

export const AGGREGATES: Aggregate[] = [
  {
    id: "pea",
    name: "Pea gravel (3/8 in)",
    short: "pea gravel",
    aka: "pea pebbles, #89-size rounded stone",
    tonsPerYd: 1.4, // Mulch Pros scale 2,700–2,800 lb; Stone Center 1.4–1.6
    range: [1.35, 1.6],
    densityNote: "Mulch Pros scale weights 2,700–2,800 lb/yd³; Stone Center 1.4–1.6 t",
    sellBy: "ton",
    price: 36.5, // midpoint of American Rock Supply's $28–$45/ton national range (material only)
    priceNote: "$28–$45/ton national (American Rock Supply 2026); decorative washed pea gravel $139.95/ton at a GA yard",
    bagPrice: 5.97, // bagged pea gravel 0.5 cu ft: $5.44–$6.95 (HD snippets, Mulch Pros)
    bestFor: "Paths, play areas, patios set in gravel, and ground cover. Rounded stones roll underfoot and migrate — edge it.",
  },
  {
    id: "57",
    name: "#57 stone / clean crushed stone (3/4 in)",
    short: "#57 stone",
    aka: "3/4 in clean, washed #57, #67",
    tonsPerYd: 1.35, // MM coarse 1.32, Vulcan coarse 96 pcf = 1.30, Mulch Pros scale 2,700 lb = 1.35
    range: [1.3, 1.65],
    densityNote: "Martin Marietta 1.32, Vulcan 1.30, Mulch Pros scale 1.35; Kokosing (OH) uses 1.65",
    sellBy: "ton",
    price: 45, // American Rock Supply 2026: #57 washed stone $35–$55/ton material only
    priceNote: "$35–$55/ton national (American Rock Supply 2026); $58.95/ton at a GA yard; $72.65+/yd in NE Ohio",
    bagPrice: 6.95, // Mulch Pros 50 lb #57 bag, regular price ($5.95 was a sale)
    bestFor: "Driveway base layers, drainage behind walls and around pipes, under decks. Locks together but stays free-draining.",
  },
  {
    id: "crusher",
    name: "Crusher run / #411 / road base",
    short: "crusher run",
    aka: "crush & run, #411, 304, DGA, ABC, GAB, CA-6, 21A, 2A, flex base, Class 2 AB, 3/4 minus",
    tonsPerYd: 1.45, // Mulch Pros crush & run scale weight 2,900 lb/yd³ (loose)
    range: [1.3, 1.62], // MI LTAP loose crushed stone to Penn State DSA implied loose density
    densityNote: "Mulch Pros scale 2,900 lb/yd³ loose; ≈1.93 t per compacted yd³ (Martin Marietta base 1.90)",
    compaction: CF_DENSE_GRADED,
    sellBy: "ton",
    price: 29, // midpoint of American Rock Supply's $24–$34/ton national range
    priceNote: "$24–$34/ton national (American Rock Supply 2026); $54.95/ton at a GA yard",
    bagPrice: 5.98, // 0.5 cu ft paver/all-purpose base bags $5.37–$7.49 (Quikrete HardScapes $5.99 at Kellogg)
    bestFor: "Compacted bases for driveways, sheds, slabs and pavers. Stone plus fines packs hard — the default base material.",
  },
  {
    id: "river",
    name: "River rock (1–3 in)",
    short: "river rock",
    aka: "Tennessee river rock, landscape rock, Mexican beach pebble (larger)",
    tonsPerYd: 1.3, // Mulch Pros TN river rock 2,600 lb; Roseville 2,400–2,600
    range: [1.2, 1.75],
    densityNote: "Mulch Pros scale 2,600 lb/yd³; Roseville 2,400–2,600 lb; Stone Center up to 1.75 t",
    sellBy: "ton",
    price: 170, // Mulch Pros TN river rock $134.95–$175/ton
    priceNote: "$134.95–$175/ton at a GA landscape yard (Mulch Pros, Oct 2026)",
    bestFor: "Dry creek beds, downspout splash areas and decorative beds. Not for walking surfaces.",
  },
  {
    id: "dg",
    name: "Decomposed granite (DG)",
    short: "decomposed granite",
    aka: "DG, granite fines, crushed granite",
    tonsPerYd: 1.45, // Roseville ~3,000 lb/yd³ = 1.5; 1.45 kept slightly conservative
    range: [1.45, 1.5],
    densityNote: "Roseville Rock Supply ~3,000 lb/yd³",
    compaction: CF_FINES,
    sellBy: "yd",
    price: 106.95, // Roseville tan premium DG per cu yd; gray fines $141.95
    priceNote: "$106.95–$141.95/yd³ in Sacramento (Roseville Rock Supply)",
    bestFor: "Compacted paths and patios with a natural look; West Coast staple. Compact it 2–4 in deep over a firm base.",
  },
  {
    id: "concrete",
    name: "Crushed concrete (recycled)",
    short: "crushed concrete",
    aka: "RCA, recycled concrete aggregate, crushed concrete road base",
    tonsPerYd: 1.3, // verifier correction: NE DOT stockpiled 1.35, MI LTAP loose 1.35, Allied 1.3, The Pricer 1.2–1.4
    range: [1.21, 1.4],
    densityNote: "Nebraska DOT stockpiled 1.35 t; The Pricer 1.2–1.4 t; GravelShop 1.21",
    compaction: CF_DENSE_GRADED,
    sellBy: "ton",
    price: 16, // The Pricer (Jul 2026): $9–$25/ton at recycling yards; Atlas Recycling $16
    priceNote: "$9–$25/ton at recycling yards (The Pricer, July 2026)",
    bestFor: "The budget driveway and pad base. Compacts like crusher run; may contain bits of rebar or brick.",
  },
  {
    id: "screenings",
    name: "Limestone screenings / stone dust",
    short: "screenings",
    aka: "stone dust, crusher fines, granite dust, quarry process (fines)",
    tonsPerYd: 1.5, // Vulcan limestone screenings 113 pcf = 1.53; Mulch Pros granite dust 1.45
    range: [1.24, 1.75],
    densityNote: "Vulcan 1.49–1.67, Mulch Pros 1.45, Kokosing 1.75, GravelShop 1.24",
    compaction: CF_FINES,
    sellBy: "ton",
    price: 54.95, // Mulch Pros M10 granite dust
    priceNote: "$54.95/ton at a GA yard (Mulch Pros granite dust)",
    bestFor: "A fine, tight layer for stepping-stone beds and under above-ground pools. Holds water — not a drainage layer.",
  },
];

export function aggregate(id: string): Aggregate {
  return AGGREGATES.find((a) => a.id === id) ?? AGGREGATES[0];
}

/** Retail stone bags are labelled 0.5 cu ft (~50 lb): County Materials, Pavestone, Vigoro, Mulch Pros. */
export const STONE_BAG_CUFT = 0.5;

export interface LayerPreset {
  material: GravelId;
  depthIn: number;
  compacted: boolean;
}

export interface GravelUse {
  id: string;
  label: string;
  layers: LayerPreset[];
  note: string;
}

export const GRAVEL_USES: GravelUse[] = [
  {
    id: "cover",
    label: "Beds & ground cover",
    layers: [{ material: "pea", depthIn: 2, compacted: false }],
    note: "Decorative gravel needs at least 2 in to hide fabric (Stone Center); larger rock looks best at 3 in or more (Roseville suggests 3–6 in).",
  },
  {
    id: "path",
    label: "Walkway",
    layers: [
      { material: "pea", depthIn: 2, compacted: false },
      { material: "crusher", depthIn: 3, compacted: true },
    ],
    note: "A typical build-up: about 2 in of pea gravel or DG on top of 3 in of compacted crusher run.",
  },
  {
    id: "pad",
    label: "Shed / slab base",
    layers: [{ material: "crusher", depthIn: 4, compacted: true }],
    note: "4 in compacted is the IRC base course under slabs; Quikrete places about 5 in and tamps it to 4. Under pavers, use the paver base calculator.",
  },
  {
    id: "drive",
    label: "New driveway",
    layers: [
      { material: "crusher", depthIn: 4, compacted: true },
      { material: "57", depthIn: 4, compacted: false },
    ],
    note: "A typical new driveway: 4 in of #57 base stone on fabric, topped with 4 in of compacted crusher run. Penn State's road spec places 8 in loose to finish at 6 in.",
  },
  {
    id: "refresh",
    label: "Driveway top-up",
    layers: [{ material: "crusher", depthIn: 2, compacted: true }],
    note: "Top-dressing a worn driveway with about 2 in restores the surface; rebuild only where the base has failed.",
  },
  {
    id: "play",
    label: "Play area",
    layers: [{ material: "pea", depthIn: 12, compacted: false }],
    note: "CPSC: fill 12 in so it never compresses below 9 in. 9 in of pea gravel protects falls up to 5 ft.",
  },
];

export const GRAVEL_DEPTHS = [
  { value: 2, label: "2 in" },
  { value: 3, label: "3 in" },
  { value: 4, label: "4 in" },
  { value: 6, label: "6 in" },
];

/* ───────────────────────── mulch ───────────────────────── */

export type MulchId = "dyed" | "hardwood" | "pinebark" | "cypress" | "rubber" | "compost" | "pinestraw" | "playground";

export interface MulchType {
  id: MulchId;
  name: string;
  short: string;
  /** Extension-recommended depth range, inches (MSU P2301 Table 1). */
  depth: [number, number];
  defaultDepth: number;
  /** Bag sizes on the shelf, cu ft. Empty = sold in bulk (or bales) only. */
  bagSizes: number[];
  defaultBag: number;
  /** Known bag prices by size (USD). Other sizes are scaled from the per-cu-ft price. */
  bagPrice: Record<number, number>;
  /** Bulk price per cu yd, where a dated price exists. */
  bulkPerYd?: number;
  /** Approximate loose weight, t/yd³ (wood mulch only — Roseville 400–800 lb, GravelShop 800 lb). */
  tonsPerYd?: number;
  /** Pine straw is sold by the bale: Mulch Pros "1 bale ≈ 40 sq ft". */
  sqftPerBale?: number;
  note: string;
}

export const MULCH_TYPES: MulchType[] = [
  {
    id: "dyed",
    name: "Dyed mulch (black, brown, red)",
    short: "dyed mulch",
    depth: [2, 4],
    defaultDepth: 3,
    bagSizes: [1.5, 2, 3],
    defaultBag: 2,
    bagPrice: { 2: 3.65, 1.5: 4.98 }, // Mulch Pros 2 cu ft (Oct 2026); Scotts Nature Scapes 1.5 cu ft Lowe's snapshot
    bulkPerYd: 33.95, // Mulch Pros black/brown bulk
    tonsPerYd: 0.3,
    note: "Shredded wood with colorant. MSU Extension: wood chips and shredded wood 2–4 in.",
  },
  {
    id: "hardwood",
    name: "Shredded hardwood",
    short: "shredded hardwood",
    depth: [2, 4],
    defaultDepth: 3,
    bagSizes: [1.5, 2, 3],
    defaultBag: 2,
    bagPrice: { 2: 2.95 }, // Mulch Pros hardwood blend
    bulkPerYd: 29.95,
    tonsPerYd: 0.3,
    note: "Knits together and stays on slopes. MSU Extension: shredded wood 2–4 in.",
  },
  {
    id: "pinebark",
    name: "Pine bark nuggets / mini nuggets",
    short: "pine bark",
    depth: [2, 3],
    defaultDepth: 3,
    bagSizes: [1.5, 2, 3],
    defaultBag: 2,
    bagPrice: { 2: 4.25 }, // Mulch Pros
    bulkPerYd: 46.95,
    tonsPerYd: 0.3,
    note: "Long-lasting but floats away in heavy rain. MSU Extension: pine bark 2–3 in.",
  },
  {
    id: "cypress",
    name: "Cypress mulch",
    short: "cypress mulch",
    depth: [2, 3],
    defaultDepth: 3,
    bagSizes: [1.5, 2, 3],
    defaultBag: 2,
    bagPrice: { 2: 4.95 }, // Mulch Pros
    bulkPerYd: 64.95,
    tonsPerYd: 0.3,
    note: "Slow to break down. MSU Extension: cypress bark 2–3 in.",
  },
  {
    id: "compost",
    name: "Compost (as mulch)",
    short: "compost",
    depth: [2, 3],
    defaultDepth: 2,
    bagSizes: [1, 1.5],
    defaultBag: 1.5,
    bagPrice: { 1.5: 9.95 }, // Mulch Pros ERTH Food 1.5 cu ft
    bulkPerYd: 65.95, // Mulch Pros; Kurtz Earthblend from $32.05
    note: "Feeds the soil as it breaks down. MSU Extension: compost 2–3 in.",
  },
  {
    id: "rubber",
    name: "Rubber mulch",
    short: "rubber mulch",
    depth: [2, 4],
    defaultDepth: 3,
    bagSizes: [0.8],
    defaultBag: 0.8,
    bagPrice: { 0.8: 7.47 }, // Vigoro 0.8 cu ft regular shelf price snapshot ($5.97 on sale)
    note: "Doesn't break down or feed the soil. MSU Extension: 2–4 in in beds; playgrounds need 6 in (CPSC).",
  },
  {
    id: "pinestraw",
    name: "Pine straw (bales)",
    short: "pine straw",
    depth: [6, 8],
    defaultDepth: 6,
    bagSizes: [],
    defaultBag: 0,
    bagPrice: {},
    sqftPerBale: 40,
    note: "Applied 6–8 in loose and settles (MSU Extension). Mulch Pros: one bale covers about 40 sq ft.",
  },
  {
    id: "playground",
    name: "Playground wood fiber / chips",
    short: "playground mulch",
    depth: [9, 12],
    defaultDepth: 12,
    bagSizes: [],
    defaultBag: 0,
    bagPrice: {},
    bulkPerYd: 51.45, // Mulch Pros $38.95 to Roseville $63.95 per yd
    tonsPerYd: 0.3,
    note: "Engineered wood fiber or clean wood chips. CPSC: fill 12 in so it never drops below 9 in.",
  },
];

export function mulchType(id: string): MulchType {
  return MULCH_TYPES.find((m) => m.id === id) ?? MULCH_TYPES[0];
}

/** Mulch depth choices for beds (MSU P2301: most organic mulches 2–3 in). */
export const MULCH_DEPTHS = [
  { value: 2, label: "2 in" },
  { value: 3, label: "3 in" },
  { value: 4, label: "4 in" },
];

/** Tree rings: Rockville MD (2026) 2–3 in deep with a 2–3 in gap at the trunk; MSU: 3–6 ft out from the trunk. */
export const TREE_RING = { gapIn: 3, depthIn: 3, minRadiusFt: 3, maxRadiusFt: 6 } as const;

/** Keep total mulch at or under this depth; deeper layers starve roots of air (Rockville, MSU 2–3 in). */
export const MULCH_MAX_TOTAL_IN = 4;

/** MSU P2301: "After 3 years, rake off old mulch and apply a new layer." */
export const MULCH_REPLACE_YEARS = 3;

/* ───────────────────────── playground surfacing (CPSC) ───────────────────────── */

/** CPSC Pub 324: extend surfacing at least 6 ft beyond the equipment in all directions. */
export const PLAY_USE_ZONE_FT = 6;
/** CPSC Pub 325: maintain 9 in of loose fill; an initial 12 in compresses to about 9 in. */
export const PLAY_MAINTAIN_IN = 9;
export const PLAY_INITIAL_IN = 12;

/** CPSC Pub 325 Table 2 — loose-fill depth and the fall height it protects. */
export const PLAY_SURFACES = [
  { id: "chips", label: "Wood chips", depthIn: 9, protectsFt: 10 },
  { id: "mulch", label: "Wood mulch (not CCA-treated)", depthIn: 9, protectsFt: 7 },
  { id: "pea", label: "Pea gravel", depthIn: 9, protectsFt: 5 },
  { id: "sand", label: "Sand", depthIn: 9, protectsFt: 4 },
  { id: "rubber", label: "Shredded / recycled rubber", depthIn: 6, protectsFt: 10 },
] as const;

/* ───────────────────────── topsoil, compost & fill ───────────────────────── */

export type SoilId = "topsoil" | "compost" | "blend" | "fill";

export interface SoilType {
  id: SoilId;
  name: string;
  short: string;
  /** Loose t/yd³. `estimate` = no primary source pins it down; shown with "≈ estimate". */
  tonsPerYd: number;
  weightEstimate: boolean;
  bulkPerYd: number;
  bulkNote: string;
  /** Known bag price by size (USD). */
  bagPrice: Record<number, number>;
  note: string;
}

export const SOIL_TYPES: SoilType[] = [
  {
    id: "topsoil",
    name: "Screened topsoil",
    short: "topsoil",
    tonsPerYd: 1.1, // Roseville 2,000–2,200 lb/yd³; wet soil runs heavier
    weightEstimate: false,
    bulkPerYd: 42.45, // $32.95 (GA) – $51.95 (CA) screened topsoil
    bulkNote: "$32.95/yd³ (GA) to $51.95/yd³ (CA) screened",
    bagPrice: { 1: 2.85 }, // Mulch Pros premium topsoil 1 cu ft
    note: "For new lawns, regrading and filling low spots. Roseville recommends 4–6 in under new lawn.",
  },
  {
    id: "compost",
    name: "Compost",
    short: "compost",
    tonsPerYd: 0.5, // no primary source; rule of thumb ~800–1,200 lb/yd³ by moisture
    weightEstimate: true,
    bulkPerYd: 65.95, // Mulch Pros; Kurtz Earthblend from $32.05
    bulkNote: "$32.05–$65.95/yd³ (NE Ohio, GA)",
    bagPrice: { 1.5: 9.95 }, // Mulch Pros ERTH Food 1.5 cu ft
    note: "To amend beds or top-dress. MSU Extension: 2–3 in as a mulch layer.",
  },
  {
    id: "blend",
    name: "Soil–compost blend (50/50)",
    short: "soil–compost blend",
    tonsPerYd: 0.8, // average of the topsoil (1.1) and compost (0.5) planning weights
    weightEstimate: true,
    bulkPerYd: 48, // Mulch Pros soil-compost 50/50; garden mix $52; Roseville blends $63–$74.95
    bulkNote: "$48–$74.95/yd³ (Mulch Pros 50/50 blend to Roseville garden blends)",
    bagPrice: {},
    note: "Ready-to-plant mix for raised beds and new gardens.",
  },
  {
    id: "fill",
    name: "Fill dirt (unscreened)",
    short: "fill dirt",
    tonsPerYd: 1.2, // low-confidence placeholder: no primary loose figure; compacted soil 1.49 (NE DOT)
    weightEstimate: true,
    bulkPerYd: 27.45, // Mulch Pros unscreened fill $25.95, Roseville unscreened topsoil $28.95
    bulkNote: "$25.95–$28.95/yd³ (GA, CA)",
    bagPrice: {},
    note: "Subsoil for filling holes and raising grade. Cap it with topsoil where anything will grow.",
  },
];

export function soilType(id: string): SoilType {
  return SOIL_TYPES.find((s) => s.id === id) ?? SOIL_TYPES[0];
}

export const SOIL_BAG_SIZES = [0.75, 1, 1.5, 2];

/** Roseville: topsoil 4–6 in for new lawns. MSU: compost 2–3 in as a top layer. */
export const SOIL_USES = [
  { id: "lawn", label: "New lawn", depthIn: 4, material: "topsoil" as SoilId, note: "Roseville Rock Supply recommends 4–6 in of topsoil under new lawn." },
  { id: "fill", label: "Fill low spots", depthIn: 3, material: "topsoil" as SoilId, note: "Measure the deepest point and the edges, and use the average depth." },
  { id: "amend", label: "Top-dress beds", depthIn: 2, material: "compost" as SoilId, note: "MSU Extension lists 2–3 in for compost spread as a top layer." },
];

export const RAISED_BED_HEIGHTS = [
  { value: 6, label: "6 in" },
  { value: 12, label: "12 in" },
  { value: 18, label: "18 in" },
  { value: 24, label: "24 in" },
];

/* ───────────────────────── sand ───────────────────────── */

export type SandId = "play" | "allpurpose" | "mason" | "leveling";

export interface SandType {
  id: SandId;
  name: string;
  short: string;
  /** Bag price (50 lb or 0.5 cu ft bag), where sold bagged. */
  bagPrice?: number;
  /** Bulk price and unit, where a dated price exists. */
  bulk?: { price: number; per: "ton" | "yd"; note: string };
  note: string;
}

/** Bulk sand, loose and damp: Vulcan 1.35–1.49, Martin Marietta 1.44–1.47, Kokosing 1.5, MI LTAP 1.32–1.48. */
export const SAND_TONS_PER_YD = 1.4;
export const SAND_RANGE: [number, number] = [1.3, 1.5];

export const SAND_TYPES: SandType[] = [
  {
    id: "play",
    name: "Play sand",
    short: "play sand",
    bagPrice: 4.95, // Mulch Pros Kid-Safe Play-Sand 0.5 cu ft
    note: "Washed and screened for sandboxes (Quikrete Premium Play Sand: 50 lb bags, 56 per pallet).",
  },
  {
    id: "allpurpose",
    name: "All-purpose sand",
    short: "all-purpose sand",
    bagPrice: 4.95, // bagged all-purpose/play sand $4.67–$6.20
    bulk: { price: 68.95, per: "yd", note: "concrete sand $68.95/yd³ (Roseville, CA)" },
    note: "Washed coarse sand meeting ASTM C33 (Quikrete No. 1152). Mixing, leveling, under slabs.",
  },
  {
    id: "mason",
    name: "Mason sand",
    short: "mason sand",
    bulk: { price: 69.95, per: "ton", note: "$69.95/ton (Mulch Pros, GA); $73.95/yd³ (Roseville, CA)" },
    note: "Fine, uniform sand for mortar and sandboxes; sold bulk at landscape yards.",
  },
  {
    id: "leveling",
    name: "Paver leveling sand (coarse concrete sand)",
    short: "paver leveling sand",
    bagPrice: 6.03, // Kolor Scape Step 2 0.5 cu ft, Lowe's snapshot
    bulk: { price: 68.95, per: "yd", note: "concrete sand $68.95/yd³ (Roseville, CA)" },
    note: "The 1 in screeded bed under pavers. Unilock specifies coarse concrete sand over a crusher-run base.",
  },
];

export function sandType(id: string): SandType {
  return SAND_TYPES.find((s) => s.id === id) ?? SAND_TYPES[0];
}

/**
 * Sand bag yields. Weight-labelled bags follow Sakrete's TDS (60 lb ≈ 0.6 cu ft, i.e. ~100 lb/cu ft);
 * Sakrete's current product page says 6 sq ft at 1 in (0.5 cu ft) for the same 60 lb bag.
 */
export const SAND_BAGS = [
  { id: "c05", label: "0.5 cu ft", cuft: 0.5, lb: 50 },
  { id: "50", label: "50 lb", cuft: 0.5, lb: 50 },
  { id: "60", label: "60 lb", cuft: 0.6, lb: 60 },
  { id: "70", label: "70 lb", cuft: 0.7, lb: 70 },
] as const;

export const SAND_USES = [
  { id: "sandbox", label: "Sandbox", depthIn: 6, sand: "play" as SandId, note: "Pick the depth you want; washed play sand is screened and rinsed for sandboxes." },
  { id: "pavers", label: "Under pavers", depthIn: 1, sand: "leveling" as SandId, note: "Unilock lays pavers on a 1 in screeded bed of coarse sand; Quikrete allows 1–2 in." },
  { id: "play", label: "Playground", depthIn: 12, sand: "mason" as SandId, note: "CPSC: 9 in of sand protects falls only up to 4 ft. Fill 12 in so it settles to 9." },
  { id: "slab", label: "Base under a slab", depthIn: 4, sand: "allpurpose" as SandId, note: "The IRC allows a 4 in base of clean graded sand, gravel or crushed stone under slabs." },
];

/* ───────────────────────── paver base ───────────────────────── */

/** Unilock Basic Tech Guide (2024): compacted gravel base by application, inches. */
export const PAVER_USES = [
  { id: "patio", label: "Patio", range: [6, 8] as [number, number], baseIn: 6 },
  { id: "walkway", label: "Walkway", range: [6, 8] as [number, number], baseIn: 6 },
  { id: "pool", label: "Pool deck", range: [6, 12] as [number, number], baseIn: 6 },
  { id: "driveway", label: "Driveway", range: [10, 14] as [number, number], baseIn: 10 },
];

export const PAVER_BASE_DEPTHS = [
  { value: 4, label: "4 in" },
  { value: 6, label: "6 in" },
  { value: 8, label: "8 in" },
  { value: 10, label: "10 in" },
  { value: 12, label: "12 in" },
];

/** Unilock: base of 3/4 in crusher run (bed it in coarse sand) or 3/4 in clear stone (bed it in 1/8 in chip). */
export const PAVER_BASES = [
  { id: "crusher" as const, label: "Crusher run", sub: "3/4 in dense-graded", gravel: "crusher" as GravelId, bedding: "Coarse concrete sand" },
  { id: "clear" as const, label: "Clear stone", sub: "3/4 in, open-graded", gravel: "57" as GravelId, bedding: "1/8 in chip stone" },
];

export const PAVER = {
  beddingIn: 1, // Unilock: 1 in bed; Quikrete 1–2 in
  extendIn: 6, // Quikrete patio method: subbase extends at least 6 in beyond the project area
  paverIn: 2.375, // example paver thickness (60 mm); users enter their own
  bagCuft: 0.5, // County Materials Step 1: 1/2 cu ft bag covers ~6 sq ft at 1 in; 63 bags per pallet
  bagsPerPallet: 63,
  wastePct: 5, // compaction is counted separately, so the low end of Roseville's 5–10%
} as const;

/* ───────────────────────── sources ───────────────────────── */

const src = (label: string, url: string, note: string): SourceRef => ({ label, url, note, checked: LANDSCAPING_CHECKED });

export const SOURCES = {
  martinMarietta: src(
    "Martin Marietta product calculator — material density table",
    "https://www.martinmarietta.com/products/aggregates",
    "coarse stone 1.32 t/yd³, base 1.90–1.95 t/yd³ (compacted basis), crushed-concrete base 1.47",
  ),
  vulcan: src(
    "Vulcan Materials construction aggregates calculator",
    "https://www.vulcanmaterials.com/construction-materials/product-calculators/construction-aggregates",
    "screenings 110–124 lb/ft³, sand 100–110 lb/ft³, coarse 90–102 lb/ft³ by geology",
  ),
  mulchProsWeights: src(
    "Mulch Pros — material weight & coverage (scale weights)",
    "https://mulchpros.com/material-weight-and-coverage/",
    "2,600–2,900 lb per yd³ of stone; 1 yd³ covers 162 sq ft at 2 in and 108 at 3 in; pine straw bale ≈ 40 sq ft; single-axle ≈ 5 t, tandem up to 18 t",
  ),
  mulchProsPrices: src(
    "Mulch Pros price list (October 22, 2026)",
    "https://mulchpros.com/price-list/",
    "bag and bulk prices for mulch, soil, compost, #57, crush & run, pea gravel, sand; delivery $7/mi ($60 min)",
  ),
  rosevilleCalc: src(
    "Roseville Rock Supply — calculator & reference table",
    "https://rosevillerocksupply.com/calculator/",
    "DG ~3,000 lb/yd³, mulch 400–800 lb, topsoil 2,000–2,200 lb; order 5–10% extra; base materials up to 15% for compaction",
  ),
  rosevillePrices: src(
    "Roseville Rock Supply — aggregates, sands, topsoil & delivery rates",
    "https://rosevillerocksupply.com/categories/aggregates-and-sands/",
    "DG $106.95/yd³, concrete sand $68.95/yd³, screened topsoil $51.95/yd³; free delivery from 4 yd within 14 mi",
  ),
  pennState: src(
    "Penn State Center for Dirt & Gravel Roads — DSA Tech Bulletin (Apr 2025)",
    "https://dirtandgravel.psu.edu/wp-content/uploads/Tech-Bulletin_Driving_Surface_Aggregate_2025.pdf",
    "8 in loose compacts to 6 in (factor 1.33); 0.04 t per sq ft; crown 1/2–3/4 in per ft",
  ),
  nebraskaDot: src(
    "Nebraska DOT — Estimating Material Quantities (July 2024)",
    "https://dot.nebraska.gov/media/4ffnhg4d/estimating-material-quantities.pdf",
    "stockpiled crushed concrete 1.35 t/yd³; soil compacted in place 110 lb/ft³",
  ),
  stoneCenter: src(
    "Stone Center (Ohio) material calculator",
    "https://stonecenters.com/calculator",
    "pea gravel 1.4–1.6 t/yd³; 2 in minimum for decorative pea gravel and river rock; 10% waste",
  ),
  americanRock: src(
    "American Rock Supply — how much does gravel cost (2026)",
    "https://americanrocksupply.com/blog/how-much-does-gravel-cost",
    "#57 $35–$55/ton, pea gravel $28–$45/ton, crusher run $24–$34/ton (material only); delivered per-ton prices",
  ),
  thePricer: src(
    "The Pricer — crushed concrete cost (updated July 2026)",
    "https://www.thepricer.org/crushed-concrete-cost/",
    "$9–$25 per ton at recycling yards; 1.2–1.4 t per yd³",
  ),
  msuMulch: src(
    "Mississippi State University Extension P2301 — Mulches for the Landscape",
    "https://extension.msstate.edu/publications/mulches-for-the-landscape",
    "depths by mulch type (bark 2–3 in, shredded wood 2–4, pine straw 6–8, compost 2–3, rubber 2–4); rake off after 3 years",
  ),
  msuRing: src(
    "MSU Extension — How to mulch",
    "https://extension.msstate.edu/blogs/extension-for-real-life/how-mulch",
    "mulch 3–6 ft out from the trunk",
  ),
  rockville: src(
    "City of Rockville, MD — Say no to mulch volcanoes (May 2026)",
    "https://www.rockvillemd.gov/news/2026/05/01/say-no-to-mulch-volcanoes/",
    "2–3 in deep in a flat ring; keep a 2–3 in gap at the trunk",
  ),
  cpsc325: src(
    "CPSC Public Playground Safety Handbook (Pub. 325)",
    "https://www.cpsc.gov/s3fs-public/325.pdf",
    "Table 2 depths and fall heights; loose fill compresses at least 25%; 12 in initial fill for 9 in",
  ),
  cpsc324: src(
    "CPSC Outdoor Home Playground Safety Handbook (Pub. 324)",
    "https://www.cpsc.gov/s3fs-public/324.pdf",
    "surfacing at least 6 ft beyond equipment in all directions",
  ),
  lawnStarter: src(
    "LawnStarter — mulch prices (updated Oct 5, 2026)",
    "https://www.lawnstarter.com/blog/cost/mulch-price/",
    "bulk $30–$135 per yd³; delivery $70–$140; 2 cu ft bags $3.25–$6.50",
  ),
  unilock: src(
    "Unilock Basic Tech Guide (Jan 2024)",
    "https://unilock.com/wp-content/uploads/2024/01/Basic-Tech-Guide-update-002.pdf",
    "base 6–8 in patios & walks, 6–12 in pool decks, 10–14 in driveways; 1 in bedding; compact in 2–3 in layers; edge restraints spiked into the base",
  ),
  countyMaterials: src(
    "County Materials — Step 1 Paver Base",
    "https://www.countymaterials.com/products/step-1-paver-base",
    "1/2 cu ft bag covers ~6 sq ft at 1 in; 63 bags per pallet; (sq ft ÷ 6) × depth = bags",
  ),
  quikretePaverSand: src(
    "Quikrete Patio Paver Sands data sheet",
    "https://www.quikrete.com/PDFs/DATA_SHEET-Patio%20Paver%20Sands%201150-49%20-59.pdf",
    "spread base sand 1–2 in over the compacted base; edge restraints required",
  ),
  quikretePatio: src(
    "Quikrete — how to build a patio",
    "https://www.quikrete.com/athome/PatioInstructions.asp",
    "place about 5 in of compactible gravel, tamp to 4 in; extend the base at least 6 in beyond the edges",
  ),
  quikreteSandGravel: src(
    "Quikrete Sand & Gravel products data sheet (Nov 2020)",
    "https://www.quikrete.com/PDFs/DATA_SHEET-QUIKRETE%20Sand%20&%20Gravel%20Products.pdf",
    "All-Purpose Sand 50/60/70 lb (56 bags per pallet at 50 lb); Play Sand 50 lb; gravel 3/8 in top size",
  ),
  sakreteSand: src(
    "Sakrete Multi-Purpose Sand technical data sheet",
    "https://www.sakrete.com/wp-content/uploads/2021/07/Multi-Purpose-Sand.pdf",
    "60 lb bag yields about 0.6 cu ft (~7 sq ft at 1 in) — roughly 100 lb per cu ft",
  ),
  kellogg: src(
    "Kellogg Supply — Quikrete HardScapes 0.5 cu ft paver base",
    "https://kelloggsupplyco.com/shop/building-materials/concrete-and-mortar/concrete-alternatives-and-sand/sand/quikrete-50-sq-ft-gray-sand?SKU=260596",
    "$5.99 per 0.5 cu ft bag",
  ),
  irc: src(
    "International Residential Code 2021 — R506.2.2 base course",
    "https://up.codes/viewer/pennsylvania/irc-2021/chapter/5/floors",
    "4 in base of clean graded sand, gravel or crushed stone under slabs",
  ),
  kokosing: src(
    "Kokosing Materials (Ohio) tonnage calculator",
    "https://www.kokosing.biz/our-work/materials/aggregate/resources/tonnage-calculator/",
    "factors 1.5 (sand), 1.65 (#57/#8), 1.75 (304/411/screenings) — the high end of published values",
  ),
} as const;
