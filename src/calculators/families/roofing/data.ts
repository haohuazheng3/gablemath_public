// Roofing data, checked against manufacturer spec sheets and product pages (GAF, Owens Corning,
// CertainTeed, IKO, Atlas, Fabral, Air Vent), the 2024 IRC (state editions on UpCodes), McCoy's
// shelf prices and 2026 cost guides. Full evidence trail: research/roofing.verified.json.
// Update ROOFING_CHECKED when re-verifying.

import type { SourceRef } from "@/calculators/types";

export const ROOFING_CHECKED = "2026-10-23";

/** A roofing "square" is 100 sq ft of roof surface. */
export const SQFT_PER_SQUARE = 100;

/* ───────── pitch & code thresholds (rise in inches per 12 in of run) ───────── */

export const PITCH = {
  /** IRC 2024 R905.2.2: asphalt shingles only on slopes of 2:12 or more. */
  shingleMin: 2,
  /** IRC 2024 R905.2.2 / Table R905.1.1(2): below 4:12 underlayment goes on in two layers (half-width + 2 in laps). */
  doubleUnderlaymentBelow: 4,
  /** IRC 2024 R905.1.2: on 8:12 and steeper the ice barrier must also reach 36 in up the slope. */
  steep: 8,
  /** OC / Atlas instructions: over 21:12 use 6 nails and 4 dabs of roof cement per shingle (IRC defers to maker). */
  sixNailsAbove: 21,
  /** IRC 2024 R905.10.2 — lapped, non-soldered metal panels without lap sealant. */
  metalLappedMin: 3,
  /** IRC 2024 R905.10.2 — lapped metal panels with lap sealant. */
  metalSealedMin: 0.5,
  /** IRC 2024 R905.10.2 — standing seam. */
  standingSeamMin: 0.25,
} as const;

export type PitchClass = "flat" | "low" | "conventional" | "steep" | "very-steep";

/** What each pitch range means for materials and labor (IRC 2024, CertainTeed, EstimationPro, OC). */
export const PITCH_CLASS_NOTES: Record<PitchClass, { title: string; body: string }> = {
  flat: { title: "Low-slope roof", body: "Below 2/12 asphalt shingles are not allowed (IRC R905.2.2). Use a membrane, roll roofing, sealed metal panels (½/12 and up) or standing seam (¼/12 and up)." },
  low: { title: "Low pitch", body: "Shingles are allowed from 2/12, but under 4/12 the IRC requires two layers of underlayment, and CertainTeed wants self-adhered membrane over the whole deck." },
  conventional: { title: "Conventional, walkable pitch", body: "Standard single-layer underlayment and four nails per shingle. Most roofers price these pitches at their walkable rate." },
  steep: { title: "Steep roof", body: "From 8/12 roofers typically charge $50–100 more per square, and where ice barrier is required it must reach at least 36 in up the slope. Plan on roof jacks or harnesses." },
  "very-steep": { title: "Very steep (mansard-like)", body: "Over 21/12 shingle makers require six nails and four dabs of roof cement per shingle." },
};

/** Pitches offered as one-tap options (x/12). */
export const PITCH_OPTIONS = [4, 5, 6, 7, 8, 9, 10, 12];

/* ───────── shingles ───────── */

export type ShingleType = "architectural" | "3-tab";

export interface Starter {
  name: string;
  lfPerBundle: number;
  price: number;
}

export interface RidgeCap {
  name: string;
  lfPerBundle: number;
  price: number;
}

export interface ShingleProduct {
  id: string;
  name: string;
  short: string;
  type: ShingleType;
  /** Geometric coverage per bundle (sq ft). Metric 39⅜-in laminates cover 98.4 sq ft per 3 bundles, not 100. */
  sqftPerBundle: number;
  /** Bundles per square as printed by the maker. */
  bundlesPerSquare: number;
  /** Shingles per bundle (drives nail count). */
  piecesPerBundle: number;
  /** Typical single-bundle price (USD, Oct 2026). */
  price: number;
  /** Contractor/bulk tier: price per bundle from `minBundles` up (McCoy's: 39+ bundles). */
  bulk?: { minBundles: number; price: number };
  /** True when no brand-specific shelf price was verifiable and a typical price is used instead. */
  typicalPrice?: boolean;
  starter: Starter;
  cap: RidgeCap;
  note: string;
  /** Coverage is derived rather than printed by the maker — confirm on the bundle wrapper. */
  checkWrapper?: boolean;
}

/** Mainstream architectural single-bundle price at McCoy's (TAMKO 41.99 … Duration 46.99), 2026-10-23. */
export const TYPICAL_ARCH_BUNDLE = 44.99;
/** 3-tab bundle (OC Supreme AR / GAF Royal Sovereign at McCoy's), 2026-10-23. */
export const TYPICAL_3TAB_BUNDLE = 42.99;
/** Hip & ridge cap bundle, McCoy's typical (TimberTex 74.99 · Z Ridge 77.99 · Atlas 80.99 · ProEdge 121.44). */
export const TYPICAL_CAP_BUNDLE = 80.99;
/** Starter strip bundle, McCoy's (Pro-Start, CertainTeed, IKO Leading Edge Plus). */
export const TYPICAL_STARTER_BUNDLE = 59.99;

/** Most conservative common starter coverage (TAMKO precut universal starter, ~102 lf). */
const UNIVERSAL_STARTER: Starter = { name: "Universal starter strip", lfPerBundle: 102, price: TYPICAL_STARTER_BUNDLE };
/** GAF Seal-A-Ridge: 4 bundles ≈ 100 lf (data sheet). Brand price not verifiable → typical cap price. */
const SEAL_A_RIDGE: RidgeCap = { name: "GAF Seal-A-Ridge", lfPerBundle: 25, price: TYPICAL_CAP_BUNDLE };
const OC_STARTER: Starter = { name: "Owens Corning Starter Strip Plus", lfPerBundle: 105, price: 61.99 };
const OC_PROEDGE: RidgeCap = { name: "Owens Corning ProEdge", lfPerBundle: 33, price: 121.44 };

export const SHINGLES: ShingleProduct[] = [
  {
    id: "generic",
    name: "Architectural shingles (any brand)",
    short: "Architectural",
    type: "architectural",
    sqftPerBundle: 32.8,
    bundlesPerSquare: 3,
    piecesPerBundle: 64 / 3,
    price: TYPICAL_ARCH_BUNDLE,
    starter: UNIVERSAL_STARTER,
    cap: SEAL_A_RIDGE,
    note: "Uses the smallest mainstream coverage (32.8 sq ft per bundle) so you never come up short. Pick your brand for exact starter and ridge-cap coverage.",
  },
  {
    id: "gaf-hdz",
    name: "GAF Timberline HDZ",
    short: "GAF Timberline HDZ",
    type: "architectural",
    // 64 pcs/sq × 39⅜ in × 5⅝ in exposure = 98.4 sq ft per 3 bundles; retail titles round up to 33.33.
    sqftPerBundle: 32.8,
    bundlesPerSquare: 3,
    piecesPerBundle: 64 / 3,
    // HDZ shelf prices could not be re-confirmed (Home Depot/Lowe's block fetches; the $44.97 snapshot is undated).
    price: TYPICAL_ARCH_BUNDLE,
    typicalPrice: true,
    starter: { name: "GAF Pro-Start", lfPerBundle: 120.33, price: 59.99 },
    cap: SEAL_A_RIDGE,
    note: "64 shingles and 256 nails per square, 5⅝-in exposure, UL 2218 Class 3. GAF's WindProven warranty needs GAF starter, ridge cap and other qualifying GAF accessories.",
  },
  {
    id: "oc-duration",
    name: "Owens Corning TruDefinition Duration",
    short: "OC Duration",
    type: "architectural",
    sqftPerBundle: 32.8,
    bundlesPerSquare: 3,
    piecesPerBundle: 64 / 3,
    price: 46.99,
    bulk: { minBundles: 39, price: 41.85 },
    starter: OC_STARTER,
    cap: OC_PROEDGE,
    note: "98.4 sq ft per 3-bundle square. The 160 mph wind rating needs OC starter at the eaves and the rakes; Class 3 impact.",
  },
  {
    id: "oc-oakridge",
    name: "Owens Corning Oakridge",
    short: "OC Oakridge",
    type: "architectural",
    sqftPerBundle: 32.8,
    bundlesPerSquare: 3,
    piecesPerBundle: 64 / 3,
    price: 44.99,
    bulk: { minBundles: 39, price: 40.14 },
    starter: OC_STARTER,
    cap: OC_PROEDGE,
    note: "98.4 sq ft per 3-bundle square; 110/130 mph wind rating.",
  },
  {
    id: "ct-landmark",
    name: "CertainTeed Landmark",
    short: "CertainTeed Landmark",
    type: "architectural",
    sqftPerBundle: 100 / 3,
    bundlesPerSquare: 3,
    piecesPerBundle: 22, // ~66 per square
    price: 42.99,
    bulk: { minBundles: 39, price: 38.24 },
    starter: { name: "CertainTeed starter", lfPerBundle: 120, price: 59.99 },
    cap: { name: "CertainTeed Shadow Ridge (30-ft version)", lfPerBundle: 30, price: TYPICAL_CAP_BUNDLE },
    note: "3 bundles per square — Landmark PRO too (it is not 4). Shadow Ridge also comes in a metric pack that covers 45 ft; check the wrapper. About 217–229 lb per square.",
  },
  {
    id: "iko-cambridge",
    name: "IKO Cambridge / Dynasty",
    short: "IKO Cambridge / Dynasty",
    type: "architectural",
    sqftPerBundle: 100 / 3,
    bundlesPerSquare: 3,
    piecesPerBundle: 20,
    price: TYPICAL_ARCH_BUNDLE,
    typicalPrice: true,
    starter: { name: "IKO Leading Edge Plus", lfPerBundle: 109, price: 59.99 },
    cap: { name: "IKO Hip & Ridge 12", lfPerBundle: 29.53, price: TYPICAL_CAP_BUNDLE },
    note: "33⅓ sq ft per bundle, 60 shingles per square (40⅞ × 13¾ in, 5⅞-in exposure). Cambridge 110 mph (130 upgrade); Dynasty 130 mph, Class 3.",
  },
  {
    id: "atlas-pinnacle",
    name: "Atlas Pinnacle Pristine",
    short: "Atlas Pinnacle",
    type: "architectural",
    // Data sheet gives 18–20 pcs of 42 × 14 in at 6-in exposure (1.75 sq ft each) → ~3 bundles per square.
    sqftPerBundle: 100 / 3,
    bundlesPerSquare: 3,
    piecesPerBundle: 19,
    price: TYPICAL_ARCH_BUNDLE,
    typicalPrice: true,
    starter: { name: "Atlas Pro-Cut HP42 starter", lfPerBundle: 140, price: TYPICAL_STARTER_BUNDLE },
    cap: { name: "Atlas Pro-Cut hip & ridge", lfPerBundle: 31, price: 80.99 },
    note: "42 × 14 in shingle with a 6-in exposure; nails must be at least 1¼ in long. Up to 160 mph with Atlas's Signature Select system.",
    checkWrapper: true,
  },
  {
    id: "3tab",
    name: "3-tab strip shingles",
    short: "3-tab",
    type: "3-tab",
    sqftPerBundle: 32.3, // IKO Marathon Plus AR: 32.3 sq ft per bundle, 65 per square (≈3.1 bundles/sq)
    bundlesPerSquare: 3,
    piecesPerBundle: 21,
    price: TYPICAL_3TAB_BUNDLE,
    starter: UNIVERSAL_STARTER,
    // A 3-tab bundle cut into thirds = 63 caps ≈ 29.5 lf (same as IKO Hip & Ridge 12: 21 × 3 pieces).
    cap: { name: "3-tab bundles cut into thirds", lfPerBundle: 29.53, price: TYPICAL_3TAB_BUNDLE },
    note: "Based on IKO Marathon Plus AR: 32.3 sq ft per bundle, so a \"3-bundle square\" really covers about 97 sq ft.",
  },
  {
    id: "custom",
    name: "Other line — enter bundles per square",
    short: "Custom line",
    type: "architectural",
    sqftPerBundle: SQFT_PER_SQUARE / 4,
    bundlesPerSquare: 4,
    piecesPerBundle: 66 / 4, // Landmark-size shingle, 66 per square
    price: TYPICAL_ARCH_BUNDLE,
    typicalPrice: true,
    starter: UNIVERSAL_STARTER,
    cap: SEAL_A_RIDGE,
    note: "Heavy designer lines pack fewer square feet per bundle: CertainTeed NorthGate and Belmont are 4 per square, Grand Manor and Carriage House 5, Presidential Shake TL 6.",
  },
];

export function shingle(id: string): ShingleProduct {
  return SHINGLES.find((p) => p.id === id) ?? SHINGLES[0];
}

/* ───────── waste (CertainTeed Shingle Applicator's Manual, 17th ed., Table 4) ───────── */

export const WASTE_TABLE = {
  areaSqFt: [600, 1200, 1500, 2000, 3200],
  gable: [8, 6, 5, 4, 3],
  hip: [17, 13, 11, 9, 8],
  /** Dormers, valleys and cut-up planes: add 3–5 points (judgment); we use the top of that range. */
  complexExtra: 5,
};

/* ───────── underlayment ───────── */

export interface Underlayment {
  id: "synthetic" | "felt15" | "felt30";
  name: string;
  widthIn: number;
  lengthFt: number;
  /** Side lap for a single layer (OC ProArmor 3 in; IRC 2 in for felt). */
  lapIn: number;
  price: number;
}

export const UNDERLAYMENTS: Underlayment[] = [
  // OC ProArmor / RhinoRoof: 42 in × 286 ft, 929 sq ft net with 3-in laps (a "10-square" roll).
  { id: "synthetic", name: "Synthetic underlayment, 10-sq roll (42 in × 286 ft)", widthIn: 42, lengthFt: 286, lapIn: 3, price: 129.99 },
  { id: "felt15", name: "#15 felt, 36 in × 144 ft", widthIn: 36, lengthFt: 144, lapIn: 2, price: 34.99 },
  { id: "felt30", name: "#30 felt, 36 in × 72 ft", widthIn: 36, lengthFt: 72, lapIn: 2, price: 34.99 },
];

export function underlayment(id: string): Underlayment {
  return UNDERLAYMENTS.find((u) => u.id === id) ?? UNDERLAYMENTS[0];
}

/** Plastic cap nails for underlayment: Stinger 1-in, bucket of 3,000 (McCoy's). */
export const CAP_NAILS = { perBucket: 3000, price: 45.49 };

/* ───────── ice & water shield (IRC 2024 R905.1.2) ───────── */

export const ICE_WATER = {
  widthIn: 36,
  sideLapIn: 3,
  endLapIn: 6,
  /** Must reach at least 24 in horizontally inside the exterior wall line. */
  insideWallIn: 24,
  /** On 8:12 and steeper: at least 36 in measured along the slope. */
  steepMinAlongSlopeIn: 36,
  /** 2×6 wall plus sheathing — the usual assumption (Fine Homebuilding worked examples). */
  wallDefaultIn: 6,
};

export interface IceWaterRoll {
  lengthFt: number;
  name: string;
  price: number;
}

export const ICE_WATER_ROLLS: IceWaterRoll[] = [
  { lengthFt: 65, name: "36 in × 65 ft (IKO StormShield, Grace 195, CertainTeed 2SQ)", price: 99.99 },
  { lengthFt: 66.7, name: "36 in × 66.7 ft (GAF StormGuard, OC WeatherLock G, IKO GoldShield)", price: 126.99 },
  { lengthFt: 50, name: "36 in × 50 ft (GAF WeatherWatch)", price: 107.71 },
];

export function iceWaterRoll(lengthFt: number): IceWaterRoll {
  return ICE_WATER_ROLLS.find((r) => r.lengthFt === lengthFt) ?? ICE_WATER_ROLLS[0];
}

/* ───────── drip edge, nails, ventilation ───────── */

/** 10-ft pieces lapped at least 2 in, nailed 12 in o.c. (IRC 2024 R905.2.8.5). Grip-Rite REG12MF $7.29. */
export const DRIP_EDGE = { pieceFt: 10, lapIn: 2, nailSpacingIn: 12, price: 7.29 };

export const NAILS = {
  /** Grip-Rite 15° coil roofing nails, 1¼ in: 7,200 per box (ProFIT box $48.99 at McCoy's). */
  coilPerBox: 7200,
  coilBoxPrice: 48.99,
  /** Grip-Rite 1¼ in 11 ga electro-galv hand nails (114EGRFG5): 978 per 5-lb box, $21.99 at McCoy's ≈ 196 per lb. */
  handPerFiveLb: 978,
  handBoxPrice: 21.99,
  /** Accessory fastening (research formula): 4 per starter piece, 2 per ridge cap. */
  perStarterPiece: 4,
  perCap: 2,
  /** Shortest sourced starter piece (Atlas Pro-Cut, 36 in nominal) and shortest cap exposure (5 in) → upper bound. */
  starterPieceIn: 36,
  capExposureIn: 5,
};

/** IRC 2024 R806.2 and Air Vent / CertainTeed product NFA. */
export const VENTILATION = {
  /** 1 sq ft of net free area per 150 sq ft of attic floor (1/300 allowed when R806.2 conditions are met). */
  ratio: 150,
  ratioReduced: 300,
  ridgeNfaPerLf: 18, // ShingleVent II 12 in
  ridgeSectionFt: 4,
  soffitNfaPerLf: 9, // continuous soffit / The Edge Vent
  undereaveNfaEach: 56, // 16 × 8 in screened
};

/* ───────── tear-off debris & dumpsters ───────── */

export type OldRoof = "3-tab" | "laminate" | "premium";

/**
 * New shingle weight per square, for delivery planning. CertainTeed Landmark TDS: 217–229 lb; IKO (Aug 2023):
 * laminates under 230 lb, 3-tab up to about 190 lb, premium/designer lines 230–450 lb (≈300 typical).
 */
export const SHINGLE_LB_PER_SQUARE = { "3-tab": 190, architectural: 230, designer: 300 };

/** Tear-off weight incl. ~10 lb of old underlayment and nails (IKO, Aug 2023 — approximate). */
export const TEAROFF_LB_PER_SQUARE: Record<OldRoof, number> = { "3-tab": 200, laminate: 240, premium: 300 };

/** Trash Daddy rule of thumb: one square of asphalt, one layer ≈ ½ cubic yard of debris. */
export const DEBRIS_CY_PER_SQUARE = 0.5;

/** Dumpster sizes with typical included weight (Trash Daddy national pricing page). */
export const DUMPSTERS = [
  { yd: 10, tons: 1 },
  { yd: 15, tons: 1.5 },
  { yd: 20, tons: 2 },
  { yd: 30, tons: 3 },
];

export const DUMPSTER_COST = { low: 395, typical: 500, high: 875, overagePerTon: 100 };

/* ───────── installed cost (2026 guides; every Gorilla per-square price includes a one-layer tear-off) ───────── */

export const INSTALLED_PER_SQUARE: Record<ShingleType, { low: number; typical: number; high: number }> = {
  architectural: { low: 400, typical: 550, high: 700 },
  "3-tab": { low: 350, typical: 450, high: 550 },
};

export const INSTALL_EXTRAS = {
  /** Tear-off & disposal, one layer, per square ($100–150). Credited back when there is nothing to tear off. */
  tearoffPerSquare: 125,
  /** Each extra old layer, per square — sources range $25–150 (Gorilla vs EstimationPro). */
  extraLayerPerSquare: 100,
  /** 8:12 and steeper: +$50–100 per square over walkable rates (EstimationPro, Sept 2026). */
  steepPerSquare: 75,
  permit: 325, // $150–500
  deckSheet: 85, // 4×8 sheet replaced, installed ($70–100)
};

/* ───────── metal roofing (exposed-fastener panels) ───────── */

export interface MetalProfile {
  id: "r-panel" | "5v";
  name: string;
  short: string;
  coverageIn: number;
  /** Manufacturer minimum slope (x/12). */
  minRise: number;
  /** McCoy's 29 ga Galvalume stock lengths and prices, 2026-10-23. */
  stock: { ft: number; price: number }[];
  /** Cut-to-length planning price per linear ft of panel. */
  perLf: number;
  closure: { lengthIn: number; price: number };
}

export const METAL_PROFILES: MetalProfile[] = [
  {
    id: "r-panel",
    name: "36-in rib panel (R-panel, Tuff-Rib, Grandrib 3, StrongPanel)",
    short: "36-in rib panel",
    coverageIn: 36,
    minRise: 2.5, // Fabral Grandrib 3 and Best Buy Metals Tuff-Rib
    stock: [
      { ft: 8, price: 30.99 },
      { ft: 10, price: 40.99 },
      { ft: 12, price: 50.99 },
      { ft: 14, price: 55.99 },
      { ft: 16, price: 60.99 },
      { ft: 20, price: 80.99 },
    ],
    perLf: 4.05, // StrongPanel $3.81–4.25 per lf across stock lengths
    closure: { lengthIn: 36, price: 2.79 },
  },
  {
    id: "5v",
    name: "5V crimp (24-in coverage)",
    short: "5V crimp",
    coverageIn: 24,
    minRise: 3, // Best Buy Metals 5V crimp
    stock: [
      { ft: 8, price: 29.99 },
      { ft: 10, price: 36.99 },
      { ft: 12, price: 39.99 },
      { ft: 14, price: 46.99 },
      { ft: 16, price: 53.99 },
    ],
    perLf: 3.37, // median of McCoy's 5V stock prices per lf ($3.33–3.75)
    closure: { lengthIn: 24, price: 2.19 },
  },
];

export function metalProfile(id: string): MetalProfile {
  return METAL_PROFILES.find((p) => p.id === id) ?? METAL_PROFILES[0];
}

export const METAL = {
  /** Fabral Grandrib 3: 80 screws per square, #14 × 1 in Woodtite into OSB/plywood (#10 × 1½ in into purlins). */
  screwsPerSquare: 80,
  /** 29 ga panel weight (Tuff-Rib); 26 ga is 0.85. */
  lbPerSqFt: 0.7,
  /** Champion universal ridge cap 4202341: 10½ ft × 14 in, $36.99 (McCoy's). Lapped 6 in → 10 ft net. */
  ridgeCap: { lengthFt: 10.5, netFt: 10, price: 36.99 },
  /** Eave and rake trim are planned in the same 10½-ft lengths (10 ft net) — check your supplier's stock. */
  trimNetFt: 10,
  /** Longest cut-to-length panels commonly offered: Fabral "custom cut to lengths up to 40'" (product page,
   * checked 2026-10-23); Best Buy Metals cuts to 45 ft. */
  maxPanelFt: 40,
};

export const ROOFING_SOURCES: SourceRef[] = [
  {
    label: "GAF Timberline HDZ product specifications (archived 2026-09-28)",
    url: "http://web.archive.org/web/20260928173810/https://www.gaf.com/en-us/roofing-materials/residential-roofing-materials/shingles/timberline-hdz",
    note: "64 pieces, 3 bundles and 256 nails per square; 5⅝-in exposure; 39⅜ × 13¼ in (→ 98.4 sq ft per square)",
    checked: ROOFING_CHECKED,
  },
  {
    label: "Owens Corning TruDefinition Duration — product data",
    url: "https://www.owenscorning.com/en-us/roofing/shingles/trudefinition-duration",
    note: "3 bundles = 98.4 sq ft; 64 shingles per square; 160 mph with OC starter at eaves and rakes",
    checked: ROOFING_CHECKED,
  },
  {
    label: "CertainTeed Roofing Selection Guide (rev. 2606)",
    url: "https://certainteed.widen.net/content/4wi6bh5vlh/pdf/roofing-selection-guide-00-00-253-US-EN-2606.pdf",
    note: "Landmark & Landmark PRO 3 bundles/sq; NorthGate & Belmont 4; Shadow Ridge 30 lin ft",
    checked: ROOFING_CHECKED,
  },
  {
    label: "CertainTeed Shingle Applicator's Manual, 17th ed. (Sept 2026)",
    url: "https://certainteed.widen.net/content/5alhzr3gxh/pdf/sam-manual-17th-13-03-5418-NA-EN-2609.pdf",
    note: "slope and hip/valley factors, waste by roof size (Table 4), ventilation worked example",
    checked: ROOFING_CHECKED,
  },
  {
    label: "CertainTeed Landmark technical data sheet",
    url: "https://rpm.rcabc.org/images/e/ee/CertainTeed_Landmark_TDS.pdf",
    note: "about 217–229 lb per square",
    checked: ROOFING_CHECKED,
  },
  {
    label: "IKO Cambridge, Leading Edge Plus and Hip & Ridge 12 product pages",
    url: "https://www.iko.com/na/product/cambridge/",
    note: "33⅓ sq ft per bundle, 60 per square; starter 109 lin ft; ridge cap 29.53 lin ft",
    checked: ROOFING_CHECKED,
  },
  {
    label: "Atlas Pinnacle Pristine data sheet",
    url: "https://www.atlasroofing.com/img/product-resources/Pinnacle-Pristine-Data-Sheet.pdf",
    note: "42 × 14 in, 6-in exposure, 18–20 shingles per bundle",
    checked: ROOFING_CHECKED,
  },
  {
    label: "2024 International Residential Code, Chapter 9 (Maryland edition, UpCodes)",
    url: "https://up.codes/viewer/maryland/irc-2024/chapter/9/roof-assemblies",
    note: "R905.1.2 ice barrier 24 in inside the wall (36 in along slope ≥ 8:12); R905.2.2 slope; R905.2.6 four nails; R905.2.8.5 drip edge",
    checked: ROOFING_CHECKED,
  },
  {
    label: "2024 IRC R806.2 attic ventilation (UpCodes)",
    url: "https://up.codes/viewer/maryland/irc-2024/chapter/8/roof-ceiling-construction",
    note: "1/150 net free area (1/300 when both conditions are met)",
    checked: ROOFING_CHECKED,
  },
  {
    label: "Fine Homebuilding — Ice barriers explained",
    url: "https://www.finehomebuilding.com/project-guides/roofing/ice-barriers-explained-far-roof-slope",
    note: "worked examples: 6/12 with 12-in overhang and 2×6 wall → 47 in up the slope",
    checked: ROOFING_CHECKED,
  },
  {
    label: "Owens Corning ProArmor synthetic underlayment",
    url: "https://www.owenscorning.com/en-us/roofing/products/proarmor",
    note: "42 in × 286 ft, 929 sq ft net with 3-in laps",
    checked: ROOFING_CHECKED,
  },
  {
    label: "Owens Corning Oakridge installation instructions (2026)",
    url: "https://dcpd6wotaa0mb.cloudfront.net/mdms/dms/Roofing/10003280/10003280-Oakridge-and-TruDefinition-Oakridge-Install-Instructions.pdf",
    note: "most eaves need 2 courses of self-adhered membrane; over 21 in per ft, 6 nails and roof cement per shingle",
    checked: ROOFING_CHECKED,
  },
  {
    label: "Air Vent (Gibraltar) ventilation catalog",
    url: "https://gibraltarbuildingproducts.com/ventilation-category/",
    note: "ShingleVent II 18 sq in per ft; soffit 9 sq in per ft; 16×8 vent 56 sq in",
    checked: ROOFING_CHECKED,
  },
  {
    label: "Grip-Rite coil roofing nails",
    url: "https://grip-rite.com/product/fasteners/collated/nails-collated/collated-roofing-nails/coil-roofing-nails/",
    note: "7,200 nails per box (1¼ in)",
    checked: ROOFING_CHECKED,
  },
  {
    label: "McCoy's roofing shingles, underlayment and flashing (San Marcos, TX)",
    url: "https://www.mccoys.com/shop/c/103120104105000000/roof-shingles",
    note: "shelf and 39+ bundle prices, starter, ridge cap, underlayment, ice & water, drip edge, coil and 5-lb hand nails — 2026-10-23",
    checked: ROOFING_CHECKED,
  },
  {
    label: "Gorilla Roofing — 2026 roof replacement cost guide",
    url: "https://www.gorillaroofing.com/resources/roof-replacement-costs-guide/",
    note: "$400–700 per square architectural, $350–550 3-tab (one-layer tear-off included); permits $150–500",
    checked: ROOFING_CHECKED,
  },
  {
    label: "EstimationPro — roofing labor cost per square (updated Sept 2026)",
    url: "https://estimationpro.ai/tools/blog/roofing-labor-cost-per-square",
    note: "8/12 and steeper +$50–100 per square; two-layer tear-off $125–175",
    checked: ROOFING_CHECKED,
  },
  {
    label: "IKO — what size dumpster for a roofing job",
    url: "https://www.iko.com/na/blog/dumpster-size-for-roofing/",
    note: "new shingles ≈ 190 lb (3-tab) and under 230 lb (laminate) per square; tear-off ≈ 200 / 240 / 300 lb per square",
    checked: ROOFING_CHECKED,
  },
  {
    label: "Trash Daddy dumpster prices",
    url: "https://trashdaddydumpsters.com/dumpster-prices/",
    note: "$395–875 per rental; 10/15/20/30-yd include about 1/1.5/2/3 tons; overage $65–185 per ton",
    checked: ROOFING_CHECKED,
  },
];

export const METAL_SOURCES: SourceRef[] = [
  {
    label: "Fabral Grandrib 3 product specification",
    url: "https://fabral.com/resource/grandribwest-gr3-gr3-grg-product-details-sheet/",
    note: "36-in coverage, 2½:12 minimum, 80 screws per square; cut to length up to 40 ft",
    checked: ROOFING_CHECKED,
  },
  {
    label: "Best Buy Metals Tuff-Rib and 5V crimp",
    url: "https://www.bestbuymetals.com/through-fastened-panels/tuff-rib/",
    note: "36-in coverage cut to the inch 3–45 ft; 29 ga 0.70 lb/sq ft; 5V 24-in coverage, 3:12 minimum",
    checked: ROOFING_CHECKED,
  },
  {
    label: "McCoy's metal roofing (Metal Sales StrongPanel, 5V, ridge cap, closures)",
    url: "https://www.mccoys.com/shop/c/103120104000000000/roofing",
    note: "8–20 ft panel prices, 10½-ft ridge cap $36.99, closure strips $2.19–2.79 — 2026-10-23",
    checked: ROOFING_CHECKED,
  },
  {
    label: "2024 International Residential Code R905.10 (UpCodes)",
    url: "https://up.codes/viewer/maryland/irc-2024/chapter/9/roof-assemblies",
    note: "lapped metal panels 3:12 minimum (½:12 with lap sealant; standing seam ¼:12)",
    checked: ROOFING_CHECKED,
  },
  {
    label: "Owens Corning ProArmor synthetic underlayment",
    url: "https://www.owenscorning.com/en-us/roofing/products/proarmor",
    note: "929 sq ft net per roll with 3-in laps",
    checked: ROOFING_CHECKED,
  },
];

export const PITCH_SOURCES: SourceRef[] = [
  {
    label: "CertainTeed Shingle Applicator's Manual, 17th ed. (Sept 2026)",
    url: "https://certainteed.widen.net/content/5alhzr3gxh/pdf/sam-manual-17th-13-03-5418-NA-EN-2609.pdf",
    note: "slope factor (6/12 = 1.118) and hip/valley factor tables",
    checked: ROOFING_CHECKED,
  },
  {
    label: "2024 International Residential Code, Chapter 9 (UpCodes)",
    url: "https://up.codes/viewer/maryland/irc-2024/chapter/9/roof-assemblies",
    note: "minimum slopes: shingles 2:12 (double underlayment below 4:12), lapped metal 3:12, standing seam ¼:12",
    checked: ROOFING_CHECKED,
  },
  {
    label: "EstimationPro — roofing labor cost per square",
    url: "https://estimationpro.ai/tools/blog/roofing-labor-cost-per-square",
    note: "8/12 and steeper priced +$50–100 per square over walkable rates",
    checked: ROOFING_CHECKED,
  },
  {
    label: "Owens Corning Oakridge installation instructions (2026)",
    url: "https://dcpd6wotaa0mb.cloudfront.net/mdms/dms/Roofing/10003280/10003280-Oakridge-and-TruDefinition-Oakridge-Install-Instructions.pdf",
    note: "over 21 in per ft: 6 nails and 4 spots of roof cement per shingle",
    checked: ROOFING_CHECKED,
  },
];
