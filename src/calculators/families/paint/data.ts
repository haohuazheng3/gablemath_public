// Paint, primer and stain data, checked against manufacturer product data sheets (PDS/TDS), the
// Sherwin-Williams / Benjamin Moore / Valspar / Glidden calculators' own code and API responses, and
// national online prices. Full evidence trail (URLs, quotes, dates): research/paint.verified.json.
// Update PAINT_CHECKED when re-verifying.

import type { SourceRef } from "@/calculators/types";

export const PAINT_CHECKED = "2026-10-23";

/* ───────── packaging ───────── */

export type PackSize = "qt" | "gal" | "p35" | "p5";

/** US gallons per container. KILZ 2 is also sold in a 3.5-gal pail (Walmart, Oct 2026). */
export const PACK_GAL: Record<PackSize, number> = { qt: 0.25, gal: 1, p35: 3.5, p5: 5 };

export const PACK_NAME: Record<PackSize, string> = { qt: "1-qt can", gal: "1-gal can", p35: "3.5-gal pail", p5: "5-gal pail" };

export interface PackPrices {
  qt?: number;
  gal?: number;
  p35?: number;
  p5?: number;
}

/**
 * Quart price as a share of the gallon when a store does not list the quart online. Median of 12
 * quart/gallon pairs priced 2026-10-23 (SW Emerald/Duration Home/SuperPaint/Urethane/PW&W 36–42%,
 * KILZ 2 42%, KILZ 3 45%, Clark+Kensington 49%, Glidden High Endurance Plus 52%).
 */
export const QUART_SHARE_ESTIMATE = 0.4;

/* ───────── calculator conventions ───────── */

/** Standard openings: Sherwin-Williams, Glidden and Valspar deduct a 3×7 ft door and a 3×5 ft window. */
export const OPENING = { doorW: 3, doorH: 7, windowW: 3, windowH: 5 } as const;

/** What the two big brand calculators assume — used to show why their answers differ. */
export const BRAND_CALC = {
  swInterior: 400, // sq ft/gal, one coat, rounded up to 0.1 gal per coat
  swExterior: 350,
  swDeck: 250,
  swDoorSqFt: 21,
  swWindowSqFt: 15,
  bmRate: 350, // sq ft/gal, always 2 coats, walls only
  bmCoats: 2,
  bmDoorSqFt: 21,
  bmWindowSqFt: 12,
} as const;

/** Rate we plan with for products that only publish a maximum ("up to 400 sq ft"). Benjamin Moore's own calculator uses 350. */
export const UP_TO_PLAN = 350;

/** Extra paint for airless spraying. Behr and Zinsser coverage figures exclude spray loss; 25% is our estimate (15–30% range). */
export const SPRAY_LOSS_PCT = 25;

/** Valspar: "One fully-loaded roller should cover an area of about 9 square feet." */
export const SQFT_PER_ROLLER_LOAD = 9;

/* ───────── interior surfaces ───────── */

export type TextureId = "smooth" | "light" | "heavy";

/** Coverage efficiency on textured walls (editable estimates; SW's calculator ignores texture, Valspar's multiplies area ×2/×3). */
export const WALL_TEXTURES: { id: TextureId; label: string; sub: string; factor: number; nap: string }[] = [
  { id: "smooth", label: "Smooth", sub: "flat drywall", factor: 1, nap: "3/8 in" },
  { id: "light", label: "Light texture", sub: "orange peel", factor: 0.9, nap: "1/2 in" },
  { id: "heavy", label: "Heavy texture", sub: "skip trowel", factor: 0.75, nap: "3/4 in" },
];

/** Popcorn / heavily textured ceiling — same estimate as heavy wall texture. */
export const POPCORN_FACTOR = 0.75;

export type PrimerUse = "none" | "porous" | "sealed" | "spot";

export interface Scenario {
  id: string;
  label: string;
  coats: number;
  primer: PrimerUse;
  why: string;
}

export const SCENARIOS: Scenario[] = [
  {
    id: "same",
    label: "Same or similar color",
    coats: 2,
    primer: "none",
    why: "Two coats is the norm (Sherwin-Williams, Valspar Signature). Benjamin Moore and Valspar Reserve list 1 or 2 coats for a same-color refresh in a premium line.",
  },
  {
    id: "change",
    label: "Big color change",
    coats: 2,
    primer: "sealed",
    why: "Sherwin-Williams: on a drastic color change, a coat of primer improves the topcoat's hiding. Behr's label calls for a tinted primer coat for drastic changes and deep colors.",
  },
  {
    id: "dark",
    label: "Dark to light",
    coats: 2,
    primer: "sealed",
    why: "A white or light-tinted primer stops the old dark color ghosting through — usually cheaper than a third coat of finish paint.",
  },
  {
    id: "drywall",
    label: "New drywall",
    coats: 2,
    primer: "porous",
    why: "Sherwin-Williams' drywall system: 1 coat of drywall/wall primer + 2 topcoats (or self-prime with 2 coats of Emerald). Bare joint compound soaks up paint unevenly without it.",
  },
  {
    id: "stains",
    label: "Water stains / marks",
    coats: 2,
    primer: "spot",
    why: "Spot-prime stains with a stain-blocking primer (Zinsser 1-2-3, KILZ 2) before the topcoats — a quart covers most spot repairs.",
  },
];

export function scenario(id: string): Scenario {
  return SCENARIOS.find((s) => s.id === id) ?? SCENARIOS[0];
}

/* ───────── products ───────── */

export type PriceBasis = "online" | "indicative";

export interface PaintProduct {
  id: string;
  brand: string;
  name: string;
  /** Maker's published spread rate per coat (sq ft/gal); low end null when only "up to" is published. */
  rated: readonly [number | null, number];
  /** Planning rate when it is not the low end of `rated`. */
  plan?: number;
  prices?: PackPrices;
  basis?: PriceBasis;
  priceNote?: string;
  coats: string;
  note: string;
  minTempF?: number;
  source: PaintSourceKey;
}

const SW_PRICE = "Sherwin-Williams online price, Oct 23 2026 (SW runs frequent % off sales)";
const BM_PRICE = "benjaminmoore.com price, Oct 23 2026 (independent dealers set their own)";
const WM_PRICE = "Walmart.com first-party price, Oct 23 2026";
const BEHR_PRICE = "Indicative mid-2026 street price (third-party compilation; homedepot.com blocks price checks)";

/** Interior wall paints. Planning rate = low end of the maker's range so you don't run short. */
export const WALL_PAINTS: PaintProduct[] = [
  {
    id: "typical",
    brand: "Any brand",
    name: "Typical latex wall paint",
    rated: [350, 400],
    coats: "2 coats",
    note: "350 sq ft per gallon per coat — the low end of Sherwin-Williams' and Benjamin Moore's ranges, and the figure Benjamin Moore's calculator uses.",
    source: "bmCalc",
  },
  {
    id: "sw-emerald",
    brand: "Sherwin-Williams",
    name: "Emerald Interior",
    rated: [350, 400],
    prices: { qt: 23.39, gal: 62.09, p5: 307.45 }, // satin, Extra White
    basis: "online",
    priceNote: SW_PRICE,
    coats: "2 coats; self-primes drywall with 2 coats",
    note: "SW's top interior line; apply above 50°F.",
    minTempF: 50,
    source: "swEmerald",
  },
  {
    id: "sw-duration-home",
    brand: "Sherwin-Williams",
    name: "Duration Home Interior",
    rated: [350, 400],
    prices: { qt: 21.29, gal: 57.59, p5: 284.95 }, // matte
    basis: "online",
    priceNote: SW_PRICE,
    coats: "2 coats",
    note: "Scrubbable premium line, a step below Emerald in price.",
    source: "swDurationHome",
  },
  {
    id: "sw-superpaint",
    brand: "Sherwin-Williams",
    name: "SuperPaint Interior",
    rated: [350, 400],
    prices: { qt: 19.19, gal: 50.09, p5: 247.45 }, // flat
    basis: "online",
    priceNote: SW_PRICE,
    coats: "Primer + 2 coats on new surfaces",
    note: "SW's mid-priced workhorse.",
    source: "swSuperPaint",
  },
  {
    id: "sw-cashmere",
    brand: "Sherwin-Williams",
    name: "Cashmere Interior",
    rated: [350, 400],
    prices: { gal: 51.29 }, // low lustre
    basis: "online",
    priceNote: SW_PRICE,
    coats: "1–2 coats over previously painted walls",
    note: "Smooth-leveling mid-priced line.",
    source: "swCashmere",
  },
  {
    id: "sw-promar200",
    brand: "Sherwin-Williams",
    name: "ProMar 200 Zero VOC",
    rated: [350, 400],
    coats: "2 coats",
    note: "Contractor line sold at SW pro desks — no public online price; ask for your account price. (SW's older Captivate line is no longer in the catalog.)",
    source: "swProMar",
  },
  {
    id: "bm-regal-select",
    brand: "Benjamin Moore",
    name: "Regal Select",
    rated: [400, 450],
    prices: { gal: 84.99 }, // eggshell
    basis: "online",
    priceNote: BM_PRICE,
    coats: "2 coats on new/unprimed, 1–2 over paint",
    note: "Higher spread rate than Aura despite the lower price.",
    source: "bmRegal",
  },
  {
    id: "bm-ben",
    brand: "Benjamin Moore",
    name: "ben Interior",
    rated: [400, 450],
    prices: { gal: 60.99 },
    basis: "online",
    priceNote: BM_PRICE,
    coats: "1–2 coats, self-priming",
    note: "BM's mid-priced line.",
    source: "bmBen",
  },
  {
    id: "bm-aura",
    brand: "Benjamin Moore",
    name: "Aura Interior",
    rated: [350, 400],
    prices: { gal: 108.99 },
    basis: "online",
    priceNote: BM_PRICE,
    coats: "1–2 coats",
    note: "Thicker film, so it spreads less per gallon than Regal Select.",
    source: "bmAura",
  },
  {
    id: "bm-ultra-spec",
    brand: "Benjamin Moore",
    name: "Ultra Spec 500",
    rated: [350, 400],
    coats: "1–2 coats",
    note: "Contractor line — no public online price.",
    source: "bmUltraSpec",
  },
  {
    id: "behr-ultra",
    brand: "Behr",
    name: "Ultra Scuff Defense",
    rated: [250, 400],
    prices: { gal: 42 },
    basis: "indicative",
    priceNote: BEHR_PRICE,
    coats: "2 coats; tinted primer for drastic color changes",
    note: "Behr's 250–400 range depends on application method and porosity and excludes spray loss.",
    minTempF: 50,
    source: "behrUltra",
  },
  {
    id: "behr-premium-plus",
    brand: "Behr",
    name: "Premium Plus",
    rated: [250, 400],
    prices: { gal: 33 },
    basis: "indicative",
    priceNote: BEHR_PRICE,
    coats: "2 coats",
    note: "Home Depot's value paint-and-primer line.",
    source: "behrLines",
  },
  {
    id: "behr-dynasty",
    brand: "Behr",
    name: "Dynasty",
    rated: [250, 400],
    prices: { gal: 65 },
    basis: "indicative",
    priceNote: BEHR_PRICE,
    coats: "1–2 coats",
    note: "Behr has not published a Dynasty-specific spread rate we could verify; this uses the 250–400 range Behr prints for its other interior lines.",
    source: "behrLines",
  },
  {
    id: "behr-marquee",
    brand: "Behr",
    name: "Marquee",
    rated: [250, 400],
    coats: "1–2 coats",
    note: "Behr: 250–400 sq ft per gallon depending on application method and porosity, excluding spray loss.",
    source: "behrLines",
  },
  {
    id: "valspar-signature",
    brand: "Valspar",
    name: "Signature",
    rated: [200, 400],
    coats: "2 coats",
    note: "Lowe's line; Valspar lists 200–400 sq ft per gallon.",
    minTempF: 50,
    source: "valspar",
  },
  {
    id: "valspar-ultra",
    brand: "Valspar",
    name: "Ultra",
    rated: [300, 400],
    coats: "1–2 coats",
    note: "Lowe's line.",
    source: "valspar",
  },
  {
    id: "valspar-reserve",
    brand: "Valspar",
    name: "Reserve",
    rated: [400, 400],
    coats: "1–2 coats",
    note: "Valspar's premium one-coat line, rated at 400 sq ft per gallon.",
    source: "valspar",
  },
  {
    id: "glidden-diamond",
    brand: "Glidden (PPG)",
    name: "Diamond",
    rated: [null, 400],
    coats: "2 coats on bare surfaces",
    note: "Glidden lists only 'up to 400' on primed, smooth, nonporous surfaces, so we plan at 350.",
    source: "gliddenDiamond",
  },
  {
    id: "glidden-hep",
    brand: "Glidden (PPG)",
    name: "High Endurance Plus",
    rated: [null, 400],
    prices: { qt: 21.47, gal: 41.47 }, // eggshell
    basis: "online",
    priceNote: WM_PRICE,
    coats: "2 coats on bare surfaces",
    note: "Rated 'up to 400' — planned at 350. Its quart is 52% of the gallon price, so two quarts cost more than a gallon.",
    source: "gliddenWalmart",
  },
  {
    id: "glidden-fundamentals",
    brand: "Glidden (PPG)",
    name: "Fundamentals",
    rated: [null, 400],
    prices: { qt: 14.97, gal: 22.97, p5: 114 }, // eggshell gallon; quart and 5-gal are the semi-gloss listings
    basis: "online",
    priceNote: WM_PRICE,
    coats: "2 coats",
    note: "Budget line at Walmart; listing coverage 400 (planned at 350).",
    source: "gliddenWalmart",
  },
  {
    id: "clark-kensington",
    brand: "Clark+Kensington",
    name: "Interior Paint + Primer",
    rated: [400, 450],
    prices: { qt: 20.99, gal: 42.99, p5: 219.99 }, // satin
    basis: "indicative",
    priceNote: "Ace Hardware listing (search snapshot Oct 2026; Ace blocks automated price checks)",
    coats: "1–2 coats",
    note: "Ace Hardware's house brand; Ace lists 400–450 sq ft per gallon.",
    source: "clarkKensington",
  },
];

/** Ceiling paints; "same" reuses the wall paint line. */
export const CEILING_PAINTS: PaintProduct[] = [
  {
    id: "sw-ceiling",
    brand: "Sherwin-Williams",
    name: "Premium Ceiling Paint",
    rated: [350, 400],
    prices: { gal: 38.39, p5: 188.95 },
    basis: "online",
    priceNote: SW_PRICE,
    coats: "2 coats on new surfaces",
    note: "Flat white ceiling paint.",
    source: "swCeiling",
  },
  {
    id: "bm-muresco",
    brand: "Benjamin Moore",
    name: "Muresco Ceiling",
    rated: [400, 450],
    prices: { gal: 50.99 },
    basis: "online",
    priceNote: BM_PRICE,
    coats: "1–2 coats",
    note: "Ultra-flat ceiling paint.",
    source: "bmMuresco",
  },
  {
    id: "glidden-ceiling",
    brand: "Glidden (PPG)",
    name: "Interior Flat Ceiling",
    rated: [200, 300],
    coats: "1–2 coats",
    note: "Glidden's data sheet rates it at only 200–300 sq ft per gallon — far below wall paints.",
    source: "gliddenCeiling",
  },
];

/** Trim, door and cabinet enamels; "same" reuses the wall paint line in a semi-gloss sheen. */
export const TRIM_PAINTS: PaintProduct[] = [
  {
    id: "sw-urethane",
    brand: "Sherwin-Williams",
    name: "Emerald Urethane Trim Enamel",
    rated: [350, 400],
    prices: { qt: 32.69, gal: 78.29, p5: 388.45 }, // satin
    basis: "online",
    priceNote: SW_PRICE,
    coats: "2 coats",
    note: "Waterbased urethane enamel for trim, doors and cabinets.",
    source: "swUrethane",
  },
  {
    id: "bm-advance",
    brand: "Benjamin Moore",
    name: "Advance",
    rated: [400, 500],
    prices: { gal: 88.99 },
    basis: "online",
    priceNote: BM_PRICE,
    coats: "1–2 coats; 16 h before recoat",
    note: "Waterborne alkyd that levels like oil paint.",
    source: "bmAdvance",
  },
];

export interface PrimerProduct extends PaintProduct {
  /** Rate on bare drywall, joint compound, bare wood and other porous surfaces. */
  porous: number;
  /** Rate over sealed, previously painted surfaces. */
  sealed: number;
  /** Rate on rough, porous stucco where the maker publishes one. */
  roughStucco?: number;
}

export const INTERIOR_PRIMERS: PrimerProduct[] = [
  {
    id: "kilz2",
    brand: "KILZ",
    name: "KILZ 2 All-Purpose",
    rated: [300, 400],
    porous: 300,
    sealed: 400,
    prices: { qt: 9.97, gal: 23.97, p35: 65, p5: 94 },
    basis: "online",
    priceNote: WM_PRICE,
    coats: "1 coat; topcoat in 1 hour",
    note: "Water-based stain blocker. The 3.5-gal pail ($18.57/gal) is cheaper per gallon than the 5-gal ($18.80).",
    source: "kilz2",
  },
  {
    id: "zinsser-123",
    brand: "Zinsser",
    name: "Bulls Eye 1-2-3",
    rated: [400, 450],
    porous: 350, // TDS practical coverage on porous surfaces (assumes 15% loss)
    sealed: 450,
    prices: { gal: 29.98, p5: 122.8 },
    basis: "online",
    priceNote: WM_PRICE,
    coats: "1 coat",
    note: "Zinsser's practical coverage: 450 sq ft/gal non-porous, 350 porous (assumes 15% material loss).",
    source: "zinsser",
  },
  {
    id: "behr-436",
    brand: "Behr",
    name: "Multi-Surface Primer & Sealer No. 436",
    rated: [250, 400],
    porous: 250,
    sealed: 400,
    coats: "1 coat; topcoat in 1 hour",
    note: "Interior/exterior primer; Behr label rates 250–400 sq ft per gallon.",
    source: "behr436",
  },
  {
    id: "sw-pww",
    brand: "Sherwin-Williams",
    name: "Premium Wall & Wood Primer",
    rated: [400, 400],
    porous: 400,
    sealed: 400,
    prices: { qt: 15.59, gal: 43.19, p5: 213.55 },
    basis: "online",
    priceNote: SW_PRICE,
    coats: "1 coat",
    note: "SW's drywall/wood primer, 400 sq ft per gallon at 4 mils wet.",
    source: "swPww",
  },
  {
    id: "bm-fresh-start",
    brand: "Benjamin Moore",
    name: "Fresh Start High-Hiding (046)",
    rated: [400, 450],
    porous: 400,
    sealed: 450,
    prices: { gal: 54.99 },
    basis: "online",
    priceNote: BM_PRICE,
    coats: "1 coat; 2 on severe stains",
    note: "High-hiding all-purpose primer.",
    source: "bmFreshStart",
  },
];

/* ───────── exterior ───────── */

export const EXTERIOR_PAINTS: PaintProduct[] = [
  {
    id: "typical-ext",
    brand: "Any brand",
    name: "Typical exterior latex",
    rated: [250, 400],
    plan: 300,
    coats: "2 coats new/bare, 1 coat repaint (premium lines)",
    note: "300 sq ft per gallon per coat — the middle of the premium high-build lines (250–350). Sherwin-Williams' calculator assumes 350.",
    source: "swCalc",
  },
  {
    id: "sw-emerald-ext",
    brand: "Sherwin-Williams",
    name: "Emerald Exterior",
    rated: [250, 300],
    prices: { gal: 70.79, p5: 350.95 }, // flat
    basis: "online",
    priceNote: SW_PRICE,
    coats: "Self-priming: 2 coats new construction, 1 coat repaint",
    note: "High film build, so fewer square feet per gallon. Applies down to 35°F.",
    minTempF: 35,
    source: "swEmeraldExt",
  },
  {
    id: "sw-duration-ext",
    brand: "Sherwin-Williams",
    name: "Duration Exterior",
    rated: [250, 300],
    prices: { gal: 66.89, p5: 331.45 }, // flat
    basis: "online",
    priceNote: SW_PRICE,
    coats: "2 coats on bare substrates, 1 coat on repaints",
    note: "High-build premium line; applies down to 35°F.",
    minTempF: 35,
    source: "swDurationExt",
  },
  {
    id: "sw-superpaint-ext",
    brand: "Sherwin-Williams",
    name: "SuperPaint Exterior",
    rated: [350, 400],
    prices: { gal: 52.19, p5: 257.95 }, // flat
    basis: "online",
    priceNote: SW_PRICE,
    coats: "2 coats",
    note: "Mid-priced; applies down to 35°F.",
    minTempF: 35,
    source: "swSuperPaintExt",
  },
  {
    id: "sw-a100",
    brand: "Sherwin-Williams",
    name: "A-100 Exterior",
    rated: [350, 400],
    prices: { gal: 40.49, p5: 199.45 }, // flat
    basis: "online",
    priceNote: SW_PRICE,
    coats: "2 coats",
    note: "SW's value exterior line; applies down to 35°F.",
    minTempF: 35,
    source: "swA100",
  },
  {
    id: "sw-latitude",
    brand: "Sherwin-Williams",
    name: "Latitude Exterior",
    rated: [350, 400],
    coats: "2 coats on most substrates",
    note: "Applies from 35°F to 120°F; no public online price.",
    minTempF: 35,
    source: "swLatitude",
  },
  {
    id: "bm-aura-ext",
    brand: "Benjamin Moore",
    name: "Aura Exterior",
    rated: [250, 350],
    coats: "1–2 coats",
    note: "On masonry, BM's high-build system drops to 160–265 sq ft per gallon. Down to 35°F.",
    minTempF: 35,
    source: "bmAuraExt",
  },
  {
    id: "bm-regal-ext",
    brand: "Benjamin Moore",
    name: "Regal Select Exterior",
    rated: [250, 350],
    coats: "1–2 coats",
    note: "High-build flat/low-lustre; down to 35°F.",
    minTempF: 35,
    source: "bmRegalExt",
  },
  {
    id: "bm-element-guard",
    brand: "Benjamin Moore",
    name: "Element Guard",
    rated: [300, 400],
    prices: { gal: 66.99 },
    basis: "online",
    priceNote: BM_PRICE,
    coats: "1–2 coats, self-priming",
    note: "Down to 35°F.",
    minTempF: 35,
    source: "bmElementGuard",
  },
  {
    id: "bm-ultra-spec-ext",
    brand: "Benjamin Moore",
    name: "Ultra Spec EXT",
    rated: [350, 450],
    coats: "1–2 coats",
    note: "Contractor line — needs 40°F, not 35°F.",
    minTempF: 40,
    source: "bmUltraSpecExt",
  },
  {
    id: "behr-ultra-ext",
    brand: "Behr",
    name: "Ultra Exterior",
    rated: [250, 400],
    coats: "2 coats",
    note: "Behr lists 250–400 sq ft per gallon; 2-hour recoat.",
    source: "behrUltraExt",
  },
  {
    id: "valspar-duramax",
    brand: "Valspar",
    name: "Duramax Exterior",
    rated: [300, 400],
    coats: "2 coats",
    note: "Lowe's line; applies from 35°F to 90°F.",
    minTempF: 35,
    source: "valsparDuramax",
  },
  {
    id: "ck-ext",
    brand: "Clark+Kensington",
    name: "Exterior Paint + Primer",
    rated: [350, 450],
    prices: { gal: 48.99 }, // flat
    basis: "indicative",
    priceNote: "Ace Hardware listing (search snapshot Oct 2026; Ace blocks automated price checks)",
    coats: "2 coats",
    note: "Ace Hardware's house brand.",
    source: "clarkKensington",
  },
];

export const EXTERIOR_PRIMERS: PrimerProduct[] = [
  {
    id: "sw-ext-wood",
    brand: "Sherwin-Williams",
    name: "Exterior Latex Wood Primer",
    rated: [400, 400],
    porous: 400,
    sealed: 400,
    coats: "1 coat",
    note: "For bare exterior wood; applies down to 35°F.",
    minTempF: 35,
    source: "swExtWoodPrimer",
  },
  {
    id: "sw-loxon",
    brand: "Sherwin-Williams",
    name: "Loxon Concrete & Masonry Primer",
    rated: [200, 320],
    porous: 200,
    sealed: 320,
    roughStucco: 80,
    coats: "1 coat; spray and back-roll rough stucco",
    note: "For stucco, brick, block and fiber cement. SW rates it at only 80 sq ft per gallon on porous, rough stucco.",
    source: "swLoxon",
  },
  {
    id: "behr-436-ext",
    brand: "Behr",
    name: "Multi-Surface Primer & Sealer No. 436",
    rated: [250, 400],
    porous: 250,
    sealed: 400,
    coats: "1 coat",
    note: "Interior/exterior primer, 250–400 sq ft per gallon.",
    source: "behr436",
  },
  {
    id: "kilz2-ext",
    brand: "KILZ",
    name: "KILZ 2 All-Purpose",
    rated: [300, 400],
    porous: 300,
    sealed: 400,
    prices: { qt: 9.97, gal: 23.97, p35: 65, p5: 94 },
    basis: "online",
    priceNote: WM_PRICE,
    coats: "1 coat",
    note: "Interior/exterior water-based primer.",
    source: "kilz2",
  },
];

export type SidingId = "vinyl" | "fiber-cement" | "wood-lap" | "rough-cedar" | "stucco" | "stucco-rough" | "brick";

/** Coverage efficiency by siding (1 = the data-sheet rate on smooth, sealed surfaces). */
export const SIDING: { id: SidingId; label: string; factor: number; estimate: boolean; note: string }[] = [
  { id: "vinyl", label: "Vinyl", factor: 1, estimate: false, note: "Smooth and nonporous. Stay at or lighter than the original color unless the paint line offers vinyl-safe colors — dark colors absorb heat and can warp vinyl." },
  { id: "fiber-cement", label: "Fiber cement", factor: 1, estimate: false, note: "Factory-primed boards are smooth; bare fiber cement takes a masonry primer such as Loxon." },
  { id: "wood-lap", label: "Wood lap / clapboard", factor: 1, estimate: false, note: "Smooth, previously painted wood. Brush the bottom (drip) edge of every course." },
  { id: "rough-cedar", label: "Rough-sawn cedar / T1-11", factor: 0.57, estimate: true, note: "Rough wood drinks paint: SW rates its deck stain at 100–200 sq ft/gal on rough wood vs 350 on smooth. We use the best case (200 ÷ 350)." },
  { id: "stucco", label: "Stucco (smooth / sand)", factor: 0.64, estimate: true, note: "Benjamin Moore's masonry high-build rate is 160–265 sq ft/gal vs 250–350 on siding (160 ÷ 250)." },
  { id: "stucco-rough", label: "Stucco (rough / dash)", factor: 0.4, estimate: true, note: "SW Loxon primer covers 80 sq ft/gal on rough stucco vs 200 normally (80 ÷ 200). Spray and back-roll." },
  { id: "brick", label: "Brick / block", factor: 0.64, estimate: true, note: "Same masonry rate as smooth stucco. Painted brick can't easily go back to bare brick." },
];

export function siding(id: string) {
  return SIDING.find((s) => s.id === id) ?? SIDING[2];
}

/* ───────── deck & fence stains ───────── */

export type Opacity = "transparent" | "semi" | "solid" | "resurfacer";
export type WoodCondition = "new" | "weathered" | "rough";

export const OPACITIES: { id: Opacity; label: string; sub: string }[] = [
  { id: "transparent", label: "Clear / toner", sub: "grain fully visible" },
  { id: "semi", label: "Semi-transparent", sub: "grain shows" },
  { id: "solid", label: "Solid", sub: "hides grain" },
  { id: "resurfacer", label: "Resurfacer", sub: "thick, paint-like" },
];

export const WOOD_CONDITIONS: { id: WoodCondition; label: string; sub: string }[] = [
  { id: "new", label: "New, smooth", sub: "dense boards" },
  { id: "weathered", label: "Weathered", sub: "gray, porous" },
  { id: "rough", label: "Rough-sawn", sub: "fence boards" },
];

/**
 * Ready Seal's 2026 table rates rough cedar siding at 125 sq ft/gal vs 150 for smooth cedar siding.
 * We apply the same ratio to a product's low-end rate on rough-sawn wood.
 */
export const ROUGH_WOOD_FACTOR = 125 / 150;

export interface StainProduct {
  id: string;
  brand: string;
  name: string;
  opacity: Opacity;
  /** First-coat spread rate, sq ft/gal (maker's range). */
  coat1: readonly [number, number];
  /** Later coats where the maker publishes a thinner second-coat rate. */
  coat2?: readonly [number, number];
  /** Rates the maker publishes by surface, overriding the range rule. */
  byCondition?: Record<WoodCondition, number>;
  coats: number;
  maxCoats: number;
  coatsNote: string;
  note: string;
  prices?: PackPrices;
  basis?: PriceBasis;
  priceNote?: string;
  minTempF?: number;
  source: PaintSourceKey;
}

export const STAINS: StainProduct[] = [
  {
    id: "typical-semi",
    brand: "Any brand",
    name: "Typical semi-transparent stain",
    opacity: "semi",
    coat1: [200, 200],
    coats: 2,
    maxCoats: 3,
    coatsNote: "Check the can — some semi-transparents are one-coat products.",
    note: "200 sq ft per gallon per coat, a conservative planning figure below most makers' ranges.",
    source: "swSuperDeck",
  },
  {
    id: "thompsons-clear",
    brand: "Thompson's WaterSeal",
    name: "Clear Wood Sealer",
    opacity: "transparent",
    coat1: [200, 400],
    coats: 1,
    maxCoats: 1,
    coatsNote: "One light coat only.",
    note: "Clear water sealer; no UV color.",
    prices: { gal: 19.94, p5: 92.87 },
    basis: "online",
    priceNote: WM_PRICE,
    source: "thompsonsClear",
  },
  {
    id: "thompsons-transparent",
    brand: "Thompson's WaterSeal",
    name: "Transparent Wood Sealer",
    opacity: "transparent",
    coat1: [150, 400],
    coats: 1,
    maxCoats: 1,
    coatsNote: "One coat.",
    note: "Lightly tinted sealer.",
    source: "thompsonsSemi",
  },
  {
    id: "woodluxe-translucent",
    brand: "Benjamin Moore",
    name: "Woodluxe Translucent (0691)",
    opacity: "transparent",
    coat1: [300, 400],
    coats: 1,
    maxCoats: 1,
    coatsNote: "Apply one uniform coat.",
    note: "Water-based; apply at 40°F or warmer.",
    prices: { gal: 57.99 },
    basis: "online",
    priceNote: BM_PRICE,
    minTempF: 40,
    source: "bmWoodluxe",
  },
  {
    id: "cabot-ato",
    brand: "Cabot",
    name: "Australian Timber Oil",
    opacity: "transparent",
    coat1: [250, 600],
    coats: 1,
    maxCoats: 1,
    coatsNote: "Apply one coat only.",
    note: "Translucent penetrating oil.",
    source: "cabotAto",
  },
  {
    id: "behr-semi",
    brand: "Behr",
    name: "Premium Semi-Transparent (No. 5077)",
    opacity: "semi",
    coat1: [300, 300],
    coat2: [500, 500],
    coats: 2,
    maxCoats: 2,
    coatsNote: "Two coats required: first at 300 sq ft/gal, a thinner second at 500.",
    note: "For new to moderately weathered wood (0–10 years). Over-application leads to peeling.",
    source: "behrSemi",
  },
  {
    id: "olympic-elite-semi",
    brand: "Olympic",
    name: "Elite Semi-Transparent",
    opacity: "semi",
    coat1: [250, 350],
    coats: 2,
    maxCoats: 2,
    coatsNote: "Two coats recommended for maximum durability.",
    note: "Applies from 35°F to 90°F.",
    minTempF: 35,
    source: "olympicElite",
  },
  {
    id: "cabot-semi",
    brand: "Cabot",
    name: "Semi-Transparent Stain & Sealer (oil)",
    opacity: "semi",
    coat1: [200, 650],
    coats: 1,
    maxCoats: 1,
    coatsNote: "Apply 1 coat only.",
    note: "Oil-based; the wide range reflects wood porosity.",
    source: "cabotSemi",
  },
  {
    id: "thompsons-semi",
    brand: "Thompson's WaterSeal",
    name: "Semi-Transparent Wood Sealer",
    opacity: "semi",
    coat1: [150, 400],
    coats: 1,
    maxCoats: 1,
    coatsNote: "One coat.",
    note: "Budget tinted sealer.",
    prices: { gal: 28.98 },
    basis: "online",
    priceNote: WM_PRICE,
    source: "thompsonsSemi",
  },
  {
    id: "sw-superdeck-semi",
    brand: "Sherwin-Williams",
    name: "SuperDeck Semi-Transparent",
    opacity: "semi",
    coat1: [100, 350],
    // PDS: smooth 350; rough/porous 100–200 (weathered = top of that range, rough-sawn = its middle)
    byCondition: { new: 350, weathered: 200, rough: 150 },
    coats: 1,
    maxCoats: 2,
    coatsNote: "Two coats may be necessary to reach the selected color.",
    note: "Oil-based deck & log-home stain; apply 50–90°F.",
    prices: { gal: 51.35, p5: 253.75 },
    basis: "online",
    priceNote: SW_PRICE,
    minTempF: 50,
    source: "swSuperDeck",
  },
  {
    id: "woodluxe-semi",
    brand: "Benjamin Moore",
    name: "Woodluxe Semi-Transparent (0692)",
    opacity: "semi",
    coat1: [300, 400],
    coats: 1,
    maxCoats: 1,
    coatsNote: "Apply one uniform coat.",
    note: "Water-based; 40°F minimum.",
    prices: { gal: 59.99 },
    basis: "online",
    priceNote: BM_PRICE,
    minTempF: 40,
    source: "bmWoodluxe",
  },
  {
    id: "ready-seal",
    brand: "Ready Seal",
    name: "Exterior Wood Stain & Sealer",
    opacity: "semi",
    coat1: [125, 175],
    // 2026 table: cedar & treated-pine decks 150, rough cedar 125 — figures for the whole first application
    byCondition: { new: 150, weathered: 150, rough: 125 },
    coats: 1,
    maxCoats: 2,
    coatsNote: "The rate covers Ready Seal's full first application, including a wet-on-wet second pass where the wood takes it. New smooth wood may take only one pass.",
    note: "Oil-based; wood should be 12% moisture or less (14–15% in humid areas, which may take only one coat).",
    source: "readySeal",
  },
  {
    id: "defy-extreme",
    brand: "Defy",
    name: "Extreme Semi-Transparent",
    opacity: "semi",
    // Defy: "100–150 sq ft (100 for 2 coats)" → 150 for the first coat, 300 for the wet-on-wet second (1/100 − 1/150).
    coat1: [150, 150],
    coat2: [300, 300],
    coats: 2,
    maxCoats: 2,
    coatsNote: "Two coats, wet-on-wet — one gallon covers about 100 sq ft with both.",
    note: "Water-based deck stain.",
    prices: { gal: 59.99, p5: 269.99 },
    basis: "online",
    priceNote: "deckstain.com price, Oct 23 2026",
    source: "defy",
  },
  {
    id: "valspar-one-coat",
    brand: "Valspar",
    name: "One Coat Semi-Transparent",
    opacity: "semi",
    coat1: [150, 400],
    coats: 1,
    maxCoats: 1,
    coatsNote: "One coat.",
    note: "Lowe's line; apply 50–90°F.",
    minTempF: 50,
    source: "valsparOneCoat",
  },
  {
    id: "behr-solid",
    brand: "Behr",
    name: "Premium Solid Color (No. 5011)",
    opacity: "solid",
    coat1: [200, 400],
    coat2: [400, 800],
    coats: 2,
    maxCoats: 3,
    coatsNote: "Two thin coats: 200–400 sq ft/gal first, 400–800 second.",
    note: "100% acrylic; applies 35–90°F; light foot traffic after 24–48 h.",
    minTempF: 35,
    source: "behrSolid",
  },
  {
    id: "olympic-elite-solid",
    brand: "Olympic",
    name: "Elite Solid Color",
    opacity: "solid",
    coat1: [350, 500],
    coats: 2,
    maxCoats: 3,
    coatsNote: "Two thin coats; drastic color changes may need a third.",
    note: "Applies 35–90°F.",
    minTempF: 35,
    source: "olympicSolid",
  },
  {
    id: "cabot-solid",
    brand: "Cabot",
    name: "Solid Color Acrylic",
    opacity: "solid",
    coat1: [200, 500],
    coats: 2,
    maxCoats: 2,
    coatsNote: "Two coats on weathered wood; new wood may need one.",
    note: "Recoat after 6 hours.",
    source: "cabotSolid",
  },
  {
    id: "defy-solid",
    brand: "Defy",
    name: "Solid Color Wood Stain",
    opacity: "solid",
    coat1: [200, 300],
    coats: 2,
    maxCoats: 2,
    coatsNote: "Most applications require 2 coats.",
    note: "200–300 sq ft per gallon per coat.",
    prices: { gal: 66.96, p5: 329.95 },
    basis: "online",
    priceNote: "deckstain.com price, Oct 23 2026",
    source: "defy",
  },
  {
    id: "woodluxe-solid",
    brand: "Benjamin Moore",
    name: "Woodluxe Solid (0694)",
    opacity: "solid",
    coat1: [300, 400],
    coats: 2,
    maxCoats: 2,
    coatsNote: "1–2 coats; 2 give optimal protection.",
    note: "Water-based; 40°F minimum.",
    prices: { gal: 73.99 },
    basis: "online",
    priceNote: BM_PRICE,
    minTempF: 40,
    source: "bmWoodluxe",
  },
  {
    id: "sw-woodscapes-solid",
    brand: "Sherwin-Williams",
    name: "WoodScapes Solid Color House Stain",
    opacity: "solid",
    coat1: [200, 400],
    coats: 2,
    maxCoats: 2,
    coatsNote: "2 coats.",
    note: "Siding and fence stain (not for walking surfaces); down to 35°F.",
    prices: { gal: 50.99, p5: 251.95 },
    basis: "online",
    priceNote: SW_PRICE,
    minTempF: 35,
    source: "swWoodScapes",
  },
  {
    id: "cabot-deckcorrect",
    brand: "Cabot",
    name: "DeckCorrect resurfacer",
    opacity: "resurfacer",
    // 75 sq ft/gal for the required two coats (retailer specs) → 150 per coat.
    coat1: [150, 150],
    coat2: [150, 150],
    coats: 2,
    maxCoats: 2,
    coatsNote: "Requires two coats; 75 sq ft per gallon for both.",
    note: "Thick coating that fills cracks and splinters on worn boards. Apply 50–90°F, 4–6 h between coats.",
    minTempF: 50,
    source: "cabotDeckCorrect",
  },
];

export function stainsFor(opacity: Opacity): StainProduct[] {
  return STAINS.filter((s) => s.opacity === opacity);
}

export function stain(id: string): StainProduct {
  return STAINS.find((s) => s.id === id) ?? STAINS[0];
}

/** SW deck calculator railing area: length × height × 0.6 without balusters, × 2.0 with them. */
export const RAILING_FACTOR = { plain: 0.6, spindles: 2 } as const;

/** Stair step: two 2×6 treads (5½ in dressed each) and the 7¾ in IRC maximum riser. */
export const STAIR_STEP_IN = { tread: 11, riser: 7.75 } as const;

/** Shadowbox / board-on-board fences expose board edges and overlaps: 1.15–1.3× a flat face (estimate). */
export const FENCE_STYLE = [
  { id: "privacy", label: "Solid privacy", factor: 1 },
  { id: "shadowbox", label: "Shadowbox / board-on-board", factor: 1.2 },
] as const;

/** Olympic's consumer rule of thumb (any transparency): ≤175 sq ft 1 gal, ≤550 2 gal, ≤700 3–4 gal. */
export const OLYMPIC_GUIDE = [
  { maxSqFt: 175, label: "1 gallon" },
  { maxSqFt: 550, label: "2 gallons" },
  { maxSqFt: 700, label: "3–4 gallons" },
] as const;

/* ───────── supplies ───────── */

export interface Supply {
  id: string;
  name: string;
  price: number;
  note?: string;
}

/** Sundries, Walmart.com first-party prices Oct 23 2026 (extension pole: SW regular price; it was 30% off that day). */
export const SUPPLY = {
  tape: { id: "tape", name: "Painter's tape, 1.88 in × 60 yd (ScotchBlue 2090)", price: 7.88 },
  dropCloth: { id: "drop-cloth", name: "Canvas drop cloth, 9 × 12 ft", price: 24.97 },
  covers: { id: "roller-covers", name: "9 in roller covers, 3-pack", price: 6.43 },
  trayKit: { id: "tray-kit", name: "Roller frame & tray kit", price: 21.94 },
  brush: { id: "brush", name: "2½ in angled sash brush", price: 13.94 },
  pole: { id: "pole", name: "Extension pole", price: 35.99 },
  caulk: { id: "caulk", name: "Painter's caulk (SW 1050)", price: 4.69 },
} satisfies Record<string, Supply>;

export const TAPE_FT_PER_ROLL = 180;
export const DROP_CLOTH_SQFT = 108;

/** EPA: about three-quarters of US homes built before 1978 still contain some lead-based paint. */
export const LEAD_YEAR = 1978;

/* ───────── sources ───────── */

const PDS = "https://sherwin-williams.com/document/PDS/en/";
const BM_TDS = "https://media.benjaminmoore.com/WebServices/prod/assets/production/datasheets/";

const SOURCE = {
  swCalc: {
    label: "Sherwin-Williams Paint Calculator (help text and AjaxPaintCalculator responses)",
    url: "https://www.sherwin-williams.com/architects-specifiers-designers/products/resources/paint-calculator",
    note: "results are per coat at 400 (interior), 350 (exterior) and 250 (deck) sq ft/gal; 3×7 ft doors and 3×5 ft windows; trim area = LF × height subtracted from the wall; railings × 0.6, or × 2.0 with spindles; gables = width × peak ÷ 2",
    checked: PAINT_CHECKED,
  },
  bmCalc: {
    label: "Benjamin Moore Paint Calculator (calculator code)",
    url: "https://www.benjaminmoore.com/en-us/paint-calculator",
    note: "walls only, 350 sq ft/gal × 2 coats, 21 sq ft doors and 12 sq ft windows, gallons + quarts",
    checked: PAINT_CHECKED,
  },
  swEmerald: {
    label: "Sherwin-Williams Emerald Interior — PDS 101.08MAB",
    url: `${PDS}035777194737`,
    note: "350–400 sq ft/gal at 4 mils wet; drywall: self-prime with 2 coats or primer + 2 coats; drastic color change: prime",
    checked: PAINT_CHECKED,
  },
  swDurationHome: { label: "Sherwin-Williams Duration Home Interior — PDS", url: `${PDS}035777252956`, note: "350–400 sq ft/gal", checked: PAINT_CHECKED },
  swSuperPaint: { label: "Sherwin-Williams SuperPaint Interior — PDS 101.02A", url: `${PDS}035777040461`, note: "350–400 sq ft/gal; primer + 2 coats on new surfaces", checked: PAINT_CHECKED },
  swCashmere: { label: "Sherwin-Williams Cashmere Interior — PDS", url: `${PDS}035777207536`, note: "350–400 sq ft/gal; 1–2 coats over paint", checked: PAINT_CHECKED },
  swProMar: { label: "Sherwin-Williams ProMar 200 Zero VOC — PDS 101.81B", url: `${PDS}790417034421`, note: "350–400 sq ft/gal, 2 coats", checked: PAINT_CHECKED },
  swCeiling: { label: "Sherwin-Williams Premium Ceiling Paint — PDS 101.53D", url: `${PDS}035777983133`, note: "350–400 sq ft/gal", checked: PAINT_CHECKED },
  swUrethane: { label: "Sherwin-Williams Emerald Urethane Trim Enamel — PDS 101.010SAC", url: `${PDS}035777948095`, note: "350–400 sq ft/gal (8.58–9.81 m²/L), 2 coats", checked: PAINT_CHECKED },
  swPww: { label: "Sherwin-Williams Premium Wall & Wood Primer — PDS 108.38", url: `${PDS}035777638743`, note: "400 sq ft/gal at 4 mils wet", checked: PAINT_CHECKED },
  swPrices: {
    label: "Sherwin-Williams online prices (homeowner product pages)",
    url: "https://www.sherwin-williams.com/homeowners/products/emerald-interior-acrylic-latex-paint",
    note: "quart, gallon and 5-gal guest prices, Oct 23 2026; 5-gal pails ≈1% cheaper per gallon",
    checked: PAINT_CHECKED,
  },
  bmRegal: { label: "Benjamin Moore Regal Select — TDS N549", url: `${BM_TDS}TDS_0549/N549_TDS_US.pdf`, note: "400–450 sq ft/gal; $84.99/gal online", checked: PAINT_CHECKED },
  bmBen: { label: "Benjamin Moore ben — TDS N626", url: `${BM_TDS}TDS_0626/N626_TDS_US.pdf`, note: "400–450 sq ft/gal, self-priming", checked: PAINT_CHECKED },
  bmAura: { label: "Benjamin Moore Aura Interior — product specifications", url: "https://www.benjaminmoore.com/en-us/product/aura-interior-paint-eggshell-1-gallon/N524", note: "350–400 sq ft/gal; $108.99/gal", checked: PAINT_CHECKED },
  bmUltraSpec: { label: "Benjamin Moore Ultra Spec 500 — TDS N538", url: `${BM_TDS}TDS_0538/N538_TDS_US.pdf`, note: "350–400 sq ft/gal", checked: PAINT_CHECKED },
  bmAdvance: { label: "Benjamin Moore Advance — TDS N794", url: `${BM_TDS}TDS_0794/N794_TDS_US.pdf`, note: "400–500 sq ft/gal; recoat 16 h", checked: PAINT_CHECKED },
  bmMuresco: { label: "Benjamin Moore Muresco Ceiling Paint — specifications", url: "https://www.benjaminmoore.com/en-us/product/muresco-ceiling-paint-flat-1-gallon/0258", note: "400–450 sq ft/gal; $50.99", checked: PAINT_CHECKED },
  bmFreshStart: { label: "Benjamin Moore Fresh Start 046 — TDS", url: `${BM_TDS}TDS_0046/046_TDS_US.pdf`, note: "400–450 sq ft/gal; two primer coats on severe stains", checked: PAINT_CHECKED },
  behrUltra: {
    label: "Behr Ultra Scuff Defense Interior — product label (Home Depot-hosted PDF, rev. 09/20)",
    url: "https://images.homedepot-static.com/catalog/pdfImages/d2/d29b964e-0d9a-4e90-a1ef-a7ceaf8128ef.pdf",
    note: "250–400 sq ft/gal; tinted primer coat for drastic color changes",
    checked: PAINT_CHECKED,
  },
  behrLines: {
    label: "Behr Premium Plus / Marquee interior product pages",
    url: "https://behr.com/products/interior-paint/premium-plus-interior/premium-plus-interior-flat",
    note: "250–400 sq ft/gal depending on application method and porosity, excluding spray loss; indicative prices from compositepaint.com (mid-2026)",
    checked: PAINT_CHECKED,
  },
  behr436: {
    label: "Behr Premium Plus Multi-Surface Primer & Sealer No. 436 — label",
    url: "https://images.homedepot-static.com/catalog/pdfImages/69/69090dbf-2f1c-42a1-9388-70df5e60425b.pdf",
    note: "250–400 sq ft per gallon; topcoat in 1 hour",
    checked: PAINT_CHECKED,
  },
  valspar: {
    label: "Valspar Signature, Ultra & Reserve interior — product pages",
    url: "https://www.valspar.com/en/products/interior-paints-primers/signature-interior-paint-primer",
    note: "Signature 200–400, Ultra 300–400, Reserve 400 sq ft/gal; fully loaded roller ≈ 9 sq ft",
    checked: PAINT_CHECKED,
  },
  gliddenDiamond: { label: "Glidden Diamond Interior — TDS (PPG53-010)", url: "https://ppcdatasheets.z20.web.core.windows.net/TDS/TDS_00463599_EN_US.pdf", note: "up to 400 sq ft/gal on primed, smooth, nonporous surfaces", checked: PAINT_CHECKED },
  gliddenCeiling: { label: "Glidden Interior Flat Ceiling Paint — TDS (GPL-0000)", url: "https://ppcdatasheets.z20.web.core.windows.net/TDS/TDS_00406300_EN_US.pdf", note: "approximately 200–300 sq ft/gal", checked: PAINT_CHECKED },
  gliddenWalmart: { label: "Glidden Fundamentals & High Endurance Plus — Walmart.com listings", url: "https://www.walmart.com/ip/2140398292", note: "gallon, quart and 5-gal prices, Oct 23 2026", checked: PAINT_CHECKED },
  clarkKensington: {
    label: "Clark+Kensington interior & exterior — Ace Hardware listings",
    url: "https://www.acehardware.com/p/1020531",
    note: "interior 400–450, exterior 350–450 sq ft/gal; satin $42.99/gal, $20.99/qt, $219.99/5 gal (search snapshot Oct 2026)",
    checked: PAINT_CHECKED,
  },
  kilz2: { label: "KILZ 2 All-Purpose Primer — Walmart.com listing", url: "https://www.walmart.com/ip/17422699", note: "300–400 sq ft/gal; $9.97 qt, $23.97 gal, $65 3.5 gal, $94 5 gal", checked: PAINT_CHECKED },
  zinsser: {
    label: "Zinsser Bulls Eye 1-2-3 — TDS (rev. 02/07/2025)",
    url: "https://www.rustoleum.com/-/media/A8B0274056CA4146912BACE8760FADAD.pdf?sc_lang=en",
    note: "400–450 sq ft/gal; practical 450 non-porous / 350 porous (assumes 15% loss)",
    checked: PAINT_CHECKED,
  },
  swEmeraldExt: { label: "Sherwin-Williams Emerald Exterior — PDS 102.26FLA", url: `${PDS}035777107867`, note: "250–300 sq ft/gal; 2 coats new, 1 coat repaint; down to 35°F", checked: PAINT_CHECKED },
  swDurationExt: { label: "Sherwin-Williams Duration Exterior — PDS 102.14B", url: `${PDS}035777132685`, note: "250–300 sq ft/gal; 2 coats bare, 1 coat repaint", checked: PAINT_CHECKED },
  swSuperPaintExt: { label: "Sherwin-Williams SuperPaint Exterior — PDS 102.01B", url: `${PDS}035777961773`, note: "350–400 sq ft/gal, 2 coats", checked: PAINT_CHECKED },
  swA100: { label: "Sherwin-Williams A-100 Exterior — PDS 102.02A", url: `${PDS}035777956854`, note: "350–400 sq ft/gal", checked: PAINT_CHECKED },
  swLatitude: { label: "Sherwin-Williams Latitude Exterior — PDS 102.61B", url: `${PDS}790417054009`, note: "350–400 sq ft/gal; 35–120°F", checked: PAINT_CHECKED },
  swExtWoodPrimer: { label: "Sherwin-Williams Exterior Latex Wood Primer — PDS 108.33A", url: `${PDS}035777926697`, note: "400 sq ft/gal", checked: PAINT_CHECKED },
  swLoxon: { label: "Sherwin-Williams Loxon Concrete & Masonry Primer — PDS 115.02", url: `${PDS}035777875322`, note: "200–320 sq ft/gal; 80 sq ft/gal on porous rough stucco", checked: PAINT_CHECKED },
  bmAuraExt: { label: "Benjamin Moore Aura Exterior — TDS N629", url: `${BM_TDS}TDS_0629/N629_TDS_US.pdf`, note: "250–350 sq ft/gal; masonry high-build 160–265", checked: PAINT_CHECKED },
  bmRegalExt: { label: "Benjamin Moore Regal Select Exterior — TDS N400", url: `${BM_TDS}TDS_0400/N400_TDS_US.pdf`, note: "250–350 sq ft/gal", checked: PAINT_CHECKED },
  bmElementGuard: { label: "Benjamin Moore Element Guard — TDS 763", url: `${BM_TDS}TDS_0763/763_TDS_US.pdf`, note: "300–400 sq ft/gal; $66.99", checked: PAINT_CHECKED },
  bmUltraSpecExt: { label: "Benjamin Moore Ultra Spec EXT — TDS N447", url: `${BM_TDS}TDS_0447/N447_TDS_US.pdf`, note: "350–450 sq ft/gal; 40°F minimum", checked: PAINT_CHECKED },
  behrUltraExt: { label: "Behr Ultra Exterior — product page", url: "https://www.behr.com/products/exterior-paint/behr-ultra-exterior/behr-ultra-satin-enamel", note: "250–400 sq ft/gal", checked: PAINT_CHECKED },
  valsparDuramax: { label: "Valspar Duramax Exterior — product page", url: "https://www.valspar.com/en/products/exterior-paints-primers/duramax-exterior-paint-primer", note: "300–400 sq ft/gal; 2 coats; 35–90°F", checked: PAINT_CHECKED },
  swSuperDeck: { label: "Sherwin-Williams SuperDeck semi-transparent — PDS 114.80 (06/2020)", url: `${PDS}035777267332`, note: "smooth 350, rough/porous 100–200 sq ft/gal", checked: PAINT_CHECKED },
  swWoodScapes: { label: "Sherwin-Williams WoodScapes Solid Color — PDS 105.11", url: `${PDS}035777552278`, note: "200–400 sq ft/gal, 2 coats", checked: PAINT_CHECKED },
  bmWoodluxe: { label: "Benjamin Moore Woodluxe 0691–0694 — TDS", url: `${BM_TDS}TDS_0692/692_TDS_US.pdf`, note: "300–400 sq ft/gal; translucent/semi one coat, solid 1–2", checked: PAINT_CHECKED },
  behrSemi: {
    label: "Behr Premium Semi-Transparent Waterproofing Stain & Sealer No. 5077 — TDS (rev. 7/2024)",
    url: "https://images.thdstatic.com/catalog/pdfImages/ee/eeb0674b-cb25-49cb-8141-e91933350628.pdf",
    note: "first coat 300 sq ft/gal, thinner second coat 500; two coats required",
    checked: PAINT_CHECKED,
  },
  behrSolid: {
    label: "Behr Premium Solid Color Waterproofing Stain & Sealer No. 5011 — TDS (rev. 1/2023) and label",
    url: "https://images.thdstatic.com/catalog/pdfImages/81/811e3995-55b6-4835-8449-ecedfb93a2c8.pdf",
    note: "200–400 sq ft/gal (label: 2nd coat 400–800); excludes spray loss; 35–90°F",
    checked: PAINT_CHECKED,
  },
  olympicElite: { label: "Olympic Elite Semi-Transparent — TDS 802102", url: "https://ppcdatasheets.z20.web.core.windows.net/TDS/TDS_00434344_EN_US.pdf", note: "250–350 sq ft/gal; two coats recommended; 35–90°F", checked: PAINT_CHECKED },
  olympicSolid: { label: "Olympic Elite Solid Color — TDS 80301", url: "https://ppcdatasheets.z20.web.core.windows.net/TDS/TDS_00411060_EN_US.pdf", note: "350–500 sq ft/gal; two thin coats", checked: PAINT_CHECKED },
  olympicGuide: { label: "Olympic — How much stain for a deck or patio", url: "https://olympic.com/stain-calculator/how-much-stain-for-deck-or-patio", note: "≤175 sq ft 1 gal; ≤550 2 gal; ≤700 3–4 gal", checked: PAINT_CHECKED },
  cabotSemi: { label: "Cabot Semi-Transparent Stain & Sealer — product page", url: "https://www.cabotstain.com/en/products/exterior-stains/semi-transparent-stain-sealer", note: "200–650 sq ft/gal; 1 coat only", checked: PAINT_CHECKED },
  cabotSolid: { label: "Cabot Solid Color Acrylic — product page", url: "https://www.cabotstain.com/en/products/exterior-stains/solid-color-acrylic-stain-sealer", note: "200–500 sq ft/gal; 2 coats", checked: PAINT_CHECKED },
  cabotAto: { label: "Cabot Australian Timber Oil — product page", url: "https://www.cabotstain.com/en/products/exterior-stains/australian-timber-oil", note: "250–600 sq ft/gal; one coat", checked: PAINT_CHECKED },
  cabotDeckCorrect: { label: "Cabot DeckCorrect — product page and retailer specs", url: "https://www.cabotstain.com/en/products/exterior-stains/deckcorrect", note: "75 sq ft/gal for the required two coats; 50–90°F", checked: PAINT_CHECKED },
  thompsonsSemi: { label: "Thompson's WaterSeal tinted wood sealers — product pages", url: "https://www.thompsonswaterseal.com/en/products/exterior-wood-sealers/semi-transparent-wood-sealer", note: "150–400 sq ft/gal; 1 coat; semi-transparent $28.98 at Walmart", checked: PAINT_CHECKED },
  thompsonsClear: { label: "Thompson's WaterSeal Clear Wood Sealer — product page", url: "https://www.thompsonswaterseal.com/en/products/exterior-wood-sealers/clear-wood-sealer", note: "200–400 sq ft/gal; one light coat; $19.94 gal / $92.87 5 gal at Walmart", checked: PAINT_CHECKED },
  readySeal: {
    label: "Ready Seal — TDS (rev. 05/12/2026) and 2026 application instructions",
    url: "https://cdn.shopify.com/s/files/1/0729/8698/4602/files/READY-SEAL-Initial-Application-Instructions-2026.pdf",
    note: "practical 125–175 sq ft/gal; cedar/treated pine deck 150, rough cedar 125; ≤12% wood moisture",
    checked: PAINT_CHECKED,
  },
  defy: { label: "Defy Extreme & Defy Solid — product pages", url: "https://www.deckstain.com/defy-extreme-1-gallon.html", note: "Extreme 100–150 sq ft/gal (100 for 2 coats); Solid 200–300 per coat; $59.99 / $66.96 gal", checked: PAINT_CHECKED },
  valsparOneCoat: { label: "Valspar One Coat Semi-Transparent Stain — product page", url: "https://www.valspar.com/en/products/exterior-wood-stains/one-coat-semi-transparent-stain-sealer", note: "150–400 sq ft/gal; 1 coat; 50–90°F", checked: PAINT_CHECKED },
  sundries: {
    label: "Painting supplies — Walmart.com listings",
    url: "https://www.walmart.com/ip/14698522",
    note: "ScotchBlue 60 yd $7.88; 9×12 canvas drop cloth $24.97; 3-pack roller covers $6.43; tray kit $21.94; 2½ in sash brush $13.94",
    checked: PAINT_CHECKED,
  },
  ircStairs: {
    label: "International Residential Code — R311.7.5 stair treads & risers (Boise IRC handout)",
    url: "https://www.cityofboise.org/media/14405/437-treads-risers_march-2022.pdf",
    note: "7¾ in maximum riser, 10 in minimum tread",
    checked: PAINT_CHECKED,
  },
  epaLead: {
    label: "US EPA — Lead Renovation, Repair and Painting Program",
    url: "https://www.epa.gov/lead/lead-renovation-repair-and-painting-program",
    note: "about three-quarters of US homes built before 1978 still contain some lead-based paint",
    checked: PAINT_CHECKED,
  },
} satisfies Record<string, SourceRef>;

export type PaintSourceKey = keyof typeof SOURCE;

/** Every source the paint family relies on. */
export const PAINT_SOURCES: SourceRef[] = Object.values(SOURCE);

/** The subset of sources a calculator actually uses (de-duplicated, in the order given). */
export function paintSources(...keys: PaintSourceKey[]): SourceRef[] {
  return [...new Set(keys)].map((k) => SOURCE[k]);
}

/* ───────── lookups & typical prices ───────── */

function byId<T extends { id: string }>(list: T[], id: string): T {
  return list.find((p) => p.id === id) ?? list[0];
}

export const wallPaint = (id: string) => byId(WALL_PAINTS, id);
export const exteriorPaint = (id: string) => byId(EXTERIOR_PAINTS, id);
export const interiorPrimer = (id: string) => byId(INTERIOR_PRIMERS, id);
export const exteriorPrimer = (id: string) => byId(EXTERIOR_PRIMERS, id);

/** Planning rate: the low end of the maker's range, or UP_TO_PLAN for "up to" ratings. */
export function planRate(p: Pick<PaintProduct, "rated" | "plan">): number {
  return p.plan ?? p.rated[0] ?? UP_TO_PLAN;
}

export function ratedText(p: Pick<PaintProduct, "rated">): string {
  const [lo, hi] = p.rated;
  if (lo == null) return `up to ${hi}`;
  return lo === hi ? `${hi}` : `${lo}–${hi}`;
}

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round(((s[m - 1] + s[m]) / 2) * 100) / 100;
}

function onlineGallons(list: { prices?: PackPrices; basis?: PriceBasis }[]): number[] {
  return list.filter((p) => p.basis === "online" && p.prices?.gal != null).map((p) => p.prices!.gal!);
}

/** Median online gallon price per category — shown (and labelled) when a product has no verified price. */
export const TYPICAL_GALLON = {
  interior: median(onlineGallons([...WALL_PAINTS, ...CEILING_PAINTS, ...TRIM_PAINTS])),
  primer: median(onlineGallons(INTERIOR_PRIMERS)), // the only priced exterior primer is the same KILZ 2
  exterior: median(onlineGallons(EXTERIOR_PAINTS)),
  stain: median(onlineGallons(STAINS)),
} as const;

export type PriceCategory = keyof typeof TYPICAL_GALLON;
