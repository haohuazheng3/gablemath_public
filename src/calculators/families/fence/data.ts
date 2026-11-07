// Fence data, checked against manufacturer install sheets (Home Depot, Catalyst/Veranda, Merchants
// Metals, Master Halco), Quikrete data sheets, CPSC pool-barrier guidance, 2025–2026 cost guides and
// BLS producer price indexes. Full evidence trail (URLs, quotes, dates): research/fence.verified.json.
// Retail prices are dated snapshots — every one is editable in the UI.

import type { SourceRef } from "@/calculators/types";

export const FENCE_CHECKED = "2026-10-23";

/* ───────── fence styles ───────── */

export type FenceStyle = "privacy" | "bob" | "picket" | "panel" | "vinyl";

export interface StyleSpec {
  label: string;
  short: string;
  heightFt: number;
  picketWidthIn: number;
  gapIn: number;
  blurb: string;
}

export const STYLES: Record<FenceStyle, StyleSpec> = {
  privacy: {
    label: "Wood privacy",
    short: "Privacy",
    heightFt: 6,
    picketWidthIn: 5.5,
    gapIn: 0,
    blurb: "1×6 pickets butted side by side on 2×4 rails — the classic 6-ft stockade-style fence.",
  },
  bob: {
    label: "Board-on-board",
    short: "Board-on-board",
    heightFt: 6,
    picketWidthIn: 5.5,
    gapIn: 0,
    blurb: "Two staggered layers that overlap, so the fence stays opaque even after the boards shrink.",
  },
  picket: {
    label: "Spaced picket",
    short: "Picket",
    heightFt: 4,
    picketWidthIn: 3.5,
    gapIn: 2.5, // Fixr picket-fence guide: pickets usually sit about 2-1/2 in apart
    blurb: "Front-yard picket fence: narrow boards with even gaps, usually 3–4 ft tall.",
  },
  panel: {
    label: "Prebuilt wood panels",
    short: "Wood panels",
    heightFt: 6,
    picketWidthIn: 5.5,
    gapIn: 0,
    blurb: "6×8 ft pressure-treated panels hung between 4×4 posts. Posts are sold separately.",
  },
  vinyl: {
    label: "Vinyl privacy panels",
    short: "Vinyl",
    heightFt: 6,
    picketWidthIn: 5.5,
    gapIn: 0,
    blurb: "White vinyl panels slid into routed 5×5 posts; gate posts need an aluminum stiffener.",
  },
};

/* ───────── wood & vinyl fence geometry ───────── */

export type PostSize = "4x4" | "6x6" | "vinyl";

/** Actual post sizes and hole diameters. */
export const POST_SPECS: Record<PostSize, { label: string; sideIn: number; holeIn: number }> = {
  // Real Cedar: nominal 4 in dresses to 3-9/16 in; retail PT 4×4 lists 3.5 in. Home Depot fence sheet: 10 in hole.
  "4x4": { label: "4×4", sideIn: 3.5, holeIn: 10 },
  // Real Cedar: nominal 6 in dresses to 5-1/2 in. 12 in hole for 6×6 / gate posts (research default).
  "6x6": { label: "6×6", sideIn: 5.5, holeIn: 12 },
  // Catalyst vinyl kit: 5×5 posts, "10 in for 5 in × 5 in post".
  vinyl: { label: "5×5 vinyl", sideIn: 5, holeIn: 10 },
};

export const HOLE = {
  /** Quikrete Fast-Setting TDS: stop concrete 3–4 in below grade and top off with soil. */
  capIn: 3,
  /** Home Depot fence sheet: "Backfill each hole with 4 in of gravel". */
  woodGravelIn: 4,
  /** Catalyst vinyl kit: "Coarse Gravel (6 in per hole)". */
  vinylGravelIn: 6,
  /** Embedment floor used when half the above-ground height is less (research default). */
  minEmbedIn: 24,
  /** Quikrete: structural posts go at least 6 in below the frost line — applied to gate posts. */
  gateFrostExtraIn: 6,
  /** Quikrete Fast-Setting: in holes deeper than 30 in, dry-pour in lifts of 30 in or less. */
  maxDryLiftIn: 30,
} as const;

/** Home Depot fence sheet: posts no more than 8 ft on center; rails no more than 24 in apart. */
export const WOOD_MAX_SPACING_FT = 8;
export const RAIL_MAX_GAP_IN = 24;

/** Home Depot sheet & Catalyst vinyl kit: pickets / bottom rail at least 2 in off the ground. */
export const GROUND_CLEARANCE_IN = 2;

/** Home Depot sheet: 2 in HDG nails/screws, 6 per picket on 3 rails; 3 in, 9 per 3-rail section. */
export const FASTENERS = { perPicketPerRail: 2, perRailBoard: 3 } as const;

/** Stocked post lengths (ft). Longer posts are special order. */
export const POST_STOCK_FT = [8, 10, 12] as const;

/** Master Halco: real-world picket widths are 3-1/2, 5-1/2 and 7-1/2 in (nominal 1×4, 1×6, 1×8). */
export const PICKET_WIDTHS_IN = [3.5, 5.5, 7.5] as const;

/** Board-on-board: 1–1-1/2 in overlap per edge keeps the fence opaque after the boards shrink. */
export const BOB_OVERLAP_IN = 1.5;

/** Home Depot's sheet counts 18 stockade pickets per 8 ft section (= ceil(96 / 5.5)). */
export const HD_STOCKADE_PER_8FT = 18;

/** Home Depot full pallet: 560 pickets cover ~257–280 lf of 6 ft privacy fence. */
export const PICKET_PALLET = 560;

/** Catalyst Newbury Premium LX SKU pages: "POST CENTERS 5 X 5 = 97 in" for 8 ft panels; other lines print none. */
export const VINYL_CENTERS_8FT_IN = 97;
/** 6 ft vinyl panels: nominal 72 in — set exact centers from the panel instructions (panel width + post width). */
export const VINYL_CENTERS_6FT_IN = 72;

/* ───────── concrete & gravel for post holes ───────── */

export type MixId = "fs50" | "cm80";

export interface PostMix {
  id: MixId;
  /** Shared with the concrete calculators so an edited bag price follows the visitor. */
  priceId: string;
  name: string;
  short: string;
  lb: number;
  yieldCuft: number;
  price: number;
  /** US gallons per bag: [start, max]. */
  waterGal: [number, number];
  dryPour: boolean;
  loadAfter: string;
}

export const POST_MIXES: Record<MixId, PostMix> = {
  fs50: {
    id: "fs50",
    priceId: "concrete-fast-50",
    name: "Quikrete Fast-Setting Concrete Mix (No. 1004)",
    short: "Fast-Setting",
    lb: 50,
    yieldCuft: 0.375, // TDS rev. Nov 2025
    price: 7.97, // Home Depot via Glassit tracker, Aug 2026
    waterGal: [1, 1], // TDS: about 1 gal per 50 lb bag, poured over the dry mix
    dryPour: true,
    loadAfter: "4 hours",
  },
  cm80: {
    id: "cm80",
    priceId: "concrete-standard-80",
    name: "Quikrete Concrete Mix (No. 1101)",
    short: "Concrete Mix",
    lb: 80,
    yieldCuft: 0.6, // TDS rev. Oct 2022
    price: 6.47, // Home Depot via Glassit tracker, Sept 2026
    waterGal: [0.75, 1.125], // TDS: 6 pt to start, 9 pt max per 80 lb bag
    dryPour: false,
    loadAfter: "24 hours",
  },
};

/** Sakrete All-Purpose Gravel: "Yields 3 ft² at 2 in deep" = 0.5 cu ft. Price: Mulch Pros 0.5 cu ft bag, Oct 22 2026. */
export const GRAVEL_BAG = { cuft: 0.5, lb: 50, price: 6.95 } as const;

/* ───────── gates ───────── */

/** Merchants Metals / Master Halco gate fittings, applied to every material. */
export const GATE_HARDWARE = {
  walk: { hinges: 2, latches: 1, dropRods: 0 },
  drive: { hinges: 4, latches: 1, dropRods: 1 },
} as const;

/** Master Halco standard openings: single swing 36/39/42/48 in; double swing 10 and 12 ft. */
export const WALK_GATE_WIDTHS_IN = [36, 42, 48, 60] as const;
export const DRIVE_GATE_WIDTHS_FT = [10, 12] as const;
/** Wide single leaves sag; above about 5 ft a double gate is the safer build. */
export const SINGLE_LEAF_SAG_IN = 60;

/* ───────── retail prices (USD, typical big-box, snapshots dated in FENCE_SOURCES) ───────── */

export interface Priced {
  price: number;
  /** Set when the number is our estimate, not an observed shelf price. */
  estimate?: string;
}

/** Ground-contact #2 PT southern pine (Home Depot/Lowe's 2026 snapshots). */
export const PT_POST_PRICES: Record<"4x4" | "6x6", Partial<Record<number, number>>> = {
  "4x4": { 8: 11.18, 10: 19.68 },
  "6x6": { 8: 37.68 },
};

export type WoodSpecies = "pt" | "cedar";

/** 5/8 × 5-1/2 in × 6 ft dog-ear pickets (typical of HD/Lowe's 2026 snapshots). */
export const PICKET_6FT_PRICE: Record<WoodSpecies, number> = { pt: 2.28, cedar: 3.96 };
export const SPECIES_LABEL: Record<WoodSpecies, string> = { pt: "Pressure-treated pine", cedar: "Cedar" };

/** ESTIMATE — no verified 2026 shelf price for a 2×4×8 ground-contact PT rail; price guides list ~$5–$9. */
export const RAIL_2X4X8: Priced = { price: 6.98, estimate: "Estimate — we could not verify a current shelf price" };

/** 6 ft × 8 ft dog-ear PT pine privacy panel, posts not included (HD/Lowe's 2026, typical). */
export const WOOD_PANEL_6X8 = 76.98;
/** 6 ft × 8 ft white vinyl privacy panel (Veranda/Catalyst at HD/Lowe's 2026, typical; range $99.94–$189.47). */
export const VINYL_PANEL_6X8 = 119.47;
/** Veranda 5×5 vinyl posts (HD 2026): line 5×5×8 $35.40, end/gate $44.73, corner 5×5×9 $62.99. */
export const VINYL_POST_PRICE = { line: 35.4, end: 44.73, gate: 44.73, corner: 62.99 } as const;

/* ───────── chain link ───────── */

export const CHAIN_LINK = {
  /** Merchants Metals: "FABRIC – 50 PER ROLL. Divide total footage by 50 and round up." */
  rollFt: 50,
  /** 10 ft 6 in swedged top rail, ~10 ft effective after the lap (Merchants: footage ÷ 10, round up). */
  topRailPieceFt: 10,
  /** Lowe's / Merchants / Master Halco: line posts no more than 10 ft on center, each run divided evenly. */
  maxLineSpacingFt: 10,
  lineOdIn: 1.625,
  terminalOdIn: 2.375,
  /** Master Halco: terminal holes ~8 in × 30 in deep; line holes 6 in wide × 18–24 in deep. */
  terminalHoleIn: 8,
  lineHoleIn: 6,
  terminalHoleDepthIn: 30,
  lineHoleDepthIn: 24,
  gravelIn: 4,
  capIn: 3,
  /** Merchants: terminal post top = fabric height + 2 in; line post top = fabric height − 2 in. */
  terminalAboveIn: 2,
  lineBelowIn: 2,
  /** Merchants / Master Halco: 1 tie per 12 in of line post and per 24 in of top rail. */
  lineTieEveryIn: 12,
  railTieEveryFt: 2,
  /** Lowe's / Master Halco: tension-wire hog rings about every 24 in. */
  hogRingEveryFt: 2,
  /** Master Halco: 3 bands per tension bar for 3 ft, 42 in and 4 ft; 4 for 5 ft; 5 for 6 ft. */
  minBandsPerBar: 3,
  /** Master Halco: add a corner-post assembly where grade changes more than 15 in per 100 ft. */
  slopeInPer100Ft: 15,
  /** Master Halco: set posts about 4 in inside the property line. */
  propertyInsetIn: 4,
} as const;

export const CHAIN_LINK_HEIGHTS = [3, 3.5, 4, 5, 6] as const;

/** Chain-link framework shelf prices observed Oct 23 2026 at independent hardware stores (big-box often lower). */
export const CL_PRICES = {
  /** ESTIMATE: 4 ft × 50 ft 11.5 ga roll. Our checks found $114–$220; $182 is the 2021 $114 snapshot escalated by the fabricated-wire PPI. */
  fabricRoll: { price: 182, estimate: "Estimate for a 4-ft roll — taller rolls cost more" } as Priced,
  topRail: 16.99, // YardGard 1-3/8 in × 10 ft 6 in, 17 ga (Cheshire Horse)
  /** 1-5/8 in line posts, 16 ga, by length in inches (YardGard 66 in $17.99; 96 in $25.99). */
  linePost: { 66: 17.99, 96: 25.99 } as Record<number, number>,
  /** 2-3/8 in terminal posts, 16 ga (YardGard 72 in $17.99; 8 ft $25.99 at Valley Wide Co-op). */
  terminalPost: { 72: 17.99, 96: 25.99 } as Record<number, number>,
};

/* ───────── installed cost (fence-cost-calculator) ───────── */

export type CostMaterialId =
  | "wood-privacy"
  | "wood-picket"
  | "split-rail"
  | "vinyl"
  | "chain-link"
  | "aluminum"
  | "wrought-iron"
  | "composite";

export type PpiKey = "softwood" | "treated" | "wire" | "aluminum" | "plastic" | "steel";

export interface InstalledCost {
  id: CostMaterialId;
  name: string;
  /** Installed $/linear ft, national range. */
  perLf: [number, number];
  source: string;
  /** Installed gate prices where a source exists. */
  walkGate?: [number, number];
  driveGate?: [number, number];
  gateSource?: string;
  defaultHeight: number;
  stainable: boolean;
  ppi: PpiKey;
  note: string;
}

export const INSTALLED: InstalledCost[] = [
  {
    id: "wood-privacy",
    name: "Wood privacy",
    perLf: [15, 45], // Modernize Aug 2026 (two tables: $15–35 and $25–45)
    source: "Modernize, Aug 2026",
    walkGate: [150, 250],
    gateSource: "Bob Vila, Apr 2024",
    defaultHeight: 6,
    stainable: true,
    ppi: "softwood",
    note: "Fixr (Jan 2025) splits it by species: pressure-treated pine $10–25/ft, cedar $15–30/ft. Homewyse's May 2026 contractor-grade average is $33.48–$53.87/ft.",
  },
  {
    id: "wood-picket",
    name: "Wood picket",
    perLf: [10, 40], // Fixr picket fence, Jan 2025
    source: "Fixr, Jan 2025",
    walkGate: [150, 250],
    gateSource: "Bob Vila, Apr 2024",
    defaultHeight: 4,
    stainable: true,
    ppi: "softwood",
    note: "Fixr's own wood-fence table quotes picket styles at $10–18/ft, so simple 3–4 ft picket fences sit at the low end.",
  },
  {
    id: "split-rail",
    name: "Split rail / ranch",
    perLf: [8, 16], // Fixr wood fence, Jan 2025
    source: "Fixr, Jan 2025",
    defaultHeight: 4,
    stainable: false,
    ppi: "softwood",
    note: "Posts sit about 10 ft 4 in on center for 10-ft rails (Master Halco), so there are few holes to dig.",
  },
  {
    id: "vinyl",
    name: "Vinyl privacy",
    perLf: [25, 60], // Modernize Aug 2026
    source: "Modernize, Aug 2026",
    walkGate: [200, 2200],
    gateSource: "Fixr, Jan 2025; covers all vinyl gate types",
    defaultHeight: 6,
    stainable: false,
    ppi: "plastic",
    note: "Homewyse's May 2026 contractor-grade figure for 6-ft vinyl privacy is higher: $58.70–$82.35/ft.",
  },
  {
    id: "chain-link",
    name: "Chain link",
    perLf: [10, 25], // Modernize Aug 2026
    source: "Modernize, Aug 2026",
    walkGate: [90, 250],
    driveGate: [180, 500],
    gateSource: "Fixr, Jan 2025",
    defaultHeight: 4,
    stainable: false,
    ppi: "wire",
    note: "Homewyse's May 2026 range for 6-ft galvanized chain link (12.5-ga fabric, 16-ga posts) is $29.08–$44.84/ft.",
  },
  {
    id: "aluminum",
    name: "Aluminum",
    perLf: [25, 50], // Modernize Aug 2026
    source: "Modernize, Aug 2026",
    defaultHeight: 4,
    stainable: false,
    ppi: "aluminum",
    note: "Fixr (Aug 2025) prices 100 ft of 4-ft spear-top aluminum at $3,000–$8,500, about $7,150 on average.",
  },
  {
    id: "wrought-iron",
    name: "Wrought iron",
    perLf: [35, 70], // Modernize Aug 2026
    source: "Modernize, Aug 2026",
    defaultHeight: 4,
    stainable: false,
    ppi: "steel",
    note: "Modernize lists this as \"$35 to $70+\" — custom ornamental work runs higher.",
  },
  {
    id: "composite",
    name: "Composite",
    perLf: [30, 60], // Modernize Aug 2026
    source: "Modernize, Aug 2026",
    defaultHeight: 6,
    stainable: false,
    ppi: "plastic",
    note: "Composite needs no staining or sealing, unlike wood.",
  },
];

export function installed(id: string): InstalledCost {
  return INSTALLED.find((m) => m.id === id) ?? INSTALLED[0];
}

/** Fixr (Jan 2025): removing an old fence runs $2–$5 per linear foot. */
export const REMOVAL_PER_LF: [number, number] = [2, 5];
/** Modernize (Aug 2026): installation labor alone is $5–$15 per linear foot. */
export const LABOR_PER_LF: [number, number] = [5, 15];
/** Homewyse (May 2026): professional fence staining $1.33–$2.71 per sq ft. */
export const PRO_STAIN_PER_SQFT: [number, number] = [1.33, 2.71];
/** Homewyse (May 2026): national average to install a fence, modeled on 1×6 boards, 2×4 rails and 4×4 PT posts in concrete, $/lf. */
export const HOMEWYSE_ALL_PER_LF: [number, number] = [33.48, 53.87];
/** Modernize (Aug 2026) 150-ft project totals. */
export const MODERNIZE_150FT: Partial<Record<CostMaterialId, [number, number]>> = {
  "chain-link": [1500, 3000],
  "wood-privacy": [3750, 6750],
  vinyl: [3750, 9000],
  aluminum: [4500, 7500],
  "wrought-iron": [5250, 10500],
};

/** BLS producer price indexes, Sept 2025 → Sept 2026 (FRED). */
export const PPI_YOY: Record<PpiKey, { pct: number; series: string }> = {
  softwood: { pct: 14.2, series: "softwood lumber" },
  treated: { pct: 4.1, series: "treated wood" },
  wire: { pct: 11.2, series: "fabricated wire products" },
  aluminum: { pct: 26.3, series: "aluminum extrusions" },
  plastic: { pct: 4.6, series: "plastic construction products" },
  steel: { pct: 27.6, series: "steel mill products" },
};

/* ───────── code & safety ───────── */

/** CPSC Pub. 362 pool barriers: 48 in minimum height; openings ≤ 1-3/4 in when horizontal members are < 45 in apart. */
export const POOL = { minHeightIn: 48, narrowGapIn: 1.75, wideGapIn: 4, railSpacingIn: 45, chainLinkMeshIn: 1.25, bottomGapGrassIn: 2 } as const;

/** Minnesota Rule 1303.1600 footing depths — an example of how far frost depth swings within one state. */
export const FROST_EXAMPLE = { zoneIIn: 60, zoneIIIn: 42 } as const;

/* ───────── sources ───────── */

const S = (label: string, url: string, note: string): SourceRef => ({ label, url, note, checked: FENCE_CHECKED });

const SRC = {
  quikreteFs: S(
    "Quikrete Fast-Setting Concrete Mix No. 1004 — data sheet (rev. Nov 2025)",
    "https://www.quikrete.com/PDFs/DATA_SHEET-Fast%20Setting%20Concrete%20Mix%201004-50.pdf",
    "50 lb = 0.375 cu ft; hole 3× post width; fill to 3–4 in below grade; ~1 gal water per bag; lifts ≤ 30 in; 4 h before load",
  ),
  quikreteMix: S(
    "Quikrete Concrete Mix No. 1101 — data sheet (rev. Oct 2022)",
    "https://www.quikrete.com/PDFs/DATA_SHEET-Concrete%20Mix%201101.pdf",
    "80 lb = 0.60 cu ft; 6–9 pt water per bag; 24 h before strain",
  ),
  quikretePosts: S(
    "Quikrete — Setting Posts in Concrete (how-to)",
    "https://www.quikrete.com/athome/SettingPostsInstructions.asp",
    "bury 1/3 of the post (= half the above-ground height) plus 6 in of gravel",
  ),
  hdSheet: S(
    "The Home Depot — Do It Yourself Fence Installation sheet",
    "https://images.homedepot-static.com/catalog/pdfImages/78/78abf81e-ad4b-4dcb-b38b-903194301873.pdf",
    "posts ≤ 8 ft on center, 10 in holes, 4 in gravel, rails ≤ 24 in apart, 6 fasteners per picket, pickets 2 in off the ground",
  ),
  realCedar: S(
    "Western Red Cedar Lumber Association — fence specifications",
    "https://www.realcedar.com/outdoor/fencing/fence-specifications",
    "4×4 dresses to 3-9/16 in, 6×6 to 5-1/2 in",
  ),
  masterHalcoWood: S(
    "Master Halco — Western Red Cedar fence boards",
    "https://www.masterhalco.com/wood/western-red-cedar",
    "actual picket widths 3-1/2, 5-1/2 and 7-1/2 in",
  ),
  catalystVinyl: S(
    "Catalyst Fence — Privacy Vinyl Fence Kit instructions (rev. 1.25)",
    "https://www.catalystfence.com/wp-content/uploads/CAT-BOM-34111483-Privacy-Vinyl-Fence-Kit-1-25-WEB.pdf",
    "post centers = panel + post width; 10 in holes for 5×5; 6 in gravel; 2 in ground clearance",
  ),
  catalystNewbury: S(
    "Catalyst Fence — Newbury vinyl SKU pages (rev. 6/2026)",
    "https://www.catalystfence.com/wp-content/uploads/Newbury_Catalyst-VF-MF-Sku-Pages_CAT26-D-707822_6-26.pdf",
    "6 and 8 ft panels on 5×5 posts; 97 in post centers (Premium LX); 108 in posts for 6×8",
  ),
  catalystGates: S(
    "Catalyst Fence — Vinyl privacy & picket gate instructions",
    "https://www.catalystfence.com/wp-content/uploads/CAT-Vinyl_Privacy_Picket-Gates-Rev-1-25_WEB.pdf",
    "vinyl gate posts need a stiffener insert, sold separately",
  ),
  merchants: S(
    "Merchants Metals — DIY Chain Link Planner (2017)",
    "https://www.deltafenceman.com/wp-content/uploads/2018/08/Merchants-Metals-DIY-Chain-Link-Planner-Installation-Instructions.pdf",
    "50 ft rolls, 10 ft 6 in top rail, post sizes, fittings per terminal, ties per foot",
  ),
  masterHalcoCl: S(
    "Master Halco — Chain Link Installation Guide",
    "https://www.alleghenyfence.com/pdf/Chain_Link_Installation_Guide_Master_Halco.pdf",
    "tension bands by height (3/3/3/4/5), hole sizes, gate openings, hinge bolts, 15 in per 100 ft slope rule",
  ),
  lowesCl: S(
    "Lowe's — Chain Link Fence Installation Tips",
    "https://www.lowes.com/pdf/1303_-_Chain_Link_Fence_Installation_Tips-Installing_Posts_and_Hardware.pdf",
    "call 811; line posts ≤ 10 ft on center; tension-wire clips every 2 ft",
  ),
  cpsc: S(
    "CPSC — Safety Barrier Guidelines for Residential Pools (Pub. 362)",
    "https://www.cpsc.gov/s3fs-public/362%20Safety%20Barrier%20Guidelines%20for%20Pools.pdf",
    "48 in minimum height, 1-3/4 in / 4 in openings, 1-1/4 in chain-link mesh, 2 in bottom gap over grass",
  ),
  retailWood: S(
    "Home Depot & Lowe's listings — PT posts, pickets and 6×8 panels (2026 snapshots)",
    "https://www.homedepot.com/p/4-in-x-4-in-x-8-ft-2-Ground-Contact-Southern-Yellow-Pine-Pressure-Treated-Wood-Timber-194354/205220341",
    "4×4×8 $11.18, 4×4×10 $19.68, 6×6×8 $37.68, pickets $2.28 PT / $3.96 cedar, PT panel $76.98",
  ),
  retailVinyl: S(
    "Home Depot — Veranda vinyl fence panels and posts (2026 snapshots)",
    "https://www.homedepot.com/b/Lumber-Composites-Fencing-Gates-Vinyl-Fencing-Vinyl-Fence-Panels/Veranda/N-5yc1vZc3nwZ1ko",
    "6×8 white privacy panel $119.47 typical; 5×5 posts $35.40–$62.99",
  ),
  concretePrice: S(
    "Home Depot price history — Quikrete 50 lb Fast-Setting (Glassit tracker)",
    "https://glassit.co/price-history/home-depot/quikrete-50-lb-fast-setting-concrete-mix/1693183320",
    "$7.97 per bag (Aug 2026); 80 lb Concrete Mix $6.47 (Sept 2026)",
  ),
  gravel: S(
    "Sakrete All-Purpose Gravel / Mulch Pros price list",
    "https://www.sakrete.com/product/all-purpose-gravel/",
    "0.5 cu ft per bag; $6.95 per 0.5 cu ft bag (Oct 2026)",
  ),
  clRetail: S(
    "Chain-link framework shelf prices (Valley Wide Co-op, Arbor, Cheshire Horse, Hills Flat Lumber)",
    "https://shop.valleywidecoop.com/p/chain-link-terminal-post-659099389444",
    "terminal post 2-3/8 × 8 ft $25.99; line post 96 in $25.99; top rail $16.99; 4×50 ft fabric $219.99 (checked Oct 23 2026)",
  ),
  thompsons: S(
    "Thompson's WaterSeal — Semi-Transparent Wood Sealer",
    "https://www.thompsonswaterseal.com/en/products/exterior-wood-sealers/semi-transparent-wood-sealer",
    "150–400 sq ft/gal; wait 30 days on new pressure-treated wood",
  ),
  readySeal: S("Ready Seal — FAQ", "https://www.readyseal.com/pages/faq", "new pressure-treated wood: 1 month minimum, 2–3 months recommended before staining"),
  minnesota: S("Minnesota Rules 1303.1600 — footing depth for frost protection", "https://www.revisor.mn.gov/rules/1303.1600/", "60 in in Zone I (north), 42 in in Zone II (south)"),
  modernize: S("Modernize — Fence installation cost (updated Aug 12 2026)", "https://modernize.com/fencing/cost", "installed $/ft by material, labor $5–15/ft, 150-ft totals"),
  homewyse: S(
    "Homewyse — Cost to install a fence (May 2026)",
    "https://www.homewyse.com/services/cost_to_install_fence.html",
    "$33.48–$53.87 per lf national; vinyl 6 ft $58.70–$82.35; chain link 6 ft $29.08–$44.84; staining $1.33–$2.71/sq ft",
  ),
  fixr: S("Fixr — Wood, picket, chain-link and vinyl fence cost guides (Jan 2025)", "https://www.fixr.com/costs/wood-fence", "$/ft by style and species, gates, removal $2–5/ft"),
  fixrAluminum: S("Fixr — Aluminum fence cost (Aug 2025)", "https://www.fixr.com/costs/aluminum-fence", "100 ft of 4-ft spear top: $3,000–$8,500, avg $7,150"),
  bobVila: S("Bob Vila — Fence installation cost (Apr 2024)", "https://www.bobvila.com/articles/fence-installation-cost/", "wood walk-through gate $150–$250"),
  ppi: S("BLS Producer Price Indexes via FRED", "https://fred.stlouisfed.org/graph/fredgraph.csv?id=WPU0811", "Sept 2025 → Sept 2026: softwood lumber +14.2%, fabricated wire +11.2%, aluminum +26.3%, plastic +4.6%"),
};

export const FENCE_SOURCES: SourceRef[] = [
  SRC.hdSheet,
  SRC.quikreteFs,
  SRC.quikreteMix,
  SRC.quikretePosts,
  SRC.realCedar,
  SRC.masterHalcoWood,
  SRC.catalystVinyl,
  SRC.catalystNewbury,
  SRC.catalystGates,
  SRC.cpsc,
  SRC.retailWood,
  SRC.retailVinyl,
  SRC.concretePrice,
  SRC.gravel,
  SRC.thompsons,
  SRC.readySeal,
  SRC.minnesota,
  SRC.modernize,
  SRC.fixr,
];

export const CHAIN_LINK_SOURCES: SourceRef[] = [
  SRC.merchants,
  SRC.masterHalcoCl,
  SRC.lowesCl,
  SRC.quikreteFs,
  SRC.quikreteMix,
  SRC.cpsc,
  SRC.clRetail,
  SRC.concretePrice,
  SRC.gravel,
  SRC.ppi,
  SRC.modernize,
  SRC.homewyse,
  SRC.fixr,
];

export const FENCE_COST_SOURCES: SourceRef[] = [SRC.modernize, SRC.homewyse, SRC.fixr, SRC.fixrAluminum, SRC.bobVila, SRC.ppi, SRC.retailWood, SRC.retailVinyl, SRC.clRetail];
