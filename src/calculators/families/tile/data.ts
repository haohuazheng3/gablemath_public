// Tile data, checked against manufacturer technical data sheets (TDS), install guides, carton specs and
// dated retail listings. See research/tile*.json for the full evidence trail (URLs, quotes, dates).
// Coverage figures are the MINIMUM of each published range so purchase quantities never run short.

import type { SourceRef } from "@/calculators/types";

export const TILE_CHECKED = "2026-10-23";

/* ───────── tile formats ───────── */

export type TileSizeId = "mosaic" | "3x6" | "4x12" | "4x4" | "6x24" | "12x12" | "12x24" | "24x24" | "24x48" | "custom";

export interface TileFormat {
  id: TileSizeId;
  label: string;
  sub: string;
  /** Actual face size in inches, long side first. Nominal sizes run small: a "12×24" is 11.7 × 23.5. */
  longIn: number;
  shortIn: number;
  /** Tile thickness, inches — the grout joint is this deep. */
  thickIn: number;
  pcsPerBox: number;
  /** Counted by the 12 × 12 in sheet (≈1 sq ft); grout and thinset follow the chip size instead. */
  sheet?: boolean;
  jointIn: number;
  price: number;
  priceUnit: "sqft" | "piece";
  material: "porcelain" | "ceramic";
  wallOnly?: boolean;
  /** Where the carton numbers come from. */
  basis: string;
}

export const TILE_FORMATS: TileFormat[] = [
  {
    id: "mosaic",
    label: "Mosaic",
    sub: "12×12 sheets",
    longIn: 12,
    shortIn: 12,
    thickIn: 0.25,
    pcsPerBox: 1,
    sheet: true,
    jointIn: 0.0625,
    price: 14.99, // F&D mosaic category median per sheet, n=96 (2026-10-23)
    priceUnit: "piece",
    material: "porcelain",
    basis: "Sold by the sheet; a 12 × 12 in sheet covers about 1 sq ft. Some sheets are 10 × 11 or 11 × 13 in — check the label.",
  },
  {
    id: "3x6",
    label: "3×6",
    sub: "subway",
    longIn: 6,
    shortIn: 3,
    thickIn: 0.394, // 10 mm
    pcsPerBox: 80,
    jointIn: 0.125,
    price: 0.15, // F&D Bright White Ice, per piece
    priceUnit: "piece",
    material: "ceramic",
    wallOnly: true,
    basis: "Floor & Decor Bright White Ice: 3 × 6 in, 10 mm, 80 pieces (10 sq ft) per box, 1/8 in joint suggested.",
  },
  {
    id: "4x12",
    label: "4×12",
    sub: "subway",
    longIn: 11.81,
    shortIn: 3.94,
    thickIn: 0.31, // 7.87 mm
    pcsPerBox: 15,
    jointIn: 0.125,
    price: 3.12, // Floors Center sale price, MSI Domino
    priceUnit: "sqft",
    material: "ceramic",
    basis: "MSI Domino 4×12: 15 pieces = 4.85 sq ft per box (0.323 sq ft each, a true 100 × 300 mm). Daltile's 4×12 cartons hold 28 pieces of 4¼ × 12⅞ in — check yours.",
  },
  {
    id: "4x4",
    label: "4×4",
    sub: "4¼ wall",
    longIn: 4.25,
    shortIn: 4.25,
    thickIn: 0.313, // 7.95 mm
    pcsPerBox: 100,
    jointIn: 0.0625,
    price: 2.94, // Floors Center sale price, Daltile Color Wheel Classic
    priceUnit: "sqft",
    material: "ceramic",
    wallOnly: true,
    basis: "Daltile Color Wheel Classic: actual 4¼ × 4¼ in, 7.95 mm, 100 pieces = 12.5 sq ft per box.",
  },
  {
    id: "6x24",
    label: "6×24",
    sub: "plank",
    longIn: 23.37,
    shortIn: 5.75,
    thickIn: 0.311, // 7.9 mm
    pcsPerBox: 11,
    jointIn: 0.125,
    price: 2.99, // F&D porcelain median, all sizes
    priceUnit: "sqft",
    material: "porcelain",
    basis: "Daltile 6×24 rectified planks: 5¾ × 23⅜ in actual, 11 pieces = 10.23 sq ft per box.",
  },
  {
    id: "12x12",
    label: "12×12",
    sub: "ceramic",
    longIn: 11.81,
    shortIn: 11.81,
    thickIn: 0.375, // typical 9–10 mm floor tile
    pcsPerBox: 17,
    jointIn: 0.125,
    price: 0.99, // F&D ceramic floor tile typical
    priceUnit: "sqft",
    material: "ceramic",
    basis: "Daltile Memoir 12×12: 11.81 in actual, 17 pieces = 16.49 sq ft per box.",
  },
  {
    id: "12x24",
    label: "12×24",
    sub: "porcelain",
    longIn: 23.5,
    shortIn: 11.7,
    thickIn: 0.354, // 9 mm
    pcsPerBox: 7,
    jointIn: 0.125,
    price: 2.49, // F&D 12x24 porcelain median, n=30
    priceUnit: "sqft",
    material: "porcelain",
    basis: "Floor & Decor Venato 12×24: 11.70 × 23.50 in, 9 mm, 7 pieces = 13.44 sq ft per box (other brands pack 8).",
  },
  {
    id: "24x24",
    label: "24×24",
    sub: "porcelain",
    longIn: 23.62,
    shortIn: 23.62,
    thickIn: 0.375,
    pcsPerBox: 4,
    jointIn: 0.125,
    price: 2.99, // F&D porcelain median, all sizes
    priceUnit: "sqft",
    material: "porcelain",
    basis: "Daltile Median 24×24: 23.62 in actual, 4 pieces = 15.5 sq ft per box.",
  },
  {
    id: "24x48",
    label: "24×48",
    sub: "large format",
    longIn: 47.08,
    shortIn: 23.5,
    thickIn: 0.256, // 6.5 mm
    pcsPerBox: 3,
    jointIn: 0.125,
    price: 3.99, // F&D 24x48 median, n=38
    priceUnit: "sqft",
    material: "porcelain",
    basis: "Floor & Decor Napoli 24×48: 23.50 × 47.08 in, 6.5 mm, 3 pieces (7.75 sq ft each) per box.",
  },
  {
    id: "custom",
    label: "Custom",
    sub: "your carton",
    longIn: 24,
    shortIn: 12,
    thickIn: 0.375,
    pcsPerBox: 8,
    jointIn: 0.125,
    price: 2.99,
    priceUnit: "sqft",
    material: "porcelain",
    basis: "Enter the actual size and pieces per box printed on your carton.",
  },
];

export function tileFormat(id: string): TileFormat {
  return TILE_FORMATS.find((t) => t.id === id) ?? TILE_FORMATS.find((t) => t.id === "12x24")!;
}

/** Chip sizes offered for mosaic sheets (inches, square equivalent). */
export const MOSAIC_CHIPS = [1, 2, 3] as const;

export const JOINT_OPTIONS = [
  { value: 0.0625, label: "1/16", sub: "rectified" },
  { value: 0.125, label: "1/8", sub: "most tile" },
  { value: 0.1875, label: "3/16", sub: "pressed edge" },
  { value: 0.25, label: "1/4", sub: "rustic" },
];

/* ───────── layout & waste ───────── */

export type PatternId = "straight" | "offset13" | "offset12" | "diagonal" | "herringbone";

/** Cut-waste rules of thumb: MSI says 10–15% by pattern; herringbone runs 15–20%. Labelled as estimates in the UI. */
export const PATTERNS: { id: PatternId; label: string; sub: string; waste: number }[] = [
  { id: "straight", label: "Straight", sub: "grid", waste: 10 },
  { id: "offset13", label: "⅓ offset", sub: "brick", waste: 12 },
  { id: "offset12", label: "½ offset", sub: "brick", waste: 12 },
  { id: "diagonal", label: "Diagonal", sub: "45°", waste: 15 },
  { id: "herringbone", label: "Herringbone", sub: "90°", waste: 20 },
];

export const WASTE_RULES = {
  largeFormatIn: 24, // tiles with a side ≥ 24 in: 12–15% even when laid straight
  largeFormatPct: 15,
  smallRoomSqFt: 40, // rooms under 40 sq ft: add 5%
  smallRoomAddPct: 5,
  atticPct: 10, // Daltile: buy ~10% attic stock from the same lot for repairs
};

/** Tiles with any side longer than this need an LHT/LFT mortar and back-buttering (Custom FAQ). */
export const LFT_SIDE_IN = 15;
/** ANSI A108.02: running-bond offsets on tiles longer than 18 in should not exceed 33% unless the maker allows it. */
export const OFFSET_LIMIT_SIDE_IN = 18;

/* ───────── trowels & thinset ───────── */

export type TrowelId = "v" | "sq14" | "sq38" | "sq12" | "u45" | "u30";

export interface Trowel {
  id: TrowelId;
  label: string;
  short: string;
  /**
   * Effective bed depth (in) for the ratio model coverage = coverage(1/4 sq) × 0.125 / tEff.
   * Calibrated on Custom ProLite (90 / 63 / 45 sq ft at 1/4, 1/4×3/8 and 1/2 notch; U-notch 36 at 45°, 45 at 30°).
   */
  tEff: number | null;
}

export const TROWELS: Trowel[] = [
  { id: "v", label: "3/16 × 5/32 V-notch", short: "3/16 V", tEff: null },
  { id: "sq14", label: "1/4 × 1/4 square-notch", short: "¼ × ¼", tEff: 0.125 },
  { id: "sq38", label: "1/4 × 3/8 square-notch", short: "¼ × ⅜", tEff: 0.1875 },
  { id: "sq12", label: "1/2 × 1/2 square-notch", short: "½ × ½", tEff: 0.25 },
  { id: "u45", label: "3/4 × 9/16 × 3/8 U-notch held at 45°", short: "¾ U · 45°", tEff: 0.3125 },
  { id: "u30", label: "3/4 × 9/16 × 3/8 U-notch held at 30°", short: "¾ U · 30°", tEff: 0.25 },
];

export function trowel(id: string): Trowel {
  return TROWELS.find((t) => t.id === id) ?? TROWELS[2];
}

export type CovRange = readonly [number, number];

export interface Mortar {
  id: string;
  brand: string;
  name: string;
  short: string;
  /** Bag weight as sold (lb), or 1 for a 1-gal pail. */
  size: number;
  unit: "lb" | "gal";
  /** Lightweight bags cover what a heavier standard bag covers. */
  equivalent?: string;
  /** Published coverage per bag/pail by trowel, sq ft [min, max]. */
  cov: Partial<Record<TrowelId, CovRange>>;
  /** Trowels the maker no longer recommends with this product. */
  notRecommended?: TrowelId[];
  /** Note shown when a row is the maker's substitute trowel (e.g. TEC's slant notch). */
  trowelNotes?: Partial<Record<TrowelId, string>>;
  /** true = rated for large & heavy tile (ANSI "H"/LHT), false = explicitly not; undefined = not stated. */
  lht?: boolean;
  maxBedIn?: number;
  /** Largest tile the maker recommends (in, longest side). */
  maxTileIn?: number;
  price?: number;
  /** Mixing water, US quarts per bag. */
  waterQt?: readonly [number, number];
  /** Approximate wet volume of one bag (in³) — used for the back-butter estimate. */
  yieldIn3: number;
  note: string;
  group: "Store brand" | "Custom Building Products" | "MAPEI" | "LATICRETE" | "TEC";
}

/** Wet volume of a mixed 50-lb-equivalent bag: (50 lb + 5.5 qt water) ÷ 12.6 lb/gal = 4.88 gal (LATICRETE 253 DS-296). */
export const MORTAR_YIELD_50_IN3 = 1127;
/** Back-butter (flat back-trowel) skim coat for tiles over 15 in; charts exclude it (Custom). */
export const BACK_BUTTER_IN = 1 / 32;
export const MORTAR_WASTE_PCT = 10;

export const MORTARS: Mortar[] = [
  {
    id: "basic",
    brand: "Store brand",
    name: "Basic 50-lb modified thinset",
    short: "Store-brand thinset",
    size: 50,
    unit: "lb",
    // Lowest published minimum among 50-lb-equivalent bags at each notch (Ultraflex 2, TEC 3N1, LATICRETE 254, MAPEI LHT).
    // V-notch: only LATICRETE 253 publishes a 50-lb V-notch rate (110 sq ft at 1/4 × 3/16 V) — a 3/16 V uses less, so this over-orders slightly.
    cov: { v: [110, 110], sq14: [75, 75], sq38: [55, 55], sq12: [35, 35], u45: [25, 25], u30: [25, 25] },
    lht: false,
    price: 13.99, // F&D basic 50-lb thinsets $13.13–$14.30
    yieldIn3: MORTAR_YIELD_50_IN3,
    note: "No-name bags rarely print a full coverage chart, so this uses the lowest coverage any major brand publishes for each trowel.",
    group: "Store brand",
  },
  {
    id: "versabond",
    brand: "Custom",
    name: "Custom VersaBond Professional (MTSG50)",
    short: "VersaBond",
    size: 50,
    unit: "lb",
    cov: { sq14: [85, 95], sq38: [60, 67], sq12: [42, 47], u45: [34, 38], u30: [42, 47] },
    notRecommended: ["sq12"],
    lht: true,
    maxBedIn: 0.5,
    price: 19.99,
    yieldIn3: MORTAR_YIELD_50_IN3,
    note: "ANSI A118.4H fortified thinset — the Home Depot standard. Up to 1/2 in thick on floors.",
    group: "Custom Building Products",
  },
  {
    id: "versabond-lht",
    brand: "Custom",
    name: "Custom VersaBond LHT Large & Heavy Tile (formerly VersaBond-LFT)",
    short: "VersaBond LHT",
    size: 50,
    unit: "lb",
    cov: { sq14: [90, 100], sq38: [60, 67], sq12: [42, 47], u45: [34, 38], u30: [42, 47] },
    notRecommended: ["sq12"],
    lht: true,
    maxBedIn: 0.75,
    yieldIn3: MORTAR_YIELD_50_IN3,
    note: "Non-sag A118.4HT mortar for large and heavy tile, beds up to 3/4 in.",
    group: "Custom Building Products",
  },
  {
    id: "versabond-lite",
    brand: "Custom",
    name: "Custom VersaBond LITE (35 lb)",
    short: "VersaBond LITE",
    size: 35,
    unit: "lb",
    equivalent: "= a 50-lb bag",
    cov: { sq14: [90, 100], sq38: [63, 70], u45: [36, 40], u30: [36, 40] },
    lht: true,
    yieldIn3: MORTAR_YIELD_50_IN3,
    note: "35-lb bag that covers what a 50-lb bag does — 30% less to carry. ANSI A118.4HET.",
    group: "Custom Building Products",
  },
  {
    id: "prolite",
    brand: "Custom",
    name: "Custom ProLite Premium Large Format (30 lb)",
    short: "ProLite",
    size: 30,
    unit: "lb",
    equivalent: "= a 50-lb bag",
    cov: { sq14: [90, 100], sq38: [63, 70], sq12: [45, 50], u45: [36, 40], u30: [45, 50] },
    notRecommended: ["sq12"],
    lht: true,
    maxBedIn: 0.75,
    price: 36.99,
    yieldIn3: MORTAR_YIELD_50_IN3,
    note: "Lightweight A118.15HET mortar for large-format tile; 30 lb covers like 50 lb.",
    group: "Custom Building Products",
  },
  {
    id: "megalite",
    brand: "Custom",
    name: "Custom MegaLite Crack Prevention LFT (30 lb)",
    short: "MegaLite",
    size: 30,
    unit: "lb",
    equivalent: "= a 50-lb bag",
    cov: { sq14: [90, 100], sq38: [63, 70], sq12: [45, 50], u45: [36, 40], u30: [45, 50] },
    notRecommended: ["sq12"],
    lht: true,
    maxBedIn: 0.75,
    yieldIn3: MORTAR_YIELD_50_IN3,
    note: "Top-tier lightweight LFT mortar with built-in crack prevention.",
    group: "Custom Building Products",
  },
  {
    id: "simpleset",
    brand: "Custom",
    name: "Custom SimpleSet Pre-Mixed Thin-Set (1 gal)",
    short: "SimpleSet pre-mix",
    size: 1,
    unit: "gal",
    cov: { v: [40, 44], sq14: [20, 25], sq38: [14, 17] },
    lht: false,
    maxTileIn: 15,
    yieldIn3: 231,
    note: "Ready-to-use pail for walls and backsplashes; recommended for tile up to 8×8 (one side up to 15 in with longer dry time).",
    group: "Custom Building Products",
  },
  {
    id: "ultraflex2",
    brand: "MAPEI",
    name: "MAPEI Ultraflex 2",
    short: "Ultraflex 2",
    size: 50,
    unit: "lb",
    cov: { sq14: [75, 90], sq38: [55, 65] },
    lht: false,
    maxBedIn: 0.25,
    price: 29.65,
    waterQt: [5, 6],
    yieldIn3: MORTAR_YIELD_50_IN3,
    note: "ANSI A118.4E / A118.11 polymer-modified mortar for standard-size tile (not rated large & heavy).",
    group: "MAPEI",
  },
  {
    id: "ultraflex-lft",
    brand: "MAPEI",
    name: "MAPEI Ultraflex LFT",
    short: "Ultraflex LFT",
    size: 50,
    unit: "lb",
    cov: { sq14: [85, 95], sq38: [65, 75], sq12: [40, 50], u45: [35, 40], u30: [35, 40] },
    lht: true,
    price: 29.99,
    yieldIn3: MORTAR_YIELD_50_IN3,
    note: "ANSI A118.15HET large-format mortar — the Floor & Decor LFT staple.",
    group: "MAPEI",
  },
  {
    id: "ultraflex-lht-sg",
    brand: "MAPEI",
    name: "MAPEI Ultraflex LHT SG",
    short: "Ultraflex LHT SG",
    size: 50,
    unit: "lb",
    cov: { sq14: [75, 90], sq38: [55, 65], sq12: [38, 45], u45: [25, 30], u30: [25, 30] },
    lht: true,
    maxBedIn: 0.5,
    price: 24.99,
    yieldIn3: MORTAR_YIELD_50_IN3,
    note: "Large & heavy tile mortar; MAPEI rates it for beds up to 1/2 in (not 3/4).",
    group: "MAPEI",
  },
  {
    id: "keraflex-super",
    brand: "MAPEI",
    name: "MAPEI Keraflex Super (44 lb)",
    short: "Keraflex Super",
    size: 44,
    unit: "lb",
    cov: { sq14: [100, 115], sq38: [74, 83], sq12: [50, 58], u45: [34, 38], u30: [34, 38] },
    lht: true,
    maxBedIn: 0.5,
    price: 36.99,
    yieldIn3: (MORTAR_YIELD_50_IN3 * 44) / 50,
    note: "Sold in 44-lb (20 kg) bags, not 50 — compare by coverage, not weight.",
    group: "MAPEI",
  },
  {
    id: "lat253",
    brand: "LATICRETE",
    name: "LATICRETE 253 Gold",
    short: "253 Gold",
    size: 50,
    unit: "lb",
    // The V-notch row is LATICRETE's 1/4 × 3/16 V-notch rate (a larger notch than 3/16 × 5/32, so it over-orders slightly).
    cov: { v: [110, 120], sq14: [80, 95], sq38: [60, 70] },
    price: 24.56,
    waterQt: [5.5, 5.5],
    yieldIn3: MORTAR_YIELD_50_IN3,
    note: "Multipurpose polymer-fortified thinset, widely stocked at Floor & Decor.",
    group: "LATICRETE",
  },
  {
    id: "lat254",
    brand: "LATICRETE",
    name: "LATICRETE 254 Platinum",
    short: "254 Platinum",
    size: 50,
    unit: "lb",
    cov: { sq14: [80, 95], sq38: [60, 70], sq12: [35, 40] },
    price: 51.43,
    waterQt: [5.5, 6],
    yieldIn3: MORTAR_YIELD_50_IN3,
    note: "Premium all-in-one mortar; note its 1/2 in notch row (35–40) is the lowest of any brand.",
    group: "LATICRETE",
  },
  {
    id: "multimax-lite",
    brand: "LATICRETE",
    name: "LATICRETE MultiMax Lite (25 lb)",
    short: "MultiMax Lite",
    size: 25,
    unit: "lb",
    equivalent: "= a 50-lb bag",
    cov: { sq14: [85, 95], sq38: [60, 70], sq12: [40, 50] },
    lht: true,
    price: 48.99,
    yieldIn3: MORTAR_YIELD_50_IN3,
    note: "Lightweight mortar for large and heavy tile; 25 lb covers like 50 lb.",
    group: "LATICRETE",
  },
  {
    id: "tec3n1",
    brand: "TEC",
    name: "TEC 3N1 Performance Mortar (30 lb)",
    short: "TEC 3N1",
    size: 30,
    unit: "lb",
    cov: { sq14: [80, 90], sq38: [55, 65], sq12: [40, 50], u45: [30, 40], u30: [30, 40] },
    trowelNotes: {
      sq12: "TEC lists a 3/8 in slant notch in place of the 1/2 × 1/2 square notch (40–50 sq ft).",
      u45: "TEC's chart row is a 3/4 in rounded notch (30–40 sq ft).",
      u30: "TEC's chart row is a 3/4 in rounded notch (30–40 sq ft).",
    },
    notRecommended: ["sq12"],
    yieldIn3: MORTAR_YIELD_50_IN3,
    note: "Lightweight 30-lb bag sold at Lowe's.",
    group: "TEC",
  },
];

export function mortar(id: string): Mortar {
  return MORTARS.find((m) => m.id === id) ?? MORTARS[1];
}

/** Minimum mortar contact (Custom TDS): 80% of the tile back in dry interiors, 95% in wet areas and outdoors. */
export const CONTACT = { dry: 80, wet: 95 };

/* ───────── grout ───────── */

export type GroutKind = "sanded" | "unsanded" | "premixed" | "epoxy";

export interface GroutPack {
  /** lb for cement grouts; joint volume in³ for pre-mixed and epoxy units */
  amount: number;
  label: string;
  price?: number;
}

export interface Grout {
  id: string;
  name: string;
  short: string;
  kind: GroutKind;
  /** Cement grouts: lb per cubic inch of joint, calibrated so the formula reproduces the maker's coverage table. */
  k?: number;
  /** K for chips 2 in and smaller, where the module method under-orders this product. */
  mosaicK?: number;
  packs: GroutPack[];
  jointMin: number;
  jointMax: number;
  water?: string;
  note: string;
}

/** LATICRETE's grout calculator rule: order 10% over the calculated joint volume. */
export const GROUT_EXTRA_PCT = 10;

export const GROUTS: Grout[] = [
  {
    id: "keracolor-s",
    name: "MAPEI Keracolor S sanded",
    short: "Keracolor S",
    kind: "sanded",
    k: 0.0589,
    mosaicK: 0.0735, // back-solved from the TDS 1×1 row; K 0.0589 under-orders mosaics ~20%
    packs: [{ amount: 25, label: "25-lb bag", price: 14.48 }],
    jointMin: 0.125,
    jointMax: 0.625,
    water: "2 qt per 25-lb bag",
    note: "Budget sanded grout for joints 1/8 to 5/8 in.",
  },
  {
    id: "polyblend-sanded",
    name: "Custom Polyblend Plus Sanded",
    short: "Polyblend Plus sanded",
    kind: "sanded",
    k: 0.0647,
    packs: [
      { amount: 25, label: "25-lb bag" },
      { amount: 7, label: "7-lb box" },
    ],
    jointMin: 0.125,
    jointMax: 0.5,
    water: "2–2.5 qt per 25-lb bag",
    note: "Home Depot's sanded grout; the 7-lb box comes in only 15 of the 40 colors.",
  },
  {
    id: "ucp-fa",
    name: "MAPEI Ultracolor Plus FA",
    short: "Ultracolor Plus FA",
    kind: "sanded",
    k: 0.0582,
    packs: [
      { amount: 25, label: "25-lb bag", price: 30.97 },
      { amount: 10, label: "10-lb bag", price: 20.54 },
    ],
    jointMin: 0.0625,
    jointMax: 0.75,
    water: "2.6–2.8 qt per 25-lb bag",
    note: "Fine-aggregate, rapid-setting grout that works from 1/16 to 3/4 in — safe on glossy tile.",
  },
  {
    id: "permacolor",
    name: "LATICRETE PERMACOLOR",
    short: "PERMACOLOR",
    kind: "sanded",
    k: 0.0565,
    packs: [
      { amount: 25, label: "25-lb bag", price: 33.37 },
      { amount: 8, label: "8-lb bag", price: 20.99 },
    ],
    jointMin: 0.0625,
    jointMax: 0.5,
    note: "Sold in 8 and 25 lb (not the old 10 lb size).",
  },
  {
    id: "keracolor-u",
    name: "MAPEI Keracolor U unsanded",
    short: "Keracolor U",
    kind: "unsanded",
    k: 0.0426,
    mosaicK: 0.0468, // TDS 1×1 row runs 10% heavier
    packs: [
      { amount: 25, label: "25-lb bag", price: 24.61 },
      { amount: 10, label: "10-lb bag", price: 13.48 },
    ],
    jointMin: 0.0625,
    jointMax: 0.125,
    water: "3.75–4.2 qt per 25-lb bag",
    note: "Unsanded grout for tight 1/16–1/8 in joints on wall tile.",
  },
  {
    id: "polyblend-unsanded",
    name: "Custom Polyblend Plus Non-Sanded",
    short: "Polyblend Plus non-sanded",
    kind: "unsanded",
    k: 0.0619,
    packs: [{ amount: 10, label: "10-lb bag" }],
    jointMin: 0.0625,
    jointMax: 0.125,
    note: "Unsanded grout for joints up to 1/8 in.",
  },
  {
    id: "prism",
    name: "Custom Prism Ultimate Performance (17 lb)",
    short: "Prism",
    kind: "sanded",
    k: 0.0442,
    packs: [{ amount: 17, label: "17-lb box" }],
    jointMin: 0.0625,
    jointMax: 0.5,
    note: "Lightweight cement grout: a 17-lb box covers what a 25-lb bag of standard grout does.",
  },
  {
    id: "fusion-pro",
    name: "Custom Fusion Pro single-component",
    short: "Fusion Pro",
    kind: "premixed",
    packs: [
      { amount: 220, label: "1-gal pail" },
      { amount: 55, label: "1-qt tub" },
    ],
    jointMin: 0.0625,
    jointMax: 0.5,
    note: "Pre-mixed, stain-resistant grout — no mixing, no sealing.",
  },
  {
    id: "prism-scg",
    name: "Custom Prism SCG pre-mixed",
    short: "Prism SCG",
    kind: "premixed",
    packs: [{ amount: 220, label: "1-gal pail" }],
    jointMin: 0.0625,
    jointMax: 0.5,
    note: "Pre-mixed version of Prism in all 40 colors; 1-gal pail only.",
  },
  {
    id: "flexcolor-cq",
    name: "MAPEI Flexcolor CQ pre-mixed",
    short: "Flexcolor CQ",
    kind: "premixed",
    // ≈100 sq ft per gal at 12×12×3/8 with a 1/4 in joint (MAPEI via F&D) back-solves to 218 in³ of joint per gallon
    packs: [{ amount: 218, label: "1-gal pail", price: 54.98 }],
    jointMin: 0.0625,
    jointMax: 0.5,
    note: "Ready-to-use acrylic grout; also sold in 2-gal pails.",
  },
  {
    id: "laticrete-rtu",
    name: "LATICRETE Ready-To-Use grout",
    short: "LATICRETE RTU",
    kind: "premixed",
    packs: [{ amount: 231, label: "1-gal pail", price: 58.85 }],
    jointMin: 0.0625,
    jointMax: 0.5,
    note: "Pre-mixed grout; about 231 in³ of joint per gallon.",
  },
  {
    id: "kerapoxy-cq",
    name: "MAPEI Kerapoxy CQ epoxy",
    short: "Kerapoxy CQ",
    kind: "epoxy",
    packs: [
      { amount: 231, label: "1-gal kit", price: 120 },
      { amount: 462, label: "2-gal kit" },
    ],
    jointMin: 0.0625,
    jointMax: 0.375,
    note: "Epoxy for showers and kitchens; only for joints 1/16–3/8 in.",
  },
  {
    id: "spectralock",
    name: "LATICRETE SPECTRALOCK PRO epoxy",
    short: "SPECTRALOCK PRO",
    kind: "epoxy",
    packs: [
      { amount: 180, label: "full unit", price: 123.99 }, // Part A/B $104 + Part C color $19.99 (F&D)
      { amount: 45, label: "mini unit" },
    ],
    jointMin: 0.0625,
    jointMax: 0.5,
    note: "Premium epoxy; the color (Part C) is sold separately from Parts A and B.",
  },
  {
    id: "ceg-lite",
    name: "Custom CEG-Lite 100% solids epoxy",
    short: "CEG-Lite",
    kind: "epoxy",
    packs: [
      { amount: 420, label: "19-lb unit" },
      { amount: 210, label: "9.5-lb unit" },
    ],
    jointMin: 0.0625,
    jointMax: 0.5,
    note: "Commercial-grade epoxy in 9.5 and 19 lb units.",
  },
];

export function grout(id: string): Grout {
  return GROUTS.find((g) => g.id === id) ?? GROUTS[0];
}

export const GROUT_KINDS: { id: GroutKind; label: string; sub: string }[] = [
  { id: "sanded", label: "Sanded", sub: "1/8 in +" },
  { id: "unsanded", label: "Unsanded", sub: "≤ 1/8 in" },
  { id: "premixed", label: "Pre-mixed", sub: "pail" },
  { id: "epoxy", label: "Epoxy", sub: "2-part" },
];

/* ───────── backer board ───────── */

export type FastenerRule = "cement" | "goboard" | "wedi";

export interface Backer {
  id: string;
  name: string;
  short: string;
  kind: "cement" | "foam";
  wFt: number;
  lFt: number;
  thickness: string;
  weightLb?: number;
  price?: number;
  floorOnly?: boolean;
  fastener: FastenerRule;
  note: string;
}

export const BACKERS: Backer[] = [
  { id: "hardie-14", name: "HardieBacker 1/4 in cement board", short: "HardieBacker ¼", kind: "cement", wFt: 3, lFt: 5, thickness: "1/4 in", weightLb: 29.5, price: 13.4, floorOnly: true, fastener: "cement", note: "Floors and countertops only." },
  { id: "hardie-500", name: "HardieBacker 500 (0.42 in, sold as 1/2 in)", short: "HardieBacker 500", kind: "cement", wFt: 3, lFt: 5, thickness: "0.42 in", weightLb: 44.5, price: 17.5, fastener: "cement", note: "Walls and floors; actually 0.42 in thick." },
  { id: "durock-14", name: "Durock 1/4 in cement board", short: "Durock ¼", kind: "cement", wFt: 3, lFt: 5, thickness: "1/4 in", weightLb: 25.2, price: 12.5, floorOnly: true, fastener: "cement", note: "Floors and countertops only." },
  { id: "durock-12", name: "Durock 1/2 in cement board", short: "Durock ½", kind: "cement", wFt: 3, lFt: 5, thickness: "1/2 in", weightLb: 35, price: 15.85, fastener: "cement", note: "Walls, floors and ceilings." },
  { id: "durock-58", name: "Durock 5/8 in cement board", short: "Durock ⅝", kind: "cement", wFt: 3, lFt: 5, thickness: "5/8 in", weightLb: 45, price: 21, fastener: "cement", note: "Walls, floors and ceilings." },
  { id: "goboard-3x5", name: "GoBoard 1/2 in foam board, 3×5", short: "GoBoard 3×5", kind: "foam", wFt: 3, lFt: 5, thickness: "1/2 in", fastener: "goboard", note: "Waterproof foam board: seal every seam and fastener head." },
  { id: "goboard-4x8", name: "GoBoard 1/2 in foam board, 4×8", short: "GoBoard 4×8", kind: "foam", wFt: 4, lFt: 8, thickness: "1/2 in", fastener: "goboard", note: "Waterproof foam board: seal every seam and fastener head." },
  { id: "wedi-3x5", name: "wedi Building Panel 1/2 in, 36×60", short: "wedi 3×5", kind: "foam", wFt: 3, lFt: 5, thickness: "1/2 in", price: 56.31, fastener: "wedi", note: "Waterproof foam panel; seams sealed with wedi joint sealant." },
  { id: "wedi-4x8", name: "wedi Building Panel 1/2 in, 48×96", short: "wedi 4×8", kind: "foam", wFt: 4, lFt: 8, thickness: "1/2 in", price: 149.56, fastener: "wedi", note: "Waterproof foam panel; wedi list price (box of 4)." },
];

export function backer(id: string): Backer {
  return BACKERS.find((b) => b.id === id) ?? BACKERS[3];
}

export const BACKER_RULES = {
  sheetWastePct: 10, // cutouts and offcuts
  fastenerExtraPct: 10,
  cementSpacingIn: 8, // HardieBacker & Durock: 8 in o.c. on floors (whole surface) and walls
  studSpacingIn: 16, // max stud spacing for HardieBacker walls
  goboardSpacingIn: 8, // GoBoard Fasteners 8 in o.c.
  wediPerSqFt: 1, // 1 wedi screw + washer per sq ft
  gapIn: 0.125, // 1/8 in between sheets and at walls (Hardie); Durock floors 1/4 in at perimeter walls
};

/** Backer-board screws (1-1/4 in) and 2 in alkali-resistant mesh tape, F&D 2026-10-23. */
export const SCREW_PACKS: GroutPack[] = [
  { amount: 750, label: "box of 750", price: 38.44 },
  { amount: 185, label: "box of 185", price: 13.87 },
];
export const GOBOARD_FASTENER_PACK = 700;
export const WEDI_FASTENER_PACKS: GroutPack[] = [{ amount: 100, label: "kit of 100 screws + washers", price: 38 }];
export const MESH_TAPE_PACKS: GroutPack[] = [
  { amount: 300, label: "300-ft roll", price: 15.99 },
  { amount: 50, label: "50-ft roll", price: 5.99 },
];

/* ───────── waterproofing ───────── */

export type WaterproofId = "redgard" | "hydroban" | "kerdi";

export const WATERPROOFING = {
  redgard: {
    name: "Custom RedGard liquid membrane",
    short: "RedGard",
    wallRate: 55, // sq ft per gal as a waterproof membrane: 2 coats at 110 sq ft/gal each
    panRate: 40, // as an IAPMO shower-pan liner: 2 coats at 80 sq ft/gal each
    crackRate: 100, // basic crack prevention — NOT the shower rate
    packs: [
      { amount: 1, label: "1-gal pail", price: 74.99 },
      { amount: 3.5, label: "3.5-gal pail" },
    ] as GroutPack[],
    note: "Two coats; pink when wet, red when dry. Wet film no thicker than 40 mils per coat.",
  },
  hydroban: {
    name: "LATICRETE HYDRO BAN liquid membrane",
    short: "HYDRO BAN",
    wallRate: 50,
    panRate: 50,
    packs: [
      { amount: 5, label: "5-gal pail", price: 400 },
      { amount: 1, label: "1-gal pail", price: 105 },
    ] as GroutPack[],
    note: "Two coats, 0.5–0.8 mm cured; thinner and faster than most liquid membranes.",
  },
  kerdi: {
    name: "Schluter KERDI sheet membrane",
    short: "KERDI",
    rolls: [
      { amount: 54, label: "54-sq-ft roll", price: 123.95 },
      { amount: 323, label: "323-sq-ft roll", price: 648.48 },
      { amount: 108, label: "108-sq-ft roll" },
    ] as GroutPack[],
    band: [
      { amount: 32.83, label: "KERDI-BAND 5 in × 32 ft 10 in", price: 43.7 },
      { amount: 16.42, label: "KERDI-BAND 5 in × 16 ft 5 in", price: 23 },
    ] as GroutPack[],
    overlapIn: 2,
    // ALL-SET coverage isn't published; LATICRETE rates 110 sq ft per 50 lb for bonding a membrane with a 1/4 × 3/16 V-notch.
    bondingSqFtPerBag: 110,
    allSetPrice: 36.89,
    note: "8-mil sheet bonded with ALL-SET or unmodified thinset; seams overlap 2 in, corners get KERDI-BAND.",
  },
} as const;

export const WATERPROOF_OPTIONS: { id: WaterproofId; label: string }[] = [
  { id: "redgard", label: "RedGard (liquid)" },
  { id: "hydroban", label: "HYDRO BAN (liquid)" },
  { id: "kerdi", label: "KERDI (sheet)" },
];

export const WATERPROOF_EXTRA_PCT = 10;

/* ───────── self-leveler, niches, trim, clips ───────── */

export const SELF_LEVELERS = [
  { id: "ultraplan", name: "MAPEI Ultraplan 1 Plus (50 lb)", short: "Ultraplan 1 Plus", yieldCuFt: 0.5, price: 29.99, minIn: 1 / 16, maxIn: 1.5 },
  { id: "levelquik", name: "Custom LevelQuik RS (50 lb)", short: "LevelQuik RS", yieldCuFt: 0.479, minIn: 1 / 8, maxIn: 1.5 },
] as const;
export const SLU_EXTRA_PCT = 10;

/** Pre-formed niches: 12 in wide × 3.5 in deep inside (wedi). */
export const NICHES = {
  "12x12": { label: "12 × 12 in niche", wIn: 12, hIn: 12, dIn: 3.5, price: 80.15 }, // wedi 12×12, F&D
  "12x24": { label: "12 × 24 in niche", wIn: 12, hIn: 24, dIn: 3.5, price: 150.97 }, // wedi 12×24, Aug 2026 list
} as const;
export type NicheId = keyof typeof NICHES;

/** Schluter JOLLY edge trim, 98.5 in (8 ft 2½ in) lengths, F&D 2026-10-23. */
export const TRIM = { lengthIn: 98.5, aluminumPrice: 19.77, pvcPrice: 6.93, extraPct: 10 };

/** Leveling clips: about one every 8–12 in of tile edge; we plan one per 10 in. Raimondi 400-count bag, F&D. */
export const CLIPS = { spacingIn: 10, packs: [{ amount: 400, label: "bag of 400", price: 36.99 }] as GroutPack[] };

/** Notched trowel, typical F&D price. */
export const TROWEL_PRICE = 11.49;

/* ───────── installed cost (pro) ───────── */

export type ProjectId = "floor" | "shower" | "backsplash" | "walls";

/** Installed price per sq ft (materials + labor), national averages. */
export const INSTALLED: Record<ProjectId, { range: readonly [number, number]; source: string }> = {
  floor: { range: [16.38, 20.21], source: "homewyse, May 2026" },
  walls: { range: [11.48, 21.27], source: "homewyse, May 2026" },
  backsplash: { range: [28.31, 49.78], source: "homewyse, May 2026 (small jobs carry minimums)" },
  shower: { range: [17, 46], source: "Fixr, Aug 2025 (porcelain shower walls)" },
};

/** Fixr: pattern premiums apply to the total installed cost. */
export const PATTERN_PREMIUM: Record<PatternId, readonly [number, number]> = {
  straight: [0, 0],
  offset13: [0.1, 0.15],
  offset12: [0.1, 0.15],
  diagonal: [0.2, 0.2],
  herringbone: [0.2, 0.2],
};
export const MOSAIC_PREMIUM: readonly [number, number] = [0.1, 0.2]; // mosaics +10%, paper-faced +20%
export const REMOVAL_PER_SQFT: readonly [number, number] = [2, 5];

/* ───────── sources ───────── */

const SOURCE = {
  versabond: {
    label: "Custom Building Products — VersaBond family sell sheet SS215 (9/26R) and TDS-119",
    url: "https://www.custombuildingproducts.com/wp-content/uploads/VersaBond_Family_SS215_9-26_WEB.pdf",
    note: "VersaBond 85–95 sq ft at 1/4 in, 60–67 at 1/4×3/8, U-notch 34–38 (45°) / 42–47 (30°); VersaBond LHT, LITE (35 lb = 50 lb)",
    checked: TILE_CHECKED,
  },
  prolite: {
    label: "Custom ProLite (TDS-114) and MegaLite (TDS-112) coverage tables",
    url: "https://www.custombuildingproducts.com/products/prolite-premium-large-format-tile-mortar",
    note: "30-lb bag = 50-lb coverage: 90–100 / 63–70 / 45–50 sq ft; 1/2 in square notch no longer recommended",
    checked: TILE_CHECKED,
  },
  simpleset: {
    label: "Custom SimpleSet Pre-Mixed Thin-Set (TDS-182)",
    url: "https://www.custombuildingproducts.com/products/simpleset-pre-mixed-thin-set-mortar-2",
    note: "40–44 sq ft/gal with a 3/16 V-notch, 20–25 at 1/4 in; tile up to 8×8; charts exclude back-buttering",
    checked: TILE_CHECKED,
  },
  customFaq: {
    label: "Custom Building Products — FAQ (large-format tile)",
    url: "https://www.custombuildingproducts.com/frequently-asked-questions",
    note: "tiles with one side over 15 in need a large-and-heavy-tile mortar applied thicker",
    checked: TILE_CHECKED,
  },
  mapeiMortar: {
    label: "MAPEI TDS — Ultraflex 2 (May 2026), Ultraflex LFT (Aug 2026), Ultraflex LHT SG, Keraflex Super (Sep 2026)",
    url: "https://cdnmedia.mapei.com/docs/librariesprovider10/products-documents/1_3002824_ultraflex-lft_en-us_b865dbc4b94c4f0999eea71cf7aa9a25.pdf?sfvrsn=8f5fa811_0",
    note: "Ultraflex 2 75–90 / 55–65; LFT 85–95 / 65–75 / 40–50 / U 35–40; LHT SG 38–45 at 1/2 in; Keraflex Super is a 44-lb bag",
    checked: TILE_CHECKED,
  },
  laticreteMortar: {
    label: "LATICRETE 253 Gold (DS-167.6, DS-296), 254 Platinum (DS-677), MultiMax Lite (DS-078.6)",
    url: "https://cdnmdm.laticrete.com/ProductAssets/Product%20Documents/ds-296-la-en.pdf",
    note: "253 Gold 80–95 / 60–70 sq ft per 50 lb; 5.5 qt water; wet density 12.6 lb/gal; 254 Platinum 35–40 at 1/2 in",
    checked: TILE_CHECKED,
  },
  tec: {
    label: "TEC 3N1 Performance Mortar — product data sheet R0826",
    url: "https://www.tecspecialty.com/hbfuller-media/8459/pds_tec_384-385_3n1_r0826.pdf",
    note: "30-lb bag: 80–90 / 55–65 sq ft; 3/8 in slant notch 40–50; 3/4 in rounded notch 30–40",
    checked: TILE_CHECKED,
  },
  mortarPrices: {
    label: "Floor & Decor mortar listings and Do it Best (VersaBond $19.99, ProLite $36.99)",
    url: "https://www.flooranddecor.com/tile-mortars-and-thinsets-installation-materials",
    note: "Ultraflex 2 $29.65, Ultraflex LFT $29.99, LHT SG $24.99, Keraflex Super $36.99, 253 Gold $24.56, 254 Platinum $51.43, MultiMax Lite $48.99; basic 50-lb thinsets $13.13–$14.30 (Oct 23, 2026)",
    checked: TILE_CHECKED,
  },
  customGrout: {
    label: "Custom grout data — Polyblend Plus TDS-360, Grout Card CC25, Prism SS160, Fusion Pro TDS-242",
    url: "https://www.custombuildingproducts.com/wp-content/uploads/Polyblend-Plus-TDS-8-14-26.pdf",
    note: "Polyblend Plus 12×12×3/8 at 1/8 in: 348 sq ft per 25 lb; Prism 17 lb = 25 lb coverage; Fusion Pro 199 sq ft/gal at 12×12×3/8, 1/8 in",
    checked: TILE_CHECKED,
  },
  mapeiGrout: {
    label: "MAPEI TDS — Keracolor S (Feb 2026), Keracolor U, Ultracolor Plus FA (Aug 2026), Kerapoxy CQ (Apr 2026)",
    url: "https://cdnmedia.mapei.com/docs/librariesprovider10/products-documents/1_3000144_ultracolor-plus-fa_en-us_e3277b494f3341688d21ef7b5770b8ea.pdf?sfvrsn=bbcbe896_0",
    note: "Coverage tables used to calibrate the grout factor per product; Kerapoxy CQ joints 1/16–3/8 in only",
    checked: TILE_CHECKED,
  },
  laticreteGrout: {
    label: "LATICRETE grout coverage (DS-254.3), SPECTRALOCK PRO (DS-681) and the 10% grout rule",
    url: "https://cdnmdm.laticrete.com/ProductAssets/Product%20Documents/ds-681-la-en.pdf",
    note: "PERMACOLOR 3×6×1/4 at 1/16 in: 403 sq ft per 25 lb; SPECTRALOCK PRO full unit ≈ 0.8 gal; order 10% extra",
    checked: TILE_CHECKED,
  },
  flexcolor: {
    label: "Floor & Decor — MAPEI Flexcolor CQ product article",
    url: "https://flooranddecor.com/site-articles/mapei-flexcolor-cq-innovative-new-grout-product.html",
    note: "about 100 sq ft per gallon with 12×12×3/8 tile and a 1/4 in joint; 1- and 2-gal pails",
    checked: TILE_CHECKED,
  },
  groutPrices: {
    label: "Floor & Decor grout listings",
    url: "https://www.flooranddecor.com/tile-grout-installation-materials?sz=96",
    note: "Keracolor S 25 lb $14.48; Keracolor U 10 lb $13.48 / 25 lb $24.61; Ultracolor Plus FA $20.54 / $30.97; PERMACOLOR $20.99 / $33.37; Flexcolor CQ $54.98; Kerapoxy CQ $120; SPECTRALOCK PRO A/B $104 + Part C $19.99",
    checked: TILE_CHECKED,
  },
  redgard: {
    label: "Custom RedGard — TDS-104",
    url: "https://www.custombuildingproducts.com/TDS/TDS-104.pdf",
    note: "waterproofing 55 sq ft/gal (two coats at 110), IAPMO pan liner 40, crack prevention 100; 1 and 3.5 gal pails",
    checked: TILE_CHECKED,
  },
  redgardPrice: {
    label: "Celebration Hardware — RedGard LQWAF1 1-gal",
    url: "https://celebrationhardware.com/p/redgard-gal-waterproofing-and-crack-prevention-membrane-010186764375",
    note: "$74.99 per 1-gal pail (regular price, Oct 2026)",
    checked: TILE_CHECKED,
  },
  hydroban: {
    label: "LATICRETE HYDRO BAN sell sheet DS-10081 (10/26)",
    url: "https://cdnmdm.laticrete.com/ProductAssets/Product%20Documents/hydro_ban_sell_sheet_ds_10081-la-en.pdf",
    note: "50 sq ft per gallon, 250 per 5 gal; F&D $105 / $400",
    checked: TILE_CHECKED,
  },
  kerdi: {
    label: "Schluter KERDI product page and Floor & Decor KERDI listings",
    url: "https://www.schluter.com/schluter-us/en_US/Membranes/Waterproofing/Schluter%C2%AE-KERDI/p/KERDI",
    note: "54 sq ft roll (3 ft 3 in × 16 ft 5 in) $123.95, 323 sq ft $648.48; 2 in seam overlap; KERDI-BAND $23 / $43.70",
    checked: TILE_CHECKED,
  },
  hardie: {
    label: "James Hardie — installing HardieBacker on floors and walls",
    url: "https://www.jameshardie.com/blog/for-siding-pros/how-to-install-hardiebacker-cement-board-on-floors/",
    note: "fasteners every 8 in over the whole floor sheet, 1/4 in square-notch thinset under floor board, 1/8 in gaps, 2 in mesh tape; studs max 16 in o.c.",
    checked: TILE_CHECKED,
  },
  durock: {
    label: "USG Durock cement board installation guide CB321 (rev. 5-24)",
    url: "https://s7d9.scene7.com/is/content/usg/USG/pdpmovedocuments/usg-durock-cement-board-with-edgeguard-installation-guide-en-CB321650.pdf",
    note: "8 in o.c. on floors and walls (6 in on ceilings); walls need 1/2 or 5/8 in board; 1/4 in for floors",
    checked: TILE_CHECKED,
  },
  goboard: {
    label: "Johns Manville GoBoard sizes and fasteners",
    url: "https://www.jm.com/content/jm/global/en/index/goboard/goboard-fasteners/",
    note: "3×5 and 4×8 boards; GoBoard Fasteners every 8 in, packs of 700",
    checked: TILE_CHECKED,
  },
  wedi: {
    label: "wedi Illustrated Price List, August 2026",
    url: "https://wedicorp.com/shared-files/292679/?Illustrated%20Price%20List%20-%20August%202026.pdf&download=1",
    note: "1 screw + washer per sq ft; 36×60 panel $67.91 list ($56.31 at F&D), 48×96 $149.56; niches 12×12 / 12×24",
    checked: TILE_CHECKED,
  },
  backerPrices: {
    label: "Floor & Decor backer board, screws and mesh tape listings",
    url: "https://www.flooranddecor.com/tile-floor-preparation-installation-materials",
    note: "Durock 3×5 $12.50–$21.00, HardieBacker $13.40 / $17.50; 1-1/4 in screws 750 ct $38.44, 185 ct $13.87; 2 in tape 300 ft $15.99",
    checked: TILE_CHECKED,
  },
  slu: {
    label: "MAPEI Ultraplan 1 Plus TDS and Custom LevelQuik RS (TDS-108)",
    url: "https://www.custombuildingproducts.com/products/levelquik-rs-rapid-setting-self-leveling-underlayment",
    note: "50 lb ≈ 0.5 cu ft: 24 sq ft at 1/4 in, 12 at 1/2 in; LevelQuik RS up to 1.5 in; Ultraplan 1 Plus $29.99 at F&D",
    checked: TILE_CHECKED,
  },
  tileSpecs: {
    label: "Floor & Decor carton specs — Venato 12×24, Napoli 24×48, Bright White Ice 3×6",
    url: "https://www.flooranddecor.com/porcelain-tile/venato-matte-porcelain-tile-100610781.html",
    note: "12×24 = 11.70 × 23.50 in, 7 per box; 24×48 = 23.50 × 47.08 in, 3 per box; 3×6 subway 80 per box",
    checked: TILE_CHECKED,
  },
  daltileSpecs: {
    label: "Floors Center carton specs — Daltile 12×12, 24×24, 6×24, 4×4 and MSI 4×12",
    url: "https://floorscenter.com/products/daltile-memoir-12-x-12-matte-ceramic-floor-tile",
    note: "12×12 = 11.81 in, 17 per box; 24×24 = 23.62 in, 4 per box; 6×24 planks 11 = 10.23 sq ft; 4¼ wall tile 100 = 12.5 sq ft; MSI 4×12 15 = 4.85 sq ft",
    checked: TILE_CHECKED,
  },
  tilePrices: {
    label: "Floor & Decor tile category pricing (Ypsilanti, MI store)",
    url: "https://www.flooranddecor.com/porcelain-tile",
    note: "12×24 porcelain median $2.49/sq ft, 24×48 $3.99, porcelain overall $2.99, ceramic $0.99, mosaic sheets $14.99",
    checked: TILE_CHECKED,
  },
  attic: {
    label: "Daltile FAQ and MSI FAQ — overage and attic stock",
    url: "https://www.daltile.com/how-to/faqs",
    note: "buy about 10% extra as attic stock; MSI: 10–15% by pattern plus 5–10% for future repairs",
    checked: TILE_CHECKED,
  },
  trim: {
    label: "Floor & Decor — Schluter JOLLY edge trim and installation tools",
    url: "https://www.flooranddecor.com/schluter-installation-materials/schluter-jolly-edge-trim-3-8in.-aluminum-bright-white-101126589.html",
    note: "JOLLY 3/8 in aluminum $19.77, PVC $6.93 per 98.5 in length; leveling clips 400 ct $36.99; trowels $5.99–$19.99",
    checked: TILE_CHECKED,
  },
  homewyse: {
    label: "homewyse — cost to install tile floor, wall tile and backsplash (May 2026)",
    url: "https://www.homewyse.com/services/cost_to_install_tile_floor.html",
    note: "floor $16.38–$20.21, walls $11.48–$21.27, backsplash $28.31–$49.78 per sq ft installed",
    checked: TILE_CHECKED,
  },
  fixr: {
    label: "Fixr — shower tiling cost guide (updated Aug 29, 2025)",
    url: "https://www.fixr.com/costs/shower-tiling",
    note: "porcelain shower walls $17–$46/sq ft installed; diagonal and herringbone +20%, running bond +10–15%; tear-out $2–$5/sq ft",
    checked: TILE_CHECKED,
  },
} satisfies Record<string, SourceRef>;

export type TileSourceKey = keyof typeof SOURCE;

/** Every source the tile family relies on. */
export const TILE_SOURCES: SourceRef[] = Object.values(SOURCE);

/** The subset of sources a single calculator actually uses. */
export function tileSources(...keys: TileSourceKey[]): SourceRef[] {
  return keys.map((k) => SOURCE[k]);
}
