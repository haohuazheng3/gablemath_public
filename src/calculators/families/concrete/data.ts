// Concrete data, checked against manufacturer technical data sheets (TDS), retailer listings,
// published ready-mix plant price sheets and the IRC. See research/concrete*.json for the full
// evidence trail (URLs, quotes, dates). Update DATA_CHECKED when re-verifying.

import type { SourceRef } from "@/calculators/types";

export const CONCRETE_CHECKED = "2026-10-23";

export type BagSize = 40 | 50 | 60 | 80 | 90;

/** Cubic feet of placed concrete per bag — identical across Quikrete & Sakrete for 40/50/60/80 lb. */
export const BAG_YIELD_CUFT: Record<BagSize, number> = {
  40: 0.3,
  50: 0.375,
  60: 0.45,
  80: 0.6,
  90: 0.675, // regional Quikrete size
};

/** Bags per pallet (retail pallets). A pallet of 80-lb bags is 25.2 cu ft = 0.93 yd³ — NOT a full yard. */
export const BAGS_PER_PALLET: Partial<Record<BagSize, number>> = { 40: 80, 50: 64, 60: 56, 80: 42 };

export type ProductId = "standard" | "5000" | "crack" | "fast" | "sakrete-hs";

export interface ConcreteProduct {
  id: ProductId;
  name: string;
  short: string;
  psi: number;
  sizes: BagSize[];
  /** Typical US big-box price per bag (USD), Oct 2026. */
  price: Partial<Record<BagSize, number>>;
  /** Pallet/bulk price per bag where a tier exists (42+ bags of 80 lb at Lowe's). */
  bulkPrice?: Partial<Record<BagSize, number>>;
  /** Water per 80-lb bag (or per 50-lb for fast-set), US gallons: [start, max]. */
  waterGal: [number, number];
  waterPerLb: number; // bag weight the water figure refers to
  bestFor: string;
  timeline: { label: string; value: string }[];
  airEntrained: boolean;
}

export const PRODUCTS: ConcreteProduct[] = [
  {
    id: "standard",
    name: "Quikrete Concrete Mix (No. 1101)",
    short: "Standard 4000 psi mix",
    psi: 4000,
    sizes: [40, 50, 60, 80],
    price: { 60: 4.85, 80: 6.47 },
    bulkPrice: { 80: 5.93 },
    waterGal: [0.75, 1.125],
    waterPerLb: 80,
    bestFor: "Patios, walkways, shed bases, steps — the default for most DIY slabs.",
    timeline: [
      { label: "Walk on", value: "24 hours" },
      { label: "Light loads / posts", value: "24 hours" },
      { label: "Keep moist (cure)", value: "5 days ≥70°F · 7 days at 50–70°F" },
      { label: "Protect from freezing", value: "48 hours" },
    ],
    airEntrained: false,
  },
  {
    id: "5000",
    name: "Quikrete 5000 High Early Strength (No. 1007)",
    short: "5000 psi, high early strength",
    psi: 5000,
    sizes: [50, 60, 80],
    price: { 80: 9.99 },
    waterGal: [0.75, 1.25],
    waterPerLb: 80,
    bestFor: "Driveway aprons, garage pads and cold-weather pours that need strength fast.",
    timeline: [
      { label: "Walk on", value: "10–12 hours" },
      { label: "Strength at 3 days", value: "2,500 psi" },
      { label: "Strength at 28 days", value: "5,000 psi" },
      { label: "Protect from freezing", value: "48 hours" },
    ],
    airEntrained: false,
  },
  {
    id: "crack",
    name: "Quikrete Crack-Resistant (No. 1006)",
    short: "Fiber-reinforced, air-entrained",
    psi: 4000,
    sizes: [50, 60, 80],
    price: { 80: 10.28 },
    waterGal: [0.75, 1.25],
    waterPerLb: 80,
    bestFor: "Exposed slabs in freeze–thaw climates; fibers reduce surface cracking.",
    timeline: [
      { label: "Walk on", value: "24 hours" },
      { label: "Air content", value: "4–8% (freeze–thaw resistant)" },
      { label: "Keep moist (cure)", value: "5–7 days" },
      { label: "Protect from freezing", value: "48 hours" },
    ],
    airEntrained: true,
  },
  {
    id: "fast",
    name: "Quikrete Fast-Setting (No. 1004)",
    short: "Sets in 20–40 min",
    psi: 4000,
    sizes: [50, 60],
    price: { 50: 7.97 },
    waterGal: [0.5, 0.62],
    waterPerLb: 50,
    bestFor: "Fence and mailbox posts, small repairs. Too fast for most slabs — mix only what you can place in 20 minutes.",
    timeline: [
      { label: "Sets", value: "20–40 minutes" },
      { label: "Load a post", value: "4 hours" },
      { label: "Strength at 24 h", value: "1,000 psi" },
      { label: "Strength at 28 days", value: "4,000 psi" },
    ],
    airEntrained: false,
  },
  {
    id: "sakrete-hs",
    name: "Sakrete High-Strength Concrete Mix",
    short: "Sakrete 4000 psi",
    psi: 4000,
    sizes: [40, 60, 80],
    price: { 80: 6.48 }, // UNVERIFIED — confirm Lowe's Sakrete 80 lb shelf price
    waterGal: [0.875, 0.875],
    waterPerLb: 80,
    bestFor: "Same uses as standard mix; common at Lowe's and independent yards.",
    timeline: [
      { label: "Foot traffic", value: "24 hours" },
      { label: "Strength at 7 days", value: "2,500 psi" },
      { label: "Strength at 28 days", value: "4,000 psi" },
      { label: "Protect from freezing", value: "48 hours" },
    ],
    airEntrained: false,
  },
];

export function product(id: string): ConcreteProduct {
  return PRODUCTS.find((p) => p.id === id) ?? PRODUCTS[0];
}

/** Ready-mix (delivered) defaults from 2026 plant price sheets. All are editable in the UI. */
export const READY_MIX = {
  pricePerYd: 170, // 4000 psi typical; 3000 psi sheets run ~$146–$285, central ~$150–$200
  orderIncrementYd: 0.25,
  minOrderYd: 1,
  shortLoadUnderYd: 4, // commonly 4–6 yd³
  shortLoadFee: 120, // $50–$200 flat per load on 2026 sheets
  deliveryFee: 140, // zone/delivery fee, $0–$364 (median ~$140)
  fuelFee: 55, // fuel/environmental surcharge $24–$75
  truckCapacityYd: 10,
} as const;

/** Weight of placed concrete for planning (lb per cu ft). */
export const CONCRETE_LB_PER_CUFT = 145;

/** Gravel base under slabs (crusher run / #411 / road base). */
export const GRAVEL_BASE = {
  depthIn: 4, // IRC R506.2.2 base course; Quikrete patio method: place ~5 in, tamp to 4 in
  extendIn: 6, // extend 6 in beyond the slab edge
  compaction: 1.3, // loose volume needed per compacted volume (dense-graded base)
  tonsPerYdLoose: 1.45,
  pricePerTon: 38, // UNVERIFIED — confirm bulk crusher-run $/ton from aggregates research
};

export const REBAR = {
  // typical residential practice (IRC governs placement, not spacing); ASTM A615 nominal diameter & weight
  patio: { size: "#3", spacingIn: 18, lbPerFt: 0.376, diaIn: 0.375 },
  driveway: { size: "#4", spacingIn: 12, lbPerFt: 0.668, diaIn: 0.5 },
  stickLengthFt: 20,
  // Ernest Maier (MD building supply) 2026 listing: #3 $0.31/ft, #4 $0.51/ft, sold in 20 ft lengths.
  // A Home Depot #4 × 20 ft snapshot read $12.73 — big-box shelves run higher.
  pricePerStick: { "#3": 6.2, "#4": 10.2 } as Record<string, number>,
  chairsPerSqFt: 1 / 9, // one chair roughly every 3 ft each way
  /** Lap allowance on a bar takeoff (standard takeoff practice, verified formula in research). */
  lapFactor: 1.1,
};

/** Dressed (actual) height of form lumber, inches — what a 2×8 really measures. */
export const FORM_LUMBER = [
  { name: "2×4", heightIn: 3.5 },
  { name: "2×6", heightIn: 5.5 },
  { name: "2×8", heightIn: 7.25 },
  { name: "2×10", heightIn: 9.25 },
  { name: "2×12", heightIn: 11.25 },
] as const;

/** Bagged all-purpose gravel: Sakrete sells a 0.5 cu ft bag (≈3 sq ft at 2 in; 60 lb bag ≈ 0.6 cu ft). */
export const GRAVEL_BAG_CUFT = 0.5;

/* ───────── posts ───────── */

/** Post cross-sections, actual inches. Lumber is dressed (4×4 = 3.5 in, 6×6 = 5.5 in per Quikrete/Sakrete);
 *  vinyl fence posts are a true 5×5 in (Catalyst/Newbury spec sheets). */
export const POST_TYPES = [
  { id: "4x4", label: "4×4", sub: "3½ in", w: 3.5, d: 3.5 },
  { id: "4x6", label: "4×6", sub: "3½×5½", w: 3.5, d: 5.5 },
  { id: "6x6", label: "6×6", sub: "5½ in", w: 5.5, d: 5.5 },
  { id: "5x5", label: "5×5", sub: "vinyl", w: 5, d: 5 },
  { id: "round", label: "Round", sub: "pipe/pole", w: 0, d: 0 },
] as const;

export const POST_RULES = {
  holeTimesPost: 3, // hole ≈ 3× post width (Quikrete 1004 & 1101 TDS, Sakrete TDS)
  embedPerAboveGround: 0.5, // bury 1/3 of overall length = 1/2 of the above-ground height (Quikrete TDS & calculator)
  baseLayerIn: 6, // 6 in gravel (Quikrete how-to) or 6 in dry Concrete Mix (1101 TDS)
  capIn: 3, // stop concrete 3–4 in below grade and top with soil (Fast-Setting TDS, how-to page)
  dryPourGalPer50Lb: 1, // Fast-Setting dry pour: ~1 gal per 50 lb bag, soil dependent
  maxLiftIn: 30, // Fast-Setting: holes deeper than 30 in are filled in lifts of 30 in or less
  belowFrostIn: 6, // structural posts: hole ≥ 6 in below the frost line (Quikrete Setting Posts project sheet)
} as const;

/** Mixes compared on the post calculator: Fast-Setting is poured dry, Concrete Mix is mixed first. */
export const POST_MIX_ROWS: { productId: ProductId; size: BagSize }[] = [
  { productId: "fast", size: 50 },
  { productId: "fast", size: 60 },
  { productId: "standard", size: 80 },
  { productId: "standard", size: 60 },
];

/** Post/hole pairs and depths Quikrete's online calculator offers (round posts, calculator.js). */
export const QUIKRETE_CALC_PAIRS = [
  [2, 6],
  [3, 9],
  [4, 12],
  [6, 18],
] as const;
export const QUIKRETE_CALC_DEPTHS = [24, 30, 36, 42, 48] as const;
/** Fast-Setting TDS claim: two 50 lb bags set a 3 in square post in a 9 in hole 30 in deep. */
export const QUIKRETE_TWO_BAG_CLAIM = { postIn: 3, holeIn: 9, depthIn: 30, bags: 2 } as const;
/** Sakrete Fast Setting TDS (Rev. 05/18) — 50 lb bags per post, "based on average 10 in diameter hole". */
export const SAKRETE_POST_TABLE = {
  holeIn: 10,
  yieldCuft: 0.38,
  rows: [
    [12, 1.25],
    [18, 2],
    [24, 2.5],
    [30, 3],
  ],
} as const;

/* ───────── round forms (Sonotube / Quik-Tube) ───────── */

export const TUBE_DIAMETERS = [6, 8, 10, 12, 14, 16, 18, 24] as const;

export const TUBE_RULES = {
  holeTimesDia: 2, // Quik-Tube TDS: dig a hole twice the tube diameter
  gravelIn: 2, // footing method: ~2 in of gravel in the bottom of the hole
  footingIn: 6, // then a 4–6 in footing under the tube
  braceAboveFt: 2, // brace (collar/frame) when the tube extends 2 ft or more above grade
  maxAboveGradeFt: 3, // Quik-Tube & Sonoco Builder's Tube: below grade and up to 3 ft above
  stockLengthFt: 4, // 4 ft is the stock length; 10 & 12 ft regionally
  longLengthFt: 12,
} as const;

/** Quik-Tube TDS Table 1 — bags per tube at 1/2/3/4 ft of depth. */
export const QUIKTUBE_TABLE: Record<number, Record<60 | 80, readonly number[]>> = {
  6: { 60: [1, 1, 2, 2], 80: [1, 1, 1, 2] },
  8: { 60: [1, 2, 3, 4], 80: [1, 2, 2, 3] },
  10: { 60: [2, 3, 4, 5], 80: [1, 2, 3, 4] },
  12: { 60: [2, 4, 6, 7], 80: [2, 3, 4, 6] },
};

/** Sonoco Sonotube Builder's Tube — bags per 4 ft of tube. Sonoco rounds the 12 in up to 8 × 60 lb. */
export const SONOCO_4FT: Record<number, Record<60 | 80, number>> = {
  8: { 60: 4, 80: 3 },
  10: { 60: 5, 80: 4 },
  12: { 60: 8, 80: 6 },
  16: { 60: 13, 80: 10 },
};

/** Home Depot Sakrete 48 in form tube prices, Jul 13 2026 (Glassit tracker). */
export const FORM_TUBE_PRICE: Record<number, number> = { 8: 10.88, 10: 14.48 };

/* ───────── footings (IRC 2021, model text) ───────── */

export const IRC_FOOTING = {
  minWidthIn: 12, // R403.1.1
  minThickIn: 6, // R403.1.1
  minProjectionIn: 2, // R403.1.1: projection ≥ 2 in and ≤ footing thickness
  minDepthBelowGradeIn: 12, // R403.1.4 and, for decks, R507.3.2
  coverIn: 3, // R403.1.3.5.3: bars in concrete cast against earth
  barLbPerFt: REBAR.driveway.lbPerFt, // #4
} as const;

/** Excerpt of IRC 2021 Table R403.1(1), light-frame construction: footing width × thickness (in)
 *  by soil bearing value. Rows not shown here are 12 × 6 at every soil value listed. */
export const IRC_FOOTING_TABLE = {
  soils: ["1,500 psf", "2,000 psf", "2,500 psf +"],
  groups: [
    {
      load: "20 psf roof live load / 25 psf ground snow",
      rows: [
        ["1 story, slab-on-grade", "12 × 6", "12 × 6", "12 × 6"],
        ["1 story, plus basement", "16 × 6", "12 × 6", "12 × 6"],
        ["2 story, crawl space", "15 × 6", "12 × 6", "12 × 6"],
        ["2 story, plus basement", "19 × 6", "14 × 6", "12 × 6"],
      ],
    },
    {
      load: "50 psf ground snow",
      rows: [
        ["1 story, slab-on-grade", "12 × 6", "12 × 6", "12 × 6"],
        ["1 story, plus basement", "18 × 6", "13 × 6", "12 × 6"],
        ["2 story, crawl space", "17 × 6", "13 × 6", "12 × 6"],
        ["2 story, plus basement", "21 × 7", "15 × 6", "12 × 6"],
      ],
    },
  ],
} as const;

/* ───────── steps (IRC 2021 R311 / R312) ───────── */

export const IRC_STAIRS = {
  maxRiserIn: 7.75, // R311.7.5.1 (risers, like treads, may vary by no more than ⅜ in within a flight)
  minTreadIn: 10, // R311.7.5.2
  noNosingTreadIn: 11, // R311.7.5.3 exception: no nosing needed when treads are ≥ 11 in
  handrailRisers: 4, // R311.7.8: handrail on at least one side of flights with 4+ risers
  landingMinIn: 36, // R311.3: landing ≥ 36 in in the direction of travel, ≥ door width
  guardAboveIn: 30, // R312.1: guards where the walking surface is > 30 in above grade
} as const;

/** Project presets → recommended thickness (inches) and notes. */
export const PROJECTS = [
  { id: "patio", label: "Patio", thickness: 4, note: "4 in over 4 in of compacted gravel; slope 1/8 in per foot away from the house." },
  { id: "walkway", label: "Walkway", thickness: 4, note: "4 in is standard; 3.5 in (a 2×4 form) is the code minimum for slabs on ground." },
  { id: "shed", label: "Shed base", thickness: 4, note: "4 in for sheds; go 5–6 in with thickened edges for heavy workshops." },
  { id: "hottub", label: "Hot tub pad", thickness: 6, note: "Most spa makers ask for 4–6 in; a filled 6-person tub can top 5,000 lb." },
  { id: "driveway", label: "Driveway", thickness: 5, note: "5–6 in for cars; 6 in with #4 rebar for trucks, RVs or poor soil." },
  { id: "garage", label: "Garage floor", thickness: 5, note: "IRC asks for 3,500 psi in severe-weather regions for garage floors." },
] as const;

export const THICKNESS_OPTIONS = [
  { value: 3.5, label: "3.5 in", sub: "2×4 form" },
  { value: 4, label: "4 in", sub: "standard" },
  { value: 5.5, label: "5.5 in", sub: "2×6 form" },
  { value: 6, label: "6 in", sub: "heavy duty" },
];

const SOURCE = {
  qk1101: {
    label: "Quikrete Concrete Mix No. 1101 — technical data sheet",
    url: "https://www.quikrete.com/PDFs/DATA_SHEET-Concrete%20Mix%201101.pdf",
    note: "bag yields (80 lb = 0.60 cu ft, 60 lb = 0.45, 50 lb = 0.375, 40 lb = 0.30), water per bag, curing times; post method: 6 in of dry mix in the hole bottom, 24 h before strain",
    checked: CONCRETE_CHECKED,
  },
  qk5000: {
    label: "Quikrete 5000 No. 1007 — technical data sheet",
    url: "https://www.quikrete.com/PDFs/DATA_SHEET-QUIKRETE%205000%201007.pdf",
    note: "5,000 psi strength curve, 10–12 h walk-on",
    checked: CONCRETE_CHECKED,
  },
  qkFast: {
    label: "Quikrete Fast-Setting No. 1004 — technical data sheet (rev. Nov 2025)",
    url: "https://www.quikrete.com/PDFs/DATA_SHEET-Fast%20Setting%20Concrete%20Mix%201004-50.pdf",
    note: "50 lb = 0.375 cu ft, 20–40 min set, hole 3× post width and 1/3 of post length, ~1 gal water per bag, 30 in lifts, 4 h before loading a post",
    checked: CONCRETE_CHECKED,
  },
  qkCrack: {
    label: "Quikrete Crack-Resistant No. 1006 — technical data sheet",
    url: "https://www.quikrete.com/PDFs/DATA_SHEET-Crack%20Resistant%20Concrete%20Mix%201006-80.pdf",
    note: "4–8% entrained air for freeze–thaw exposure; same yields per bag weight",
    checked: CONCRETE_CHECKED,
  },
  sakrete: {
    label: "Sakrete High-Strength Concrete Mix — TDS",
    url: "https://www.sakrete.com/wp-content/uploads/2024/01/Sakrete-High-Strength-Concrete-Mix-TDS.pdf",
    note: "same yields per bag weight; Sakrete recommends +10% overage",
    checked: CONCRETE_CHECKED,
  },
  sakreteFast: {
    label: "Sakrete Fast Setting Concrete Mix — TDS (Rev. 05/18)",
    url: "https://www.sakrete.com/wp-content/uploads/2021/07/Fast-Setting-Concrete.pdf",
    note: "post table for a 10 in hole: 12 in 1.25, 18 in 2, 24 in 2.5, 30 in 3 bags (50 lb)",
    checked: CONCRETE_CHECKED,
  },
  sakreteGravel: {
    label: "Sakrete All-Purpose Gravel — product page & TDS",
    url: "https://www.sakrete.com/product/all-purpose-gravel/",
    note: "0.5 cu ft bag (≈3 sq ft at 2 in); 60 lb bag ≈ 0.6 cu ft",
    checked: CONCRETE_CHECKED,
  },
  qkPostsHowTo: {
    label: "Quikrete — How to set fence posts (how-to page) and Setting Posts project sheet",
    url: "https://www.quikrete.com/athome/SettingPostsInstructions.asp",
    note: "hole 3× post width, 6 in gravel base, concrete to 3–4 in below grade; structural posts 6 in below the frost line (https://www.quikrete.com/PDFs/Projects/SettingPosts.pdf)",
    checked: CONCRETE_CHECKED,
  },
  qkCalculator: {
    label: "Quikrete online concrete calculator (calculator.js)",
    url: "https://www.quikrete.com/calculator/main.asp",
    note: "post formula: (hole area − post area) × depth ÷ 1,728 ÷ 0.375, rounded up; post/hole pairs 2/6, 3/9, 4/12, 6/18 in",
    checked: CONCRETE_CHECKED,
  },
  quikTube: {
    label: "Quikrete QUIK-TUBE Building Form No. 6922 — technical data sheet",
    url: "https://www.quikrete.com/PDFs/DATA_SHEET-QUIK-TUBE%206922.pdf",
    note: "Table 1 bags per 1–4 ft of 6/8/10/12 in tube; hole 2× tube diameter; 2 in gravel and a 4–6 in footing; brace at 2 ft above grade; up to 3 ft above grade",
    checked: CONCRETE_CHECKED,
  },
  sonotube: {
    label: "Sonoco Sonotube Builder's Tube",
    url: "https://www.sonoco.com/na/products/industrial-paper-packaging/tubes-cores/sonotube-concrete-forms/builders-tube",
    note: "bags per 4 ft: 8 in 4×60/3×80, 10 in 5/4, 12 in 8/6, 16 in 13/10; below grade and up to 3 ft above",
    checked: CONCRETE_CHECKED,
  },
  tubePrice: {
    label: "Home Depot Sakrete 48 in form tubes — price history (Glassit)",
    url: "https://glassit.co/price-history/home-depot/sakrete-10-in-x-48-in-concrete-form-tube/1693186637",
    note: "8 in × 48 in $10.88, 10 in × 48 in $14.48 (Jul 13, 2026, one tracked store)",
    checked: CONCRETE_CHECKED,
  },
  retail: {
    label: "Home Depot & Lowe's listings — Quikrete 80 lb Concrete Mix",
    url: "https://www.lowes.com/pd/QUIKRETE-80-lb-High-Strength-Concrete-Mix/3006075",
    note: "$5.98–$6.98 per 80-lb bag; $5.93 bulk tier at 42+ bags; 42 bags per pallet; Fast-Setting 50 lb $7.97",
    checked: CONCRETE_CHECKED,
  },
  rebarPrice: {
    label: "Ernest Maier — #3 and #4 steel rebar listings",
    url: "https://ernestmaier.com/product/4-steel-rebar/",
    note: "#4 $0.51/ft and #3 $0.31/ft, sold in 20 ft lengths (2026)",
    checked: CONCRETE_CHECKED,
  },
  readyMix: {
    label: "Published 2026 ready-mix plant price sheets (e.g. Gehring Concrete)",
    url: "https://gehringconcrete.com/Products/Ready-Mix-Products-Pricing",
    note: "$146–$285 per yd³ before fees; short-load fees $50–$200",
    checked: CONCRETE_CHECKED,
  },
  ppi: {
    label: "BLS Producer Price Index — ready-mix concrete (via FRED)",
    url: "https://fred.stlouisfed.org/series/PCU3273232732",
    note: "+2.3% Sept 2025 → Sept 2026",
    checked: CONCRETE_CHECKED,
  },
  ircSlab: {
    label: "International Residential Code 2021 — R506 & Table R402.2 (model text)",
    url: "https://up.codes/viewer/pennsylvania/irc-2021/chapter/5/floors",
    note: "3.5 in minimum slab, 4 in base course, 6-mil poly vapor retarder under heated slabs (not patios, walks, driveways or garages), minimum strength and air by exposure",
    checked: CONCRETE_CHECKED,
  },
  ircFootings: {
    label: "International Residential Code 2021 — R403.1 footings & Table R403.1(1)",
    url: "https://up.codes/viewer/pennsylvania/irc-2021/chapter/4/foundations",
    note: "12 × 6 in minimum footing, width by soil bearing, 12 in below undisturbed ground, 3 in cover over bars cast against earth; deck footings R507.3",
    checked: CONCRETE_CHECKED,
  },
  ircStairs: {
    label: "International Residential Code — R311.7.5 stair treads & risers (Boise IRC handout #437)",
    url: "https://www.cityofboise.org/media/14405/437-treads-risers_march-2022.pdf",
    note: "7¾ in maximum riser, 10 in minimum tread, 3/8 in variation; no nosing needed at 11 in treads",
    checked: CONCRETE_CHECKED,
  },
  ircLandings: {
    label: "IRC 2021 R311.3 landings at exterior doors (UpCodes)",
    url: "https://up.codes/s/floors-and-landings-at-exterior-doors",
    note: "landing ≥ door width and ≥ 36 in deep, ≤ 2% slope, up to 7¾ in below the threshold if the door does not swing over it",
    checked: CONCRETE_CHECKED,
  },
  ircHandrails: {
    label: "IRC R311.7.8 handrails & R312.1 guards (Knox County IRC stair handout)",
    url: "https://www.KnoxCounty.org/codes/pdfs/construction_info/Stairs.pdf",
    note: "handrail 34–38 in high on flights with 4 or more risers; guards where a surface is more than 30 in above grade",
    checked: CONCRETE_CHECKED,
  },
} satisfies Record<string, SourceRef>;

export type ConcreteSourceKey = keyof typeof SOURCE;

/** Every source the concrete family relies on. */
export const CONCRETE_SOURCES: SourceRef[] = Object.values(SOURCE);

/** The subset of sources a single calculator actually uses. */
export function concreteSources(...keys: ConcreteSourceKey[]): SourceRef[] {
  return keys.map((k) => SOURCE[k]);
}
