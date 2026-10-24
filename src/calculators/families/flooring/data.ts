// Flooring data, checked against manufacturer installation guides (LifeProof, Pergo, COREtec/Shaw,
// Bruce/AHF), CRI 105, live Floor & Decor pages, dealer listings and the Arbor (superarbor.io) mirror of
// Home Depot titles. research/flooring.verified.json holds the evidence trail (URLs, quotes, dates).
// Prices marked "cached" come from 2026 retailer snippets that could not be re-opened (Home Depot and
// Lowe's block bots); every price is editable in the UI.

import type { SourceRef } from "@/calculators/types";

export const FLOORING_CHECKED = "2026-10-23";

/* ───────────────────────── hard flooring products ───────────────────────── */

export type FloorType = "lvp" | "laminate" | "engineered" | "solid";
export type InstallMethod = "floating" | "nail";
/** Which manufacturer's published rules (gap, acclimation, T-molds, moisture) apply. */
export type RuleSet = "lifeproof" | "coretec" | "pergo" | "bruce" | "generic";

export const FLOOR_TYPES: { value: FloorType; label: string; sub: string }[] = [
  { value: "lvp", label: "Vinyl plank", sub: "LVP / LVT" },
  { value: "laminate", label: "Laminate", sub: "click-lock" },
  { value: "engineered", label: "Engineered", sub: "hardwood" },
  { value: "solid", label: "Solid", sub: "hardwood" },
];

export interface FloorProduct {
  id: string;
  type: FloorType;
  brand: string;
  /** Name shown in the picker and the shopping list. */
  name: string;
  short: string;
  sqftPerBox: number;
  piecesPerBox?: number;
  plankWidthIn?: number;
  plankLengthIn?: number;
  /** Price per box (USD). Undefined = no price we could verify; the type's typical $/sq ft is used. */
  boxPrice?: number;
  priceNote: string;
  attachedPad: boolean;
  install: InstallMethod;
  /** Dedicated herringbone/chevron SKU (the only kind approved for those layouts). */
  pattern?: "herringbone" | "chevron";
  rules: RuleSet;
  note?: string;
}

export const PRODUCTS: FloorProduct[] = [
  // LifeProof (Home Depot). Box sizes from HD titles mirrored on superarbor.io (2026-10-23).
  {
    id: "lifeproof-87x48",
    type: "lvp",
    brand: "LifeProof",
    name: "LifeProof rigid-core vinyl plank 8.7 × 47.6 in (6/22/30 mil)",
    short: "LifeProof 8.7 × 48 in",
    sqftPerBox: 20.06,
    piecesPerBox: 7,
    plankWidthIn: 8.7,
    plankLengthIn: 47.6,
    boxPrice: 59.97, // Sterling Oak 22 mil, $2.98/sq ft (cached HD 2026)
    priceNote: "Home Depot, cached 2026 ($2.98/sq ft)",
    attachedPad: true,
    install: "floating",
    rules: "lifeproof",
    note: "Some 12 mil 8.7 × 48 in SKUs pack 20.02 sq ft — check the number on your carton.",
  },
  {
    id: "lifeproof-87x59",
    type: "lvp",
    brand: "LifeProof",
    name: "LifeProof rigid-core vinyl plank 8.7 × 59 in",
    short: "LifeProof 8.7 × 59 in",
    sqftPerBox: 25.0,
    plankWidthIn: 8.7,
    plankLengthIn: 59,
    boxPrice: 74.5, // line-typical $2.98/sq ft × 25.0 sq ft
    priceNote: "LifeProof typical $2.98/sq ft (Home Depot, cached 2026)",
    attachedPad: true,
    install: "floating",
    rules: "lifeproof",
    note: "Older 8.7 × 59.4 in SKUs pack 21.45 sq ft per case.",
  },
  {
    id: "lifeproof-7x48",
    type: "lvp",
    brand: "LifeProof",
    name: "LifeProof vinyl plank 7 × 48 in (12/22 mil)",
    short: "LifeProof 7 × 48 in",
    sqftPerBox: 19.0,
    plankWidthIn: 7,
    plankLengthIn: 48,
    boxPrice: 56.62, // line-typical $2.98/sq ft × 19.0 sq ft
    priceNote: "LifeProof typical $2.98/sq ft (Home Depot, cached 2026)",
    attachedPad: true,
    install: "floating",
    rules: "lifeproof",
    note: "7.1 × 48 in SKUs pack 18.7 sq ft per case.",
  },
  {
    id: "lifeproof-herringbone",
    type: "lvp",
    brand: "LifeProof",
    name: "LifeProof Herringbone 4.72 × 28.35 in",
    short: "LifeProof Herringbone",
    sqftPerBox: 22.31,
    plankWidthIn: 4.72,
    plankLengthIn: 28.35,
    priceNote: "no verified price — enter yours",
    attachedPad: true,
    install: "floating",
    pattern: "herringbone",
    rules: "lifeproof",
  },
  {
    id: "lifeproof-chevron",
    type: "lvp",
    brand: "LifeProof",
    name: "LifeProof Chevron 12 × 28 in",
    short: "LifeProof Chevron",
    sqftPerBox: 18.9,
    plankWidthIn: 12,
    plankLengthIn: 28,
    priceNote: "no verified price — enter yours",
    attachedPad: true,
    install: "floating",
    pattern: "chevron",
    rules: "lifeproof",
  },
  // NuCore (Floor & Decor): box sq ft = box price ÷ $/sq ft on the live product page, cross-checked
  // against plank count × plank face size (all integer counts).
  {
    id: "nucore-cedar-point",
    type: "lvp",
    brand: "NuCore",
    name: "NuCore Cedar Point 7 × 48 in, 22 mil, cork pad",
    short: "NuCore Cedar Point 7 × 48 in",
    sqftPerBox: 23.66,
    piecesPerBox: 10,
    plankWidthIn: 7.01,
    plankLengthIn: 48.62,
    boxPrice: 58.91,
    priceNote: "Floor & Decor, live Oct 23 2026 ($2.49/sq ft)",
    attachedPad: true,
    install: "floating",
    rules: "generic",
  },
  {
    id: "nucore-everwood-falls",
    type: "lvp",
    brand: "NuCore",
    name: "NuCore Everwood Falls 7 × 48 in, 22 mil, cork pad",
    short: "NuCore Everwood Falls 7 × 48 in",
    sqftPerBox: 19.02,
    piecesPerBox: 8,
    plankWidthIn: 7.13,
    plankLengthIn: 48.03,
    boxPrice: 47.36,
    priceNote: "Floor & Decor, live Oct 23 2026 ($2.49/sq ft)",
    attachedPad: true,
    install: "floating",
    rules: "generic",
    note: "Same nominal size as Cedar Point but 8 planks per box, not 10.",
  },
  {
    id: "nucore-gunstock-oak",
    type: "lvp",
    brand: "NuCore",
    name: "NuCore Gunstock Oak 7.5 × 48 in, 22 mil, cork pad",
    short: "NuCore Gunstock Oak 7.5 × 48 in",
    sqftPerBox: 22.97,
    piecesPerBox: 9,
    plankWidthIn: 7.56,
    plankLengthIn: 48.62,
    boxPrice: 68.68,
    priceNote: "Floor & Decor, live Oct 23 2026 ($2.99/sq ft)",
    attachedPad: true,
    install: "floating",
    rules: "generic",
  },
  {
    id: "nucore-turner-road",
    type: "lvp",
    brand: "NuCore",
    name: "NuCore Turner Road 7 × 60 in, 22 mil, cork pad",
    short: "NuCore Turner Road 7 × 60 in",
    sqftPerBox: 23.96,
    piecesPerBox: 8,
    plankWidthIn: 7.2,
    plankLengthIn: 59.84,
    boxPrice: 48.39,
    priceNote: "Floor & Decor, live Oct 23 2026 ($2.02/sq ft)",
    attachedPad: true,
    install: "floating",
    rules: "generic",
  },
  {
    id: "nucore-harper-herringbone",
    type: "lvp",
    brand: "NuCore",
    name: "NuCore Harper Herringbone 4 × 24 in, cork pad",
    short: "NuCore Herringbone",
    sqftPerBox: 8.54,
    piecesPerBox: 13,
    plankWidthIn: 4.07,
    plankLengthIn: 23.25,
    boxPrice: 29.8,
    priceNote: "Floor & Decor, live Oct 23 2026 ($3.49/sq ft)",
    attachedPad: true,
    install: "floating",
    pattern: "herringbone",
    rules: "generic",
  },
  // COREtec / Shaw (same Shaw installation guidelines).
  {
    id: "coretec-originals-7x72",
    type: "lvp",
    brand: "COREtec",
    name: "COREtec Originals 7 × 72 in, 12 mm WPC, cork back",
    short: "COREtec Originals 7 × 72 in",
    sqftPerBox: 21.27,
    plankWidthIn: 7,
    plankLengthIn: 72,
    boxPrice: 248.65, // manufacturer estimate $11.69/sq ft × 21.27
    priceNote: "coretecfloors.com estimate $11.69/sq ft",
    attachedPad: true,
    install: "floating",
    rules: "coretec",
  },
  {
    id: "coretec-plus-7",
    type: "lvp",
    brand: "COREtec",
    name: "COREtec Plus 7 × 48 in, 8 mm (legacy line)",
    short: "COREtec Plus 7 × 48 in",
    sqftPerBox: 38.03,
    piecesPerBox: 16,
    plankWidthIn: 7.13,
    plankLengthIn: 48.03,
    boxPrice: 239.21,
    priceNote: "Floorzz dealer, Oct 2026 ($6.29/sq ft)",
    attachedPad: true,
    install: "floating",
    rules: "coretec",
    note: "Legacy cartons (38 sq ft) are almost twice the size of COREtec Originals cartons.",
  },
  {
    id: "shaw-paragon-7-plus",
    type: "lvp",
    brand: "Shaw",
    name: "Shaw Floorte Pro Paragon 7\" Plus 7 × 48 in SPC",
    short: "Shaw Paragon 7\" Plus",
    sqftPerBox: 18.91,
    plankWidthIn: 7,
    plankLengthIn: 48.03,
    boxPrice: 109.49,
    priceNote: "Floor City dealer, Oct 2026 ($5.79/sq ft)",
    attachedPad: true,
    install: "floating",
    rules: "coretec",
  },
  {
    id: "smartcore-pro-7x48",
    type: "lvp",
    brand: "SMARTCORE",
    name: "SMARTCORE Pro (Lowe's) 7.08 × 48.03 in",
    short: "SMARTCORE Pro 7 × 48 in",
    sqftPerBox: 16.54,
    piecesPerBox: 7,
    plankWidthIn: 7.08,
    plankLengthIn: 48.03,
    priceNote: "no current price — Lowe's listing data is from 2022",
    attachedPad: true,
    install: "floating",
    rules: "generic",
    note: "Carton size comes from a 2022 Lowe's listing — confirm the sq ft and the attached pad on your carton.",
  },
  // Laminate
  {
    id: "pergo-outlast-748x4724",
    type: "laminate",
    brand: "Pergo",
    name: "Pergo Outlast+ 7.48 × 47.24 in, 10 mm + 2 mm pad",
    short: "Pergo Outlast+ 7.48 in",
    sqftPerBox: 19.63,
    piecesPerBox: 8,
    plankWidthIn: 7.48,
    plankLengthIn: 47.24,
    boxPrice: 52.8,
    priceNote: "Home Depot, cached 2026 ($2.69/sq ft)",
    attachedPad: true,
    install: "floating",
    rules: "pergo",
  },
  {
    id: "pergo-outlast-614x4724",
    type: "laminate",
    brand: "Pergo",
    name: "Pergo Outlast+ 6.14 × 47.24 in",
    short: "Pergo Outlast+ 6.14 in",
    sqftPerBox: 16.12,
    piecesPerBox: 8,
    plankWidthIn: 6.14,
    plankLengthIn: 47.24,
    boxPrice: 43.36, // line-typical $2.69/sq ft × 16.12
    priceNote: "Pergo Outlast+ typical $2.69/sq ft (cached 2026)",
    attachedPad: true,
    install: "floating",
    rules: "pergo",
  },
  {
    id: "pergo-outlast-523x4724",
    type: "laminate",
    brand: "Pergo",
    name: "Pergo Outlast+ 5.23 × 47.24 in",
    short: "Pergo Outlast+ 5.23 in",
    sqftPerBox: 13.74,
    piecesPerBox: 8,
    plankWidthIn: 5.23,
    plankLengthIn: 47.24,
    boxPrice: 38.33,
    priceNote: "Arbor marketplace, Oct 2026 ($2.79/sq ft)",
    attachedPad: true,
    install: "floating",
    rules: "pergo",
  },
  {
    id: "pergo-outlast-748x5433",
    type: "laminate",
    brand: "Pergo",
    name: "Pergo Outlast+ 7.48 × 54.33 in (long plank)",
    short: "Pergo Outlast+ 54 in long",
    sqftPerBox: 16.93,
    piecesPerBox: 6,
    plankWidthIn: 7.48,
    plankLengthIn: 54.33,
    boxPrice: 47.23,
    priceNote: "Arbor marketplace, Oct 2026 ($2.79/sq ft)",
    attachedPad: true,
    install: "floating",
    rules: "pergo",
  },
  {
    id: "revwood-elderwood",
    type: "laminate",
    brand: "Mohawk",
    name: "Mohawk RevWood Plus Elderwood 7.5 × 54.69 in, 12 mm",
    short: "RevWood Plus Elderwood",
    sqftPerBox: 16.93,
    piecesPerBox: 6,
    plankWidthIn: 7.5,
    plankLengthIn: 54.69,
    boxPrice: 69.24,
    priceNote: "Flooring Inc, Oct 2026 ($4.09/sq ft)",
    attachedPad: true,
    install: "floating",
    rules: "generic",
  },
  {
    id: "revwood-hampton-villa",
    type: "laminate",
    brand: "Mohawk",
    name: "Mohawk RevWood Plus Hampton Villa 7.5 × 47.25 in",
    short: "RevWood Plus Hampton Villa",
    sqftPerBox: 22.09,
    plankWidthIn: 7.5,
    plankLengthIn: 47.25,
    boxPrice: 66.05, // dealer list $2.99/sq ft × 22.09
    priceNote: "Georgia Carpet list $2.99/sq ft (older page)",
    attachedPad: true,
    install: "floating",
    rules: "generic",
  },
  {
    id: "trafficmaster-grey-oak",
    type: "laminate",
    brand: "TrafficMaster",
    name: "TrafficMaster Grey Oak 7 mm, 8 × 47.64 in",
    short: "TrafficMaster 7 mm",
    sqftPerBox: 23.91,
    plankWidthIn: 8.03,
    plankLengthIn: 47.64,
    boxPrice: 23.67,
    priceNote: "Home Depot, cached 2026 ($0.99/sq ft)",
    attachedPad: false,
    install: "floating",
    rules: "generic",
  },
  {
    id: "trafficmaster-sycamore",
    type: "laminate",
    brand: "TrafficMaster",
    name: "TrafficMaster Sycamore 12 mm, 8 × 47.64 in",
    short: "TrafficMaster 12 mm",
    sqftPerBox: 15.94,
    plankWidthIn: 8.036,
    plankLengthIn: 47.64,
    boxPrice: 20.57,
    priceNote: "Home Depot, cached 2026 ($1.29/sq ft)",
    attachedPad: false,
    install: "floating",
    rules: "generic",
  },
  // Engineered hardwood
  {
    id: "hdc-wymill-hickory",
    type: "engineered",
    brand: "Home Decorators Collection",
    name: "Home Decorators Wymill Hickory 3/8 × 5 in, click-lock",
    short: "HDC 5 in click-lock",
    sqftPerBox: 19.7,
    plankWidthIn: 5,
    boxPrice: 58.9,
    priceNote: "Home Depot, cached 2026 ($2.99/sq ft)",
    attachedPad: false,
    install: "floating",
    rules: "generic",
  },
  {
    id: "hdc-regal-ridge",
    type: "engineered",
    brand: "Home Decorators Collection",
    name: "Home Decorators Regal Ridge White Oak 3/8 × 7.5 in, T&G",
    short: "HDC 7.5 in T&G",
    sqftPerBox: 42.948,
    plankWidthIn: 7.5,
    boxPrice: 128.41,
    priceNote: "Home Depot, cached 2025–26 ($2.99/sq ft)",
    attachedPad: false,
    install: "nail",
    rules: "generic",
  },
  // Solid hardwood (Bruce/AHF). Line-typical $5.49/sq ft = Arbor median of 10 Bruce 3-1/4 in SKUs.
  {
    id: "bruce-solid-225",
    type: "solid",
    brand: "Bruce",
    name: "Bruce solid oak 3/4 × 2-1/4 in strip",
    short: "Bruce 2-1/4 in strip",
    sqftPerBox: 20,
    plankWidthIn: 2.25,
    boxPrice: 109.8,
    priceNote: "Bruce typical $5.49/sq ft (2026)",
    attachedPad: false,
    install: "nail",
    rules: "bruce",
  },
  {
    id: "bruce-solid-325",
    type: "solid",
    brand: "Bruce",
    name: "Bruce solid oak 3/4 × 3-1/4 in (Plano / American Originals)",
    short: "Bruce 3-1/4 in",
    sqftPerBox: 22,
    plankWidthIn: 3.25,
    boxPrice: 120.78,
    priceNote: "Bruce typical $5.49/sq ft (2026)",
    attachedPad: false,
    install: "nail",
    rules: "bruce",
    note: "Most 3-1/4 in pallets hold 352 sq ft (16 cartons).",
  },
  {
    id: "bruce-solid-5",
    type: "solid",
    brand: "Bruce",
    name: "Bruce solid oak 3/4 × 5 in plank",
    short: "Bruce 5 in plank",
    sqftPerBox: 23.5,
    plankWidthIn: 5,
    boxPrice: 129.02,
    priceNote: "Bruce typical $5.49/sq ft (2026)",
    attachedPad: false,
    install: "nail",
    rules: "bruce",
  },
];

/** Typical material $/sq ft by type, used for a custom product and SKUs without a verified price. */
export const TYPICAL_PSF: Record<FloorType, number> = {
  lvp: 2.98, // LifeProof 8.7 × 48 typical (cached HD 2026); NuCore live median $3.19
  laminate: 2.69, // Pergo Outlast+ typical (cached HD 2026; Arbor median $2.79)
  engineered: 2.99, // Home Decorators Collection typical (cached HD)
  solid: 5.49, // Bruce 3-1/4 in solid typical (Arbor median of 10 SKUs)
};

export const DEFAULT_PRODUCT: Record<FloorType, string> = {
  lvp: "lifeproof-87x48",
  laminate: "pergo-outlast-748x4724",
  engineered: "hdc-wymill-hickory",
  solid: "bruce-solid-325",
};

export const CUSTOM_ID = "custom";

/* ───────────────────────── waste (overage) ───────────────────────── */

export type Layout = "straight" | "diagonal" | "herringbone";
export type Complexity = "simple" | "average" | "complex";

export const LAYOUTS: { value: Layout; label: string }[] = [
  { value: "straight", label: "Straight" },
  { value: "diagonal", label: "Diagonal 45°" },
  { value: "herringbone", label: "Herringbone" },
];

/**
 * Layout overage, % of net area. Vinyl/laminate straight 10% (LifeProof 2023, Floor & Decor),
 * diagonal 15% (Pergo 2018 guide — legacy, the 2024/2026 sheets give no %), herringbone/chevron
 * 15–20% (LifeProof 2023; we use 20% under 200 sq ft). Hardwood 5% straight incl. grading and 10%
 * diagonal (Bruce solid 2021 / engineered 2023). Bruce publishes no herringbone figure, so hardwood
 * herringbone uses the LifeProof range.
 */
export const LAYOUT_WASTE = {
  resilient: { straight: 10, diagonal: 15 },
  hardwood: { straight: 5, diagonal: 10 },
  herringbone: { small: 20, large: 15, smallUnderSqft: 200 },
} as const;

/** Design adders (shown and editable): cut-outs/closets, and short rows in small jobs (8 in min end pieces). */
export const COMPLEXITY: { value: Complexity; label: string; sub: string; pct: number }[] = [
  { value: "simple", label: "Simple", sub: "+0%", pct: 0 },
  { value: "average", label: "Closets & jogs", sub: "+3%", pct: 3 },
  { value: "complex", label: "Angles & cut-outs", sub: "+5%", pct: 5 },
];
export const SMALL_JOB = { underSqft: 100, pct: 5 };

/** Stairs (hard floor): 20% plank allowance is a design default (research formula hard_floor_stairs). */
export const STAIR_PLANK_WASTE_PCT = 20;

/* ───────────────────────── install rules by manufacturer ───────────────────────── */

export interface RuleInfo {
  source: string;
  /** Resilient/laminate acclimation rule; hardwood uses HARDWOOD_ACCLIMATION by type. */
  acclimation?: string;
  /** Concrete slab moisture limit text, if the maker publishes one. */
  concreteLimit?: string;
  flatness?: string;
}

export const RULES: Record<RuleSet, RuleInfo> = {
  lifeproof: {
    source: "LifeProof install guide (May 2023)",
    acclimation: "Not required if the cartons were stored properly — let them adjust after extreme heat or cold.",
    concreteLimit: "85% RH (ASTM F2170) or 8 lb MVER",
    flatness: "1/4 in in 10 ft; slope no more than 1 in per 6 ft",
  },
  coretec: {
    source: "COREtec/Shaw install guidelines (rev. Sept 2026)",
    acclimation: "Not required — install in a climate-controlled room at 55–85°F.",
    concreteLimit: "90% RH (ASTM F2170) or 8 lb calcium chloride (ASTM F1869)",
    flatness: "3/16 in in 10 ft or 1/8 in in 6 ft",
  },
  pergo: {
    source: "Pergo Outlast+ instructions (Aug 2024)",
    acclimation: "48 hours at 60–85°F and 35–65% RH — skip only if the cartons were stored at the room's conditions.",
    concreteLimit: "≤ 80% RH, ≤ 5 lb MVER or ≤ 4.0% MC",
    flatness: "3/16 in in 10 ft",
  },
  bruce: {
    source: "Bruce/AHF hardwood instructions (2021 solid, 2023 engineered)",
  },
  generic: {
    source: "type default",
    acclimation: "We could not verify a published rule for this line — follow the carton. Brands we checked range from none (LifeProof, COREtec) to 48 hours (Pergo laminate).",
  },
};

export const HARDWOOD_ACCLIMATION = {
  solid: "Acclimate until the boards are within 3% (strip) or 2% (plank) moisture content of the subfloor; a wood subfloor must be ≤ 12% MC (Bruce).",
  engineered: "Not necessary per Bruce/AHF, but store the cartons in the room where they go.",
};

/** Perimeter expansion gap, inches. */
export const GAP_IN = {
  lvp: 0.25, // LifeProof 1/4 in; COREtec/Shaw 1/4 in under 2,500 sq ft
  lvpLarge: 0.5, // COREtec/Shaw at 2,500 sq ft and above
  lvpLargeSqft: 2500,
  laminate: 0.375, // Pergo 2024/2026: 3/8 in on all sides
  solid: 0.75, // Bruce solid: 3/4 in at all vertical obstructions
  engineeredFastened: 0.25, // Bruce engineered nail/staple/glue
  engineeredFloating: 0.5,
};

/** T-molding triggers. */
export const TMOLD = {
  lifeproofMaxRunFt: 100, // > 100 ft in any direction
  pergoRoomFt: 50, // rooms 50 ft or more in length or width
  pergoDoorwayUnderIn: 32, // and any doorway narrower than 32 in, or where direction changes
};

/* ───────────────────────── accessories ───────────────────────── */

export const ACCESSORIES = {
  foam: { name: "Foam underlayment, 100 sq ft roll", rollSqft: 100, price: 40.49 }, // F&D EZ Foam 2 mm, live
  felt: { name: "15 lb felt paper, 432 sq ft roll", rollSqft: 432, price: 32.97 }, // F&D Grip Rite, live
  // Roberts 70-198 6 mil moisture barrier, 31.5 in × 76.25 ft (HD cached); Pergo: overlap seams ≥ 8 in.
  poly: { name: "6 mil poly moisture barrier, 200 sq ft roll", rollSqft: 200, widthIn: 31.5, overlapIn: 8, price: 27.49 },
  /** Plain butt-and-tape seams still get a 5% allowance for trimming at walls. */
  rollAllowance: 1.05,
};

export type TransitionKind = "tmold" | "reducer";

/** Transition sticks. Vinyl/laminate trims are 94 in; many hardwood moldings are 78 in. */
export const TRANSITIONS = {
  resilient: {
    lengthIn: 94,
    price: { tmold: 34.98, reducer: 42.78 }, // HD typical (cached 2026); Arbor medians $39.98
  },
  hardwood: {
    lengthIn: 78,
    price: { tmold: 45.06, reducer: 44.14 }, // Arbor medians of 78 in wood T-moldings (n=80) / reducers (n=88)
  },
  stairNose: { lengthIn: 94, price: 59.98 }, // vinyl stair nose, HD typical (cached 2026)
};

export type TrimKind = "matched" | "paint" | "none";

/** Quarter round to hide the expansion gap. Width 0.80 in (F&D) sets the gap-coverage check. */
export const QUARTER_ROUND = {
  matchedResilient: { lengthIn: 94, price: 3.35 }, // F&D universal laminate quarter round, live
  matchedHardwood: { lengthIn: 78, price: 27.58 }, // Arbor median of 78 in solid-wood quarter rounds (n=51)
  paint: { lengthIn: 96, price: 7.76 }, // 8 ft MDF/pine at the $0.97/LF typical
  coverIn: 0.8,
  /** Gap + 1/8 in tolerance must fit under the trim (research formula expansion_gap_coverage_check). */
  toleranceIn: 0.125,
  /** Rule-of-thumb allowance for miters and cut-offs. */
  wastePct: 10,
};

/** LifeProof on stairs voids the warranty; matching treads are sold 2 per box, 46 in long (cached HD). */
export const LIFEPROOF_TREADS = { perBox: 2, lengthIn: 46, price: 87.99 };

/* ───────────────────────── labor (editable) ───────────────────────── */

export const LABOR: Record<FloorType, { rate: number; range: string }> = {
  // This Old House (June 2026) $3–$10; verifier suggests $3.50 as a mid default
  lvp: { rate: 3.5, range: "$3–$10 (This Old House, June 2026)" },
  // Published ranges disagree: RealCostIQ (Sep 2026) $1–$2 floating, This Old House (Apr 2026) $4–$8
  laminate: { rate: 3.5, range: "$1–$8 (RealCostIQ & This Old House, 2026)" },
  // This Old House (June 2026) $3–$8; default = midpoint
  engineered: { rate: 5.5, range: "$3–$8 (This Old House, June 2026)" },
  solid: { rate: 5.5, range: "$3–$8 (This Old House, June 2026)" },
};

/** Tear-out and disposal of old flooring, $/sq ft: ~$1–$2 (This Old House 2026), up to $4. */
export const REMOVAL_PSF = 1.5;

/* ───────────────────────── carpet ───────────────────────── */

export const ROLL_WIDTHS: { value: number; label: string; sub: string }[] = [
  { value: 12, label: "12 ft", sub: "most styles" },
  { value: 13.5, label: "13 ft 6 in", sub: "some styles" },
  { value: 15, label: "15 ft", sub: "some styles" },
];

export const CARPET = {
  trimIn: 3, // per cut end
  padAllowance: 1.05, // pad sq ft = net × 1.05
  longStretchFt: 30, // CRI 105 §11.1: walls over 30 ft get double / architectural tack strip
  padMaxCriIn: 0.4375, // CRI 105: 7/16 in max
  pricePerSqft: 4.34, // LifeProof carpet typical, Home Depot cached 2026 ($2.79–$5.89)
  padPerSqft: 0.77, // 10 lb memory-foam rebond, Caldwell full-roll price
  laborPerSqft: 1.0, // This Old House (June 2026) $0.50–$1.00
  stairLaborPerStep: 18.5, // This Old House: stairs add $11–$26 per step (midpoint)
  removalPerSqft: 2.5, // This Old House: carpet removal $2–$3
  netSqftPerStep: 4.5, // Fixr (Jan 2025): ~54 sq ft for 12 straight steps
};

export const PAD_THICKNESS: { value: number; label: string }[] = [
  { value: 0.375, label: "3/8 in" },
  { value: 0.4375, label: "7/16 in" },
  { value: 0.5, label: "1/2 in" },
];

/** Carpet on stairs: piece = tread + riser + ~1 in nose wrap + ~1 in allowance; 2 in side clearance per piece. */
export const STAIR_CARPET = { noseWrapIn: 1, allowanceIn: 1, sideClearanceIn: 2 };

export const STAIR_DEFAULTS = { widthIn: 36, treadIn: 10, riserIn: 7.5 };

/* ───────────────────────── baseboard ───────────────────────── */

export const BASEBOARD = {
  stockFt: [8, 12, 16] as const,
  wastePct: 10, // rule of thumb for copes, miters and cut-offs
  pricePerLf: 1.2, // MDF baseboard $1.00–$1.40/LF (Angi 2026, read from a search snippet — the page blocks bots) — midpoint
  studSpacingIn: 16, // Lowe's guide: nail into studs every 16–18 in
  nailsPerStud: 2, // one high, one low (Fine Homebuilding)
  caulkLfPerTube: 55, // DAP Alex Plus TDS: 10.1 fl oz = 55 linear ft at a 3/16 in bead
  caulkPrice: 4.69, // Sherwin-Williams 1050 caulk (sherwin-williams.com, Oct 2026)
  paintSqftPerGal: 350, // SW Emerald 350–400 sq ft/gal per coat — low end for trim
  quartPrice: 24.59, // SW Emerald Interior Semi-Gloss quart (Oct 2026)
  gallonPrice: 63.89, // same, gallon
  laborPerLf: 6.38, // Angi 2026 (search snippet): $5.00–$7.75 per linear ft — midpoint
};

export const BASE_HEIGHTS: { value: number; label: string }[] = [
  { value: 3.25, label: "3¼ in" },
  { value: 4.25, label: "4¼ in" },
  { value: 5.25, label: "5¼ in" },
  { value: 7.25, label: "7¼ in" },
];

/* ───────────────────────── sources ───────────────────────── */

const src = (label: string, url: string, note: string): SourceRef => ({ label, url, note, checked: FLOORING_CHECKED });

export const SOURCES = {
  lifeproof: src(
    "LifeProof Plank & Tile Installation Instructions (May 1, 2023)",
    "https://images.thdstatic.com/catalog/pdfImages/03/038c409b-4ee2-4db3-a848-c7fae7d0014b.pdf",
    "order ~10% extra; 1/4 in gap; no acclimation; T-molding past 100 ft; stairs void the warranty; only LifeProof underlayment",
  ),
  lifeproofHerringbone: src(
    "LifeProof Chevron & Herringbone Installation Instructions (Sept 25, 2023)",
    "https://images.thdstatic.com/catalog/pdfImages/c9/c97938b2-545a-461b-80dd-75516137b019.pdf",
    "order 15–20% extra; only the dedicated herringbone planks may be laid in herringbone",
  ),
  pergo: src(
    "Pergo Outlast+ installation instructions (Aug 2024) and Pergo Pro (Jan 2026)",
    "https://images.thdstatic.com/catalog/pdfImages/fe/fe1e8fa7-bdb1-4e22-afe0-ba8bdf691b59.pdf",
    "3/8 in gap; T-molding in rooms ≥ 50 ft and doorways < 32 in; 6 mil poly with 8 in overlaps on concrete; 48 h acclimation",
  ),
  pergo2018: src(
    "Pergo Outlast+ Installation Essentials (rev. 2018, legacy)",
    "https://images.homedepot-static.com/catalog/pdfImages/07/07b34bbf-164b-46df-b6b5-3e5cf1502056.pdf",
    "10% standard and 15% diagonal overage (not repeated in the 2024 sheet)",
  ),
  coretec: src(
    "COREtec WPC 5G installation guidelines (Shaw, rev. Sept 30, 2026)",
    "https://pdmsview.shawinc.com/USFloors/COREtec-5G-with-clip/COREtec-WPC-5G-with-Clip",
    "1/4 in gap under 2,500 sq ft, 1/2 in above; no acclimation; 8 lb / 90% RH; no plastic over wood subfloors",
  ),
  bruceSolid: src(
    "Bruce 3/4 in Solid Hardwood Installation Instructions (AHF, 2021)",
    "https://www.bruce.com/cdn/content/sites/2/Bruce-Installation-Solid-3-4.pdf",
    "5% cutting and grading allowance (10% diagonal); 3/4 in expansion; moisture-content acclimation",
  ),
  bruceEngineered: src(
    "Bruce Engineered Hardwood Installation Instructions (AHF, 2023)",
    "https://www.bruce.com/cdn/content/sites/2/Eng-Installation.pdf",
    "5% / 10% diagonal; 1/4 in gap fastened, 1/2 in floating; acclimation not necessary",
  ),
  nucore: src(
    "Floor & Decor NuCore product pages (live)",
    "https://www.flooranddecor.com/nucore-flooring",
    "box prices and plank sizes, e.g. Cedar Point $58.91 per 23.66 sq ft box",
  ),
  arbor: src(
    "Home Depot product titles via the Arbor (superarbor.io) mirror",
    "https://superarbor.io/collections/lifeproof-1/products.json",
    "carton sizes: LifeProof 20.06 / 25.0 / 19.0, Pergo 19.63 / 16.12, TrafficMaster 23.91 / 15.94, Bruce 20 / 22 / 23.5; trim medians",
  ),
  coretecOriginals: src(
    "COREtec Originals product page",
    "https://coretecfloors.com/en-us/products/coretec-originals/canyon-oak-cr507-02117",
    "21.27 sq ft per carton; $11.69/sq ft manufacturer estimate",
  ),
  dealers: src(
    "Dealer listings: Floorzz (COREtec Plus), Floor City (Shaw Paragon), Flooring Inc (RevWood Plus)",
    "https://www.floorcity.com/products/shaw-floorte-pro-paragon-7-plus-1020v-00913-whitefill-oak",
    "Shaw Paragon 7\" Plus 18.91 sq ft, attached pad, $109.49; COREtec Plus 38.03 sq ft, $239.21; RevWood Elderwood 16.93 sq ft, $69.24",
  ),
  fdAccessories: src(
    "Floor & Decor underlayment and molding pages (live)",
    "https://www.flooranddecor.com/underlayment-installation-materials",
    "EZ Foam 100 sq ft $40.49; 15 lb felt 432 sq ft $32.97; 94 in quarter round $3.35",
  ),
  tohVinyl: src(
    "This Old House — cost to install vinyl plank flooring (June 2026)",
    "https://www.thisoldhouse.com/flooring/cost-to-install-vinyl-plank-flooring",
    "labor $3–$10 per sq ft; removal about $1–$2 per sq ft",
  ),
  tohHardwood: src(
    "This Old House — hardwood flooring cost (June 2026)",
    "https://www.thisoldhouse.com/flooring/hardwood-flooring-cost",
    "hardwood labor $3–$8 per sq ft",
  ),
  laminateLabor: src(
    "This Old House — laminate installation cost (Apr 2026); RealCostIQ (Sep 2026)",
    "https://www.thisoldhouse.com/flooring/laminate-flooring-installation-cost",
    "laminate labor $4–$8 per sq ft (This Old House); $1–$2 floating (RealCostIQ)",
  ),
  trims: src(
    "Home Depot trim listings (cached 2026) and Lowe's hardwood T-moulding sheet",
    "https://pdf.lowes.com/productdocuments/d011e694-61b8-45be-9f96-4710d41afdef/07839193.pdf",
    "vinyl/laminate trims 94 in (T-molding ~$34.98, reducer ~$42.78, stair nose ~$59.98); hardwood T-moulding 78 in",
  ),
  fixrHardwood: src(
    "Fixr — hardwood floor installation cost (Jan 2025)",
    "https://www.fixr.com/costs/hardwood-floor-installation",
    "new hardwood stair treads $100–$200 per step installed",
  ),
  shawCarpet: src(
    "Shaw Floors — carpet planning & installation",
    "https://shawfloors.com/en-us/plan-and-install/carpet",
    "most carpet is made in 12 ft rolls; 15 ft rolls on some styles",
  ),
  cri105: src(
    "CRI 105 Standard for Installation of Residential Carpet (2019)",
    "https://carpet-rug.org/wp-content/uploads/2019/03/CRI-105-STANDARD-For-INSTALLATION-of-RESIDENTIAL-CARPET.pdf",
    "seam placement, same pile direction, 7/16 in max cushion, tack strip rules, 24 h acclimation, stair nosing",
  ),
  shawWarranty: src(
    "Shaw Pet Perfect+ residential carpet warranty (rev. Sept 2026)",
    "https://pdmsview.shawinc.com/viewer/document/doc/42515",
    "recommended pad no thicker than 1/2 in",
  ),
  fixrStairs: src(
    "Fixr — cost to carpet stairs (Jan 2025)",
    "https://www.fixr.com/costs/carpet-stairs",
    "about 54 sq ft for 12 straight steps; $36–$65 per step installed",
  ),
  tohCarpet: src(
    "This Old House — carpet installation cost (June 2026)",
    "https://www.thisoldhouse.com/flooring/carpet-installation-cost",
    "labor $0.50–$1 per sq ft; pad $0.75–$2; stairs $11–$26 extra per step; removal $2–$3",
  ),
  caldwellPad: src(
    "Caldwell Carpet — memory foam rebond pad",
    "https://www.caldwellcarpet.com/memory-foam-rebond-carpet-pad.htm",
    "$0.77 per sq ft full-roll price",
  ),
  lowesBaseboard: src(
    "Lowe's Moulding Installation Guide — Baseboard",
    "https://pdf.lowes.com/productdocuments/70875ac2-4104-4e92-8491-92cf7dc86878/71753585.pdf",
    "nail into studs every 16–18 in; cope or miter inside corners, miter outside corners, scarf-join long walls",
  ),
  dapCaulk: src(
    "DAP Alex Plus technical bulletin",
    "https://pdf.lowes.com/productdocuments/d3706af2-2382-4ccd-95b3-2704596a1df0/65369938.pdf",
    "10.1 fl oz cartridge = 55 linear ft at a 3/16 in bead",
  ),
  swPaint: src(
    "Sherwin-Williams Emerald Interior — product data and prices",
    "https://www.sherwin-williams.com/homeowners/products/emerald-interior-acrylic-latex-paint",
    "350–400 sq ft per gallon per coat; semi-gloss $24.59 per quart, $63.89 per gallon (Oct 2026)",
  ),
  angiBaseboard: src(
    "Angi — baseboard installation cost (2026)",
    "https://www.angi.com/articles/how-much-does-it-cost-replace-baseboards.htm",
    "MDF $1.00–$1.40 per linear ft; labor $5–$7.75 per linear ft",
  ),
} satisfies Record<string, SourceRef>;

export const FLOORING_SOURCES: SourceRef[] = [
  SOURCES.lifeproof,
  SOURCES.lifeproofHerringbone,
  SOURCES.pergo,
  SOURCES.pergo2018,
  SOURCES.coretec,
  SOURCES.bruceSolid,
  SOURCES.bruceEngineered,
  SOURCES.nucore,
  SOURCES.arbor,
  SOURCES.coretecOriginals,
  SOURCES.dealers,
  SOURCES.fdAccessories,
  SOURCES.trims,
  SOURCES.tohVinyl,
  SOURCES.tohHardwood,
  SOURCES.laminateLabor,
  SOURCES.fixrHardwood,
];

export const CARPET_SOURCES: SourceRef[] = [
  SOURCES.shawCarpet,
  SOURCES.cri105,
  SOURCES.shawWarranty,
  SOURCES.fixrStairs,
  SOURCES.tohCarpet,
  SOURCES.caldwellPad,
];

export const BASEBOARD_SOURCES: SourceRef[] = [
  SOURCES.lowesBaseboard,
  SOURCES.dapCaulk,
  SOURCES.swPaint,
  SOURCES.angiBaseboard,
  SOURCES.fdAccessories,
];
