// Pure roofing math shared by the client calculators and the server-rendered answers.

import { ceilQty, ceilTo } from "@/lib/format";
import {
  CAP_NAILS,
  DEBRIS_CY_PER_SQUARE,
  DRIP_EDGE,
  DUMPSTER_COST,
  DUMPSTERS,
  ICE_WATER,
  INSTALL_EXTRAS,
  INSTALLED_PER_SQUARE,
  METAL,
  NAILS,
  PITCH,
  SHINGLE_LB_PER_SQUARE,
  SQFT_PER_SQUARE,
  TEAROFF_LB_PER_SQUARE,
  VENTILATION,
  WASTE_TABLE,
  iceWaterRoll,
  metalProfile,
  shingle,
  underlayment,
  type OldRoof,
  type PitchClass,
  type ShingleProduct,
} from "./data";

/* ───────── pitch ───────── */

/** Slope multiplier: plan (horizontal) area or run × factor = area or length along the roof. */
export function pitchFactor(rise: number): number {
  return Math.sqrt(1 + (Math.max(0, rise) / 12) ** 2);
}

/** Hip/valley factor for equal pitches: multiply the common-rafter run (half the span), not the hip's plan diagonal. */
export function hipFactor(rise: number): number {
  return Math.sqrt(2 + (Math.max(0, rise) / 12) ** 2);
}

export function pitchAngle(rise: number): number {
  return (Math.atan(Math.max(0, rise) / 12) * 180) / Math.PI;
}

/** "a 6/12", "an 8/12", "an 11/12" — for headings and answers. */
export function aPitch(rise: number, capital = false): string {
  const label = `${Math.round(rise * 100) / 100}/12`;
  const article = /^(8|11|18)(\D|$)/.test(label) ? "an" : "a";
  return `${capital ? article[0].toUpperCase() + article.slice(1) : article} ${label}`;
}

export function riseFromAngle(deg: number): number {
  const d = Math.min(Math.max(deg, 0), 89.9);
  return 12 * Math.tan((d * Math.PI) / 180);
}

export function pitchClass(rise: number): PitchClass {
  if (rise < PITCH.shingleMin) return "flat";
  if (rise < PITCH.doubleUnderlaymentBelow) return "low";
  if (rise < PITCH.steep) return "conventional";
  if (rise <= PITCH.sixNailsAbove) return "steep";
  return "very-steep";
}

/* ───────── waste ───────── */

export type RoofStyle = "gable" | "hip" | "complex";

/** CertainTeed SAM Table 4, linearly interpolated by roof area and clamped at the table ends; whole percent. */
export function autoWastePct(roofAreaSqFt: number, style: RoofStyle): number {
  const xs = WASTE_TABLE.areaSqFt;
  const ys = style === "gable" ? WASTE_TABLE.gable : WASTE_TABLE.hip;
  let pct: number;
  if (roofAreaSqFt <= xs[0]) pct = ys[0];
  else if (roofAreaSqFt >= xs[xs.length - 1]) pct = ys[ys.length - 1];
  else {
    const i = xs.findIndex((x) => x >= roofAreaSqFt);
    const t = (roofAreaSqFt - xs[i - 1]) / (xs[i] - xs[i - 1]);
    pct = ys[i - 1] + t * (ys[i] - ys[i - 1]);
  }
  return Math.round(pct) + (style === "complex" ? WASTE_TABLE.complexExtra : 0);
}

/* ───────── geometry ───────── */

export interface RoofEdges {
  /** all in linear feet, measured along the roof (true length) */
  eaves: number;
  rakes: number;
  ridge: number;
  hips: number;
  valleys: number;
}

export interface RoofGeometry {
  /** footprint incl. overhangs, long side first (ft) */
  lengthFt: number;
  widthFt: number;
  planAreaSqFt: number;
  roofAreaSqFt: number;
  atticAreaSqFt: number;
  edges: RoofEdges;
}

/**
 * Roof from a rectangular footprint. Any roof whose planes share one pitch has
 * area = plan area (overhangs included) × pitch factor, gable or hip alike (CertainTeed SAM).
 * "Complex" uses hip-roof edges (eaves all round, four hips) — the larger accessory count —
 * plus whatever valleys the user enters.
 */
export function roofFromFootprint(input: { lengthFt: number; widthFt: number; overhangIn: number; style: RoofStyle; rise: number; valleysFt: number }): RoofGeometry {
  const oh = Math.max(0, input.overhangIn) / 12;
  const a = Math.max(0, input.lengthFt);
  const b = Math.max(0, input.widthFt);
  const L = a > 0 && b > 0 ? Math.max(a, b) + 2 * oh : 0;
  const W = a > 0 && b > 0 ? Math.min(a, b) + 2 * oh : 0;
  const pf = pitchFactor(input.rise);
  const plan = L * W;
  const edges: RoofEdges =
    input.style === "gable"
      ? { eaves: 2 * L, rakes: 2 * W * pf, ridge: L, hips: 0, valleys: 0 }
      : { eaves: 2 * (L + W), rakes: 0, ridge: L - W, hips: 2 * W * hipFactor(input.rise), valleys: 0 };
  if (input.style === "complex") edges.valleys = Math.max(0, input.valleysFt);
  return { lengthFt: L, widthFt: W, planAreaSqFt: plan, roofAreaSqFt: plan * pf, atticAreaSqFt: a * b, edges };
}

/* ───────── component quantities ───────── */

/** IRC R905.1.2: ice barrier from the eave to 24 in (horizontal) inside the exterior wall; 36 in along slope minimum on ≥ 8:12. */
export function iceBarrierCourses(rise: number, overhangIn: number, wallIn: number) {
  let requiredIn = (Math.max(0, overhangIn) + Math.max(0, wallIn) + ICE_WATER.insideWallIn) * pitchFactor(rise);
  if (rise >= PITCH.steep) requiredIn = Math.max(requiredIn, ICE_WATER.steepMinAlongSlopeIn);
  const first = ICE_WATER.widthIn;
  const next = ICE_WATER.widthIn - ICE_WATER.sideLapIn;
  const courses = 1 + Math.max(0, ceilQty((requiredIn - first) / next));
  return { requiredIn, courses };
}

/** Membrane rolls for a total strip length; each roll loses one 6-in end lap. */
export function iceWaterRolls(stripLf: number, rollLengthFt: number): number {
  return ceilQty(stripLf / (rollLengthFt - ICE_WATER.endLapIn / 12));
}

/**
 * Underlayment rolls. One layer laps by the maker's side lap; below 4:12 the IRC method is a half-width
 * starter strip then full sheets lapped half the width + 2 in, which roughly doubles the material.
 */
export function underlaymentRolls(roofAreaSqFt: number, eavesLf: number, double: boolean, id: string) {
  const u = underlayment(id);
  const exposureIn = double ? u.widthIn / 2 - 2 : u.widthIn - u.lapIn;
  const rollFt = roofAreaSqFt / (exposureIn / 12) + (double ? eavesLf / 2 : 0);
  return { rolls: ceilQty(rollFt / u.lengthFt), double, exposureIn, netSqFtPerRoll: (u.lengthFt * exposureIn) / 12 };
}

/**
 * Plastic cap nails per sq ft in the IRC wind-design grid (Table R905.1.1): 6 in o.c. along every lap and
 * a 12-in grid between laps. Most non-coastal areas may fasten more lightly per the maker's instructions.
 */
export function capNailsPerSqFt(exposureIn: number): number {
  const fieldRows = Math.max(0, Math.ceil(exposureIn / 12 - 1e-9) - 1);
  return (2 + fieldRows) / (exposureIn / 12);
}

export function dripEdgePieces(lf: number): number {
  return ceilQty(lf / (DRIP_EDGE.pieceFt - DRIP_EDGE.lapIn / 12));
}

export interface DumpsterPlan {
  yd: number;
  count: number;
  tonsIncluded: number;
  overTons: number;
  overageCost: number;
}

/** Smallest dumpster that holds the volume and, if possible, the weight; else the biggest one with overage. */
export function pickDumpster(cubicYards: number, tons: number): DumpsterPlan | undefined {
  if (cubicYards <= 0) return undefined;
  const fit = DUMPSTERS.find((d) => d.yd >= cubicYards && d.tons >= tons);
  if (fit) return { yd: fit.yd, count: 1, tonsIncluded: fit.tons, overTons: 0, overageCost: 0 };
  const big = DUMPSTERS[DUMPSTERS.length - 1];
  const count = Math.max(1, ceilQty(cubicYards / big.yd));
  const overTons = Math.max(0, tons - count * big.tons);
  return { yd: big.yd, count, tonsIncluded: count * big.tons, overTons, overageCost: overTons * DUMPSTER_COST.overagePerTon };
}

/* ───────── shingle roof ───────── */

export type IceWaterPlan = "eaves" | "valleys" | "none";

export interface RoofInput {
  mode: "footprint" | "area";
  lengthFt: number;
  widthFt: number;
  overhangIn: number;
  style: RoofStyle;
  rise: number;
  /** area mode: roof surface and measured edges */
  areaSqFt: number;
  edges: RoofEdges;
  /** footprint mode, complex roofs only */
  valleysFt: number;
  productId: string;
  /** only for the "custom" product */
  customBundlesPerSquare: number;
  /** null = CertainTeed table */
  wastePct: number | null;
  starterOnRakes: boolean;
  underlaymentId: string;
  iceWater: IceWaterPlan;
  wallIn: number;
  iceRollFt: number;
  nailsPerShingle: number;
  ridgeVent: boolean;
  layers: number;
  oldRoof: OldRoof;
  installedPerSquare: number;
  permit: number;
}

export interface CostedQty {
  qty: number;
  unitPrice: number;
  cost: number;
}

export interface RoofResult {
  product: ShingleProduct;
  sqftPerBundle: number;
  roofAreaSqFt: number;
  planAreaSqFt: number;
  squares: number;
  pitchFactor: number;
  angleDeg: number;
  geometry?: RoofGeometry;
  edges: RoofEdges;
  autoWastePct: number;
  wastePct: number;
  bundles: number;
  bulkApplied: boolean;
  shingles: CostedQty;
  /** Delivered weight of the shingle bundles (typical per-square weight for the line type). */
  shingleWeightLb: number;
  starter: CostedQty & { lf: number };
  cap: CostedQty & { lf: number };
  underlayment: CostedQty & { double: boolean; netSqFtPerRoll: number };
  capNails: CostedQty & { count: number };
  iceWater?: CostedQty & { requiredIn: number; courses: number; eaveStripLf: number; valleyLf: number };
  dripEdge: CostedQty & { lf: number };
  /** Priced as whichever pack is cheaper for the count: 7,200-nail coil boxes or 5-lb boxes of hand nails. */
  nails: CostedQty & { pack: "coil" | "hand"; perShingle: number; perSquare: number; field: number; accessories: number; total: number; coilBoxes: number; fiveLbBoxes: number };
  vent?: { exhaustSqIn: number; intakeSqIn: number; ridgeLfNeeded: number; ridgeLf: number; sections: number; soffitLf: number; undereaveVents: number; shortfall: boolean };
  debris?: { lb: number; tons: number; cubicYards: number; dumpster?: DumpsterPlan };
  materialsCost: number;
  installed: { perSquare: number; base: number; tearoffAdjust: number; steep: number; permit: number; total: number; low: number; high: number };
  warnings: string[];
}

function costed(qty: number, unitPrice: number): CostedQty {
  return { qty, unitPrice, cost: qty * unitPrice };
}

export function computeRoof(input: RoofInput): RoofResult {
  const base = shingle(input.productId);
  const custom = base.id === "custom";
  const bps = custom ? Math.min(8, Math.max(1, Math.round(input.customBundlesPerSquare || base.bundlesPerSquare))) : base.bundlesPerSquare;
  const product: ShingleProduct = custom
    ? { ...base, bundlesPerSquare: bps, sqftPerBundle: SQFT_PER_SQUARE / bps, piecesPerBundle: (base.piecesPerBundle * base.bundlesPerSquare) / bps }
    : base;
  const rise = Math.max(0, input.rise);
  const pf = pitchFactor(rise);

  let geometry: RoofGeometry | undefined;
  let roofArea: number;
  let edges: RoofEdges;
  let atticArea: number;
  if (input.mode === "area") {
    roofArea = Math.max(0, input.areaSqFt);
    edges = {
      eaves: Math.max(0, input.edges.eaves),
      rakes: Math.max(0, input.edges.rakes),
      ridge: Math.max(0, input.edges.ridge),
      hips: Math.max(0, input.edges.hips),
      valleys: Math.max(0, input.edges.valleys),
    };
    // Plan area includes the overhangs, so this slightly overstates the attic — fine for vent sizing.
    atticArea = roofArea / pf;
  } else {
    geometry = roofFromFootprint({ lengthFt: input.lengthFt, widthFt: input.widthFt, overhangIn: input.overhangIn, style: input.style, rise, valleysFt: input.valleysFt });
    roofArea = geometry.roofAreaSqFt;
    edges = geometry.edges;
    atticArea = geometry.atticAreaSqFt;
  }
  const squares = roofArea / SQFT_PER_SQUARE;
  const auto = autoWastePct(roofArea, input.style);
  const waste = input.wastePct == null ? auto : Math.max(0, input.wastePct);

  const bundles = roofArea > 0 ? ceilQty((roofArea * (1 + waste / 100)) / product.sqftPerBundle) : 0;
  const bulkApplied = !!product.bulk && bundles >= product.bulk.minBundles;
  const shingles = costed(bundles, bulkApplied && product.bulk ? product.bulk.price : product.price);

  const starterLf = edges.eaves + (input.starterOnRakes ? edges.rakes : 0);
  const starter = { ...costed(ceilQty(starterLf / product.starter.lfPerBundle), product.starter.price), lf: starterLf };
  const capLf = edges.ridge + edges.hips;
  const cap = { ...costed(ceilQty(capLf / product.cap.lfPerBundle), product.cap.price), lf: capLf };

  const u = underlayment(input.underlaymentId);
  const ul = underlaymentRolls(roofArea, edges.eaves, rise < PITCH.doubleUnderlaymentBelow, u.id);
  const capNailCount = ceilQty(roofArea * capNailsPerSqFt(ul.exposureIn));

  let iceWater: RoofResult["iceWater"];
  if (input.iceWater !== "none") {
    const { requiredIn, courses } = iceBarrierCourses(rise, input.overhangIn, input.wallIn);
    const eaveStripLf = input.iceWater === "eaves" ? edges.eaves * courses : 0;
    const roll = iceWaterRoll(input.iceRollFt);
    const rolls = iceWaterRolls(eaveStripLf + edges.valleys, roll.lengthFt);
    iceWater = { ...costed(rolls, roll.price), requiredIn, courses, eaveStripLf, valleyLf: edges.valleys };
  }

  const dripLf = edges.eaves + edges.rakes;
  const dripEdge = { ...costed(dripEdgePieces(dripLf), DRIP_EDGE.price), lf: dripLf };

  const perShingle = rise > PITCH.sixNailsAbove ? 6 : input.nailsPerShingle >= 6 ? 6 : 4;
  const fieldNails = Math.round(bundles * product.piecesPerBundle * perShingle);
  const accessoryNails =
    ceilQty((starterLf * 12) / NAILS.starterPieceIn) * NAILS.perStarterPiece +
    ceilQty((capLf * 12) / NAILS.capExposureIn) * NAILS.perCap +
    ceilQty(dripLf / (DRIP_EDGE.nailSpacingIn / 12));
  const totalNails = fieldNails + accessoryNails;
  const coilBoxes = ceilQty(totalNails / NAILS.coilPerBox);
  const fiveLbBoxes = ceilQty(totalNails / NAILS.handPerFiveLb);
  // Up to two 5-lb boxes (~1,950 nails, a shed or porch roof) cost less than one 7,200-count coil box.
  const hand = fiveLbBoxes * NAILS.handBoxPrice < coilBoxes * NAILS.coilBoxPrice;
  const nails = {
    ...(hand ? costed(fiveLbBoxes, NAILS.handBoxPrice) : costed(coilBoxes, NAILS.coilBoxPrice)),
    pack: hand ? ("hand" as const) : ("coil" as const),
    perShingle,
    perSquare: Math.round(product.piecesPerBundle * product.bundlesPerSquare * perShingle),
    field: fieldNails,
    accessories: accessoryNails,
    total: totalNails,
    coilBoxes,
    fiveLbBoxes,
  };

  let vent: RoofResult["vent"];
  if (input.ridgeVent && atticArea > 0) {
    const nfaSqIn = (atticArea / VENTILATION.ratio) * 144;
    const exhaust = nfaSqIn / 2;
    const needed = exhaust / VENTILATION.ridgeNfaPerLf;
    const available = Math.floor(edges.ridge / VENTILATION.ridgeSectionFt) * VENTILATION.ridgeSectionFt;
    const ridgeLf = Math.min(ceilTo(needed, VENTILATION.ridgeSectionFt), available);
    vent = {
      exhaustSqIn: exhaust,
      intakeSqIn: nfaSqIn / 2,
      ridgeLfNeeded: needed,
      ridgeLf,
      sections: ridgeLf / VENTILATION.ridgeSectionFt,
      soffitLf: nfaSqIn / 2 / VENTILATION.soffitNfaPerLf,
      undereaveVents: ceilQty(nfaSqIn / 2 / VENTILATION.undereaveNfaEach),
      shortfall: needed > available + 1e-9,
    };
  }

  const layers = Math.max(0, Math.min(2, Math.round(input.layers)));
  let debris: RoofResult["debris"];
  if (layers > 0 && squares > 0) {
    const lb = squares * layers * TEAROFF_LB_PER_SQUARE[input.oldRoof];
    const cubicYards = squares * layers * DEBRIS_CY_PER_SQUARE;
    debris = { lb, tons: lb / 2000, cubicYards, dumpster: pickDumpster(cubicYards, lb / 2000) };
  }

  const steep = rise >= PITCH.steep ? squares * INSTALL_EXTRAS.steepPerSquare : 0;
  const tearoffAdjust = layers === 0 ? -squares * INSTALL_EXTRAS.tearoffPerSquare : (layers - 1) * squares * INSTALL_EXTRAS.extraLayerPerSquare;
  const range = INSTALLED_PER_SQUARE[product.type];
  const fixed = tearoffAdjust + steep + input.permit;
  // A custom $/square below the no-tear-off credit must not turn the estimate negative.
  const hired = (perSquare: number) => (squares > 0 ? Math.max(0, squares * perSquare + fixed) : 0);
  const installed = {
    perSquare: input.installedPerSquare,
    base: squares * input.installedPerSquare,
    tearoffAdjust,
    steep,
    permit: input.permit,
    total: hired(input.installedPerSquare),
    low: hired(range.low),
    high: hired(range.high),
  };

  const underlaymentCost = { ...costed(ul.rolls, u.price), double: ul.double, netSqFtPerRoll: ul.netSqFtPerRoll };
  const capNails = { ...costed(ceilQty(capNailCount / CAP_NAILS.perBucket), CAP_NAILS.price), count: capNailCount };
  const materialsCost =
    shingles.cost + starter.cost + cap.cost + underlaymentCost.cost + capNails.cost + (iceWater?.cost ?? 0) + dripEdge.cost + nails.cost;

  const warnings: string[] = [];
  if (roofArea > 0 && rise < PITCH.shingleMin)
    warnings.push("Asphalt shingles are not allowed below a 2/12 pitch (IRC R905.2.2). Use a low-slope membrane or roll roofing instead.");
  else if (roofArea > 0 && rise < PITCH.doubleUnderlaymentBelow)
    warnings.push(
      "Between 2/12 and 4/12 the IRC requires two layers of underlayment (half-width starter, then sheets lapped half the width + 2 in) — counted above. CertainTeed goes further and wants self-adhered membrane over the whole deck at these pitches.",
    );
  if (rise > PITCH.sixNailsAbove) warnings.push("Over 21/12 shingle makers require 6 nails and 4 dabs of roof cement per shingle; nails are counted at 6.");
  if (input.wastePct != null && input.wastePct < auto - 2)
    warnings.push(`Your waste (${input.wastePct}%) is well under the ${auto}% CertainTeed suggests for a roof this size and shape. Short orders mean mismatched shingle lots.`);
  if (vent?.shortfall)
    warnings.push(
      edges.ridge < VENTILATION.ridgeSectionFt
        ? "There is no usable ridge for ridge vent. Plan off-ridge or box vents for exhaust."
        : `The ridge is too short to carry all the exhaust (${Math.round(vent.ridgeLfNeeded)} ft of ridge vent wanted at 1/150). Add off-ridge vents or confirm your attic qualifies for 1/300.`,
    );
  if (input.style === "complex" && edges.valleys === 0)
    warnings.push("Complex roofs almost always have valleys. Enter their total length so ice & water shield and waste are right.");

  return {
    product,
    sqftPerBundle: product.sqftPerBundle,
    roofAreaSqFt: roofArea,
    planAreaSqFt: geometry?.planAreaSqFt ?? roofArea / pf,
    squares,
    pitchFactor: pf,
    angleDeg: pitchAngle(rise),
    geometry,
    edges,
    autoWastePct: auto,
    wastePct: waste,
    bundles,
    bulkApplied,
    shingles,
    shingleWeightLb: (bundles / product.bundlesPerSquare) * (custom ? SHINGLE_LB_PER_SQUARE.designer : SHINGLE_LB_PER_SQUARE[product.type]),
    starter,
    cap,
    underlayment: underlaymentCost,
    capNails,
    iceWater,
    dripEdge,
    nails,
    vent,
    debris,
    materialsCost,
    installed,
    warnings,
  };
}

/** Bundles of each listed product line for the same roof (comparison table). */
export function bundlesFor(roofAreaSqFt: number, wastePct: number, sqftPerBundle: number): number {
  return roofAreaSqFt > 0 ? ceilQty((roofAreaSqFt * (1 + wastePct / 100)) / sqftPerBundle) : 0;
}

/* ───────── metal roof ───────── */

export interface MetalInput {
  lengthFt: number;
  widthFt: number;
  style: "gable" | "shed";
  rise: number;
  eaveOverhangIn: number;
  rakeOverhangIn: number;
  profileId: string;
  stockLengths: boolean;
  underlayment: boolean;
}

/** Store panels to buy: `count` × `ft`-ft panels, each cut into `pieces` roof panels. */
export interface StockPlan {
  ft: number;
  price: number;
  pieces: 1 | 2;
  count: number;
  /** Offcut left on each stock panel (ft). */
  offcutFt: number;
}

/**
 * Cheapest way to cover `panels` runs of `lengthFt` from stock lengths. Two pieces are cut from one panel when
 * they fit: each keeps one factory end for the eave and the cut end goes under the ridge cap or high-side trim.
 */
export function stockPlan(stock: { ft: number; price: number }[], lengthFt: number, panels: number): StockPlan | undefined {
  if (lengthFt <= 0 || panels <= 0) return undefined;
  let best: StockPlan | undefined;
  for (const s of stock) {
    if (s.ft < lengthFt - 1e-9) continue;
    const pieces = s.ft >= 2 * lengthFt - 1e-9 ? 2 : 1;
    const count = ceilQty(panels / pieces);
    if (!best || count * s.price < best.count * best.price - 1e-9) best = { ft: s.ft, price: s.price, pieces, count, offcutFt: s.ft - pieces * lengthFt };
  }
  return best;
}

export interface MetalResult {
  roofAreaSqFt: number;
  squares: number;
  sides: number;
  eaveLengthFt: number;
  panelLengthFt: number;
  panelsPerSide: number;
  /** Roof panels installed (pieces), whether cut to length or cut from stock. */
  panels: number;
  panelLf: number;
  /** Set when stock lengths were chosen and the run fits the longest one. */
  stock?: StockPlan;
  panelCost: number;
  screws: number;
  weightLb: number;
  ridgeLf: number;
  ridgePieces: number;
  eaveLf: number;
  eavePieces: number;
  rakeLf: number;
  rakePieces: number;
  eaveClosures: number;
  ridgeClosures: number;
  underlaymentRolls: number;
  capNails: number;
  materialsCost: number;
  warnings: string[];
}

export function computeMetal(input: MetalInput): MetalResult {
  const p = metalProfile(input.profileId);
  const rise = Math.max(0, input.rise);
  const pf = pitchFactor(rise);
  const eave = Math.max(0, input.eaveOverhangIn) / 12;
  const rake = Math.max(0, input.rakeOverhangIn) / 12;
  const valid = input.lengthFt > 0 && input.widthFt > 0;
  const sides = input.style === "shed" ? 1 : 2;
  const eaveLength = valid ? input.lengthFt + 2 * rake : 0;
  const planWidth = valid ? input.widthFt + 2 * eave : 0;
  const runPerSide = planWidth / sides;
  // Panels are ordered to the inch.
  const panelLength = valid ? Math.ceil(runPerSide * pf * 12 - 1e-6) / 12 : 0;
  const panelsPerSide = valid ? ceilQty((eaveLength * 12) / p.coverageIn) : 0;
  const panels = panelsPerSide * sides;
  const roofArea = eaveLength * planWidth * pf;

  const stock = input.stockLengths ? stockPlan(p.stock, panelLength, panels) : undefined;
  const panelCost = stock ? stock.count * stock.price : panels * p.perLf * panelLength;

  const ridgeLf = eaveLength; // ridge cap on a gable, high-side trim on a shed roof
  const eaveLf = eaveLength * sides;
  const rakeLf = panelLength * 2 * sides;
  const ridgePieces = valid ? ceilQty(ridgeLf / METAL.ridgeCap.netFt) : 0;
  const closureFt = p.closure.lengthIn / 12;
  const eaveClosures = valid ? ceilQty(eaveLf / closureFt) : 0;
  const ridgeClosures = valid ? ceilQty((ridgeLf * sides) / closureFt) : 0;

  const ul = input.underlayment ? underlaymentRolls(roofArea, eaveLf, false, "synthetic") : undefined;
  const capNails = ul ? ceilQty(roofArea * capNailsPerSqFt(ul.exposureIn)) : 0;
  const synthetic = underlayment("synthetic");

  const materialsCost =
    panelCost +
    (input.style === "gable" ? ridgePieces * METAL.ridgeCap.price : 0) +
    (eaveClosures + ridgeClosures) * p.closure.price +
    (ul ? ul.rolls * synthetic.price + ceilQty(capNails / CAP_NAILS.perBucket) * CAP_NAILS.price : 0);

  const warnings: string[] = [];
  if (valid && rise < PITCH.metalSealedMin)
    warnings.push("Below ½/12 even sealed lapped panels are not allowed (IRC R905.10.2). Look at standing seam (¼/12 minimum) or a membrane roof.");
  else if (valid && rise < p.minRise)
    warnings.push(
      `${p.short} panels are rated for ${p.minRise}/12 and steeper by their makers, and the IRC wants 3/12 for lapped panels unless every side lap gets sealant (then ½/12).`,
    );
  else if (valid && rise < PITCH.metalLappedMin)
    warnings.push("Under 3/12 the IRC requires lap sealant on lapped metal panels (R905.10.2). Run butyl tape in every side lap.");
  if (input.stockLengths && valid && !stock)
    warnings.push(
      `A ${Math.ceil(panelLength)}-ft run is longer than the ${p.stock[p.stock.length - 1].ft}-ft stock panels stores carry. Order cut-to-length panels from a metal supplier — priced per foot here.`,
    );
  if (valid && panelLength > METAL.maxPanelFt)
    warnings.push(`Panels over ${METAL.maxPanelFt} ft are hard to ship and handle; most suppliers will split the run with an end lap.`);
  if (stock && stock.offcutFt >= 1)
    warnings.push(`Stock ${stock.ft}-ft panels leave about ${Math.round(stock.offcutFt * 12)} in to trim off each one. Cut-to-length panels avoid the waste.`);

  return {
    roofAreaSqFt: roofArea,
    squares: roofArea / SQFT_PER_SQUARE,
    sides,
    eaveLengthFt: eaveLength,
    panelLengthFt: panelLength,
    panelsPerSide,
    panels,
    panelLf: panels * panelLength,
    stock,
    panelCost,
    screws: ceilQty((roofArea / SQFT_PER_SQUARE) * METAL.screwsPerSquare),
    weightLb: roofArea * METAL.lbPerSqFt,
    ridgeLf: valid ? ridgeLf : 0,
    ridgePieces,
    eaveLf,
    eavePieces: valid ? ceilQty(eaveLf / METAL.trimNetFt) : 0,
    rakeLf,
    rakePieces: valid ? ceilQty(rakeLf / METAL.trimNetFt) : 0,
    eaveClosures,
    ridgeClosures,
    underlaymentRolls: ul?.rolls ?? 0,
    capNails,
    materialsCost,
    warnings,
  };
}

/* ───────── pitch calculator ───────── */

export interface PitchInput {
  mode: "pitch" | "angle" | "measure";
  rise: number;
  angleDeg: number;
  measuredRiseIn: number;
  measuredRunIn: number;
  spanFt: number;
  overhangIn: number;
}

export interface PitchResult {
  rise: number;
  angleDeg: number;
  gradePct: number;
  factor: number;
  hipFactor: number;
  pitchClass: PitchClass;
  runFt: number;
  ridgeHeightFt: number;
  rafterFt: number;
  rafterNoOverhangFt: number;
}

export function computePitch(input: PitchInput): PitchResult {
  const rise =
    input.mode === "angle"
      ? riseFromAngle(input.angleDeg)
      : input.mode === "measure"
        ? input.measuredRunIn > 0
          ? (Math.max(0, input.measuredRiseIn) / input.measuredRunIn) * 12
          : 0
        : Math.max(0, input.rise);
  const factor = pitchFactor(rise);
  const runFt = Math.max(0, input.spanFt) / 2;
  const overhangFt = Math.max(0, input.overhangIn) / 12;
  return {
    rise,
    angleDeg: pitchAngle(rise),
    gradePct: (rise / 12) * 100,
    factor,
    hipFactor: hipFactor(rise),
    pitchClass: pitchClass(rise),
    runFt,
    ridgeHeightFt: runFt * (rise / 12),
    rafterFt: (runFt + overhangFt) * factor,
    rafterNoOverhangFt: runFt * factor,
  };
}
