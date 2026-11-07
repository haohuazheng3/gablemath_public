// Pure flooring math shared by the client calculators and the server-rendered answers.

import { ceilQty } from "@/lib/format";
import {
  ACCESSORIES,
  BASEBOARD,
  CARPET,
  COMPLEXITY,
  CUSTOM_ID,
  DEFAULT_PRODUCT,
  GAP_IN,
  HARDWOOD_ACCLIMATION,
  LAYOUT_WASTE,
  LIFEPROOF_TREADS,
  PRODUCTS,
  QUARTER_ROUND,
  REMOVAL_PSF,
  RULES,
  SMALL_JOB,
  STAIR_CARPET,
  STAIR_PLANK_WASTE_PCT,
  TMOLD,
  TRANSITIONS,
  TYPICAL_PSF,
  type Complexity,
  type FloorProduct,
  type FloorType,
  type Layout,
  type TransitionKind,
  type TrimKind,
} from "./data";

/* ───────────────────────── geometry ───────────────────────── */

export interface Rect {
  /** feet */
  l: number;
  /** feet */
  w: number;
}

export function rectArea(r: Rect): number {
  return r.l > 0 && r.w > 0 ? r.l * r.w : 0;
}

export function rectPerimeter(r: Rect): number {
  return rectArea(r) > 0 ? 2 * (r.l + r.w) : 0;
}

export type RunAlong = "length" | "width";

/* ───────────────────────── packaging helpers ───────────────────────── */

/** Whole boxes for an order area (waste already included). */
export function boxesFor(orderSqft: number, sqftPerBox: number): number {
  return sqftPerBox > 0 ? ceilQty(orderSqft / sqftPerBox) : 0;
}

/** Rolls of underlayment or film; side overlap scales the area by overlap ÷ roll width. */
export function rollsFor(sqft: number, rollSqft: number, overlapIn = 0, rollWidthIn = 0): number {
  if (sqft <= 0 || rollSqft <= 0) return 0;
  const overlap = rollWidthIn > 0 ? 1 + overlapIn / rollWidthIn : 1;
  return ceilQty((sqft * overlap * ACCESSORIES.rollAllowance) / rollSqft);
}

/**
 * Transition sticks for doorways. One stick serves floor(stick ÷ (opening + 1 in)) openings, so a 94 in
 * stick covers two 32–36 in doorways; an opening longer than a stick takes several sticks of its own.
 */
export function transitionPieces(openings: number, openingIn: number, stickIn: number): number {
  const n = Math.max(0, Math.round(openings));
  if (n === 0 || openingIn <= 0 || stickIn <= 0) return 0;
  if (openingIn > stickIn) return n * ceilQty(openingIn / stickIn);
  return ceilQty(n / Math.floor(stickIn / (openingIn + 1)));
}

/** Trim sticks for a run of linear feet, with a % allowance for miters and cut-offs. */
export function stickPieces(linearFt: number, stickIn: number, wastePct: number): number {
  if (linearFt <= 0 || stickIn <= 0) return 0;
  return ceilQty((linearFt * (1 + wastePct / 100)) / (stickIn / 12));
}

/* ───────────────────────── waste ───────────────────────── */

export interface WasteParts {
  layout: number;
  complexity: number;
  smallJob: number;
  total: number;
}

function isHardwood(type: FloorType): boolean {
  return type === "solid" || type === "engineered";
}

export function layoutWastePct(type: FloorType, layout: Layout, netSqft: number): number {
  if (layout === "herringbone") {
    const h = LAYOUT_WASTE.herringbone;
    return netSqft < h.smallUnderSqft ? h.small : h.large;
  }
  return (isHardwood(type) ? LAYOUT_WASTE.hardwood : LAYOUT_WASTE.resilient)[layout];
}

export function autoWaste(type: FloorType, layout: Layout, netSqft: number, complexity: Complexity): WasteParts {
  const lay = layoutWastePct(type, layout, netSqft);
  const cx = COMPLEXITY.find((c) => c.value === complexity)?.pct ?? 0;
  const small = netSqft > 0 && netSqft < SMALL_JOB.underSqft ? SMALL_JOB.pct : 0;
  return { layout: lay, complexity: cx, smallJob: small, total: lay + cx + small };
}

/* ───────────────────────── product resolution ───────────────────────── */

export interface ResolvedProduct extends FloorProduct {
  boxPrice: number;
  /** false when boxPrice is the type's typical $/sq ft, not a price for this SKU */
  priced: boolean;
}

export interface CustomProduct {
  sqftPerBox: number;
  pricePerSqft: number;
  attachedPad: boolean;
}

/** Picks the product (falling back to the type default if the id belongs to another type). */
export function resolveProduct(id: string, type: FloorType, custom: CustomProduct): ResolvedProduct {
  if (id === CUSTOM_ID) {
    const sqft = Math.max(0, custom.sqftPerBox);
    return {
      id: CUSTOM_ID,
      type,
      brand: "Custom",
      name: "Your flooring",
      short: "your flooring",
      sqftPerBox: sqft,
      boxPrice: Math.max(0, custom.pricePerSqft) * sqft,
      priceNote: "your price",
      priced: true,
      attachedPad: type === "solid" ? false : custom.attachedPad,
      install: type === "solid" ? "nail" : "floating",
      rules: "generic",
    };
  }
  const found = PRODUCTS.find((p) => p.id === id && p.type === type) ?? PRODUCTS.find((p) => p.id === DEFAULT_PRODUCT[type])!;
  const priced = found.boxPrice != null;
  return { ...found, boxPrice: found.boxPrice ?? Math.round(TYPICAL_PSF[type] * found.sqftPerBox * 100) / 100, priced };
}

export function expansionGapIn(p: Pick<FloorProduct, "type" | "install" | "rules">, netSqft: number): number {
  switch (p.type) {
    case "solid":
      return GAP_IN.solid;
    case "engineered":
      return p.install === "floating" ? GAP_IN.engineeredFloating : GAP_IN.engineeredFastened;
    case "laminate":
      return GAP_IN.laminate;
    default:
      return p.rules === "coretec" && netSqft >= GAP_IN.lvpLargeSqft ? GAP_IN.lvpLarge : GAP_IN.lvp;
  }
}

export function acclimationFor(p: Pick<FloorProduct, "type" | "rules">): { text: string; source: string } {
  if (p.type === "solid" || p.type === "engineered") {
    return {
      text: HARDWOOD_ACCLIMATION[p.type],
      source: p.rules === "bruce" ? RULES.bruce.source : "Bruce/AHF guidance (hardwood default)",
    };
  }
  const r = RULES[p.rules];
  return { text: r.acclimation ?? RULES.generic.acclimation!, source: r.source };
}

/* ───────────────────────── hard-floor estimate ───────────────────────── */

export type Subfloor = "wood" | "slab" | "basement";

export interface StairInput {
  steps: number;
  widthIn: number;
  treadIn: number;
  riserIn: number;
}

export interface FlooringInput {
  product: ResolvedProduct;
  /** Rooms mode: one rectangle per room, closet or hall. */
  areas: Rect[];
  /** Area mode: total sq ft entered directly (used when > 0 and `areas` is empty). */
  totalSqft: number;
  /** Area mode: wall length to trim with quarter round. */
  wallFt: number;
  layout: Layout;
  /** Planks run along each area's length or width (sets which side the rows stack across). */
  runAlong: RunAlong;
  complexity: Complexity;
  /** % entered by hand; undefined = automatic from layout, complexity and job size. */
  wasteOverride?: number;
  spareBoxes: number;
  subfloor: Subfloor;
  doors: number;
  doorWidthIn: number;
  transition: TransitionKind;
  trim: TrimKind;
  stairs: StairInput;
  laborPerSqft: number;
  removal: boolean;
}

export type UnderlaymentKind = "attached" | "foam" | "felt" | "none";

export interface FlooringResult {
  netSqft: number;
  perimeterFt: number;
  /** Longest single dimension of any area (T-molding triggers). 0 in area mode. */
  maxSpanFt: number;
  waste: WasteParts;
  wastePct: number;
  orderSqft: number;
  boxesNeeded: number;
  boxes: number;
  coverSqft: number;
  leftoverSqft: number;
  boxCost: number;
  /** Material spend per sq ft of floor, whole boxes included. */
  effectivePsf: number;
  underlayment: { kind: UnderlaymentKind; rolls: number; cost: number; why: string };
  vapor: { rolls: number; cost: number; required: boolean } | null;
  transitions: { pieces: number; stickIn: number; price: number; cost: number };
  trim: { linearFt: number; pieces: number; stickIn: number; price: number; cost: number } | null;
  stairs: {
    steps: number;
    plankSqft: number;
    noseSticks: number;
    noseCost: number;
    treadBoxes: number;
    treadCost: number;
  } | null;
  gapIn: number;
  gapCovered: boolean;
  acclimation: { text: string; source: string };
  concreteLimit?: string;
  flatness?: string;
  rows?: { count: number; lastRowIn: number };
  materialsCost: number;
  laborCost: number;
  removalCost: number;
  warnings: string[];
}

const FRACTIONS: Record<number, string> = { 0.125: "1/8", 0.25: "1/4", 0.375: "3/8", 0.4375: "7/16", 0.5: "1/2", 0.75: "3/4" };

/** 0.375 → "3/8 in" for the gap and pad sizes used here. */
export function inchFraction(inches: number): string {
  return `${FRACTIONS[inches] ?? inches} in`;
}

export function computeFlooring(input: FlooringInput): FlooringResult {
  const p = input.product;
  const hardwood = isHardwood(p.type);
  const areas = input.areas.filter((a) => rectArea(a) > 0);
  const roomsMode = areas.length > 0;
  const netSqft = roomsMode ? areas.reduce((s, a) => s + rectArea(a), 0) : Math.max(0, input.totalSqft);
  const perimeterFt = roomsMode ? areas.reduce((s, a) => s + rectPerimeter(a), 0) : Math.max(0, input.wallFt);
  const maxSpanFt = areas.reduce((m, a) => Math.max(m, a.l, a.w), 0);

  const waste = autoWaste(p.type, input.layout, netSqft, input.complexity);
  const wastePct = input.wasteOverride != null ? Math.max(0, input.wasteOverride) : waste.total;
  const orderSqft = netSqft * (1 + wastePct / 100);

  // Stairs: LifeProof planks on stairs void the warranty, so LifeProof gets matching treads instead.
  const steps = Math.max(0, Math.round(input.stairs.steps));
  const lifeproof = p.rules === "lifeproof";
  let stairs: FlooringResult["stairs"] = null;
  if (steps > 0 && !hardwood) {
    const { widthIn, treadIn, riserIn } = input.stairs;
    const plankSqft = lifeproof ? 0 : ((steps * (treadIn + riserIn) * widthIn) / 144) * (1 + STAIR_PLANK_WASTE_PCT / 100);
    const perStick = Math.floor(TRANSITIONS.stairNose.lengthIn / (widthIn + 1));
    const noseSticks = lifeproof ? 0 : perStick > 0 ? ceilQty(steps / perStick) : steps * ceilQty(widthIn / TRANSITIONS.stairNose.lengthIn);
    const treadBoxes = lifeproof ? ceilQty(steps / LIFEPROOF_TREADS.perBox) : 0;
    stairs = {
      steps,
      plankSqft,
      noseSticks,
      noseCost: noseSticks * TRANSITIONS.stairNose.price,
      treadBoxes,
      treadCost: treadBoxes * LIFEPROOF_TREADS.price,
    };
  }

  const boxesNeeded = boxesFor(orderSqft + (stairs?.plankSqft ?? 0), p.sqftPerBox);
  const boxes = boxesNeeded > 0 ? boxesNeeded + Math.max(0, Math.round(input.spareBoxes)) : 0;
  const coverSqft = boxes * p.sqftPerBox;
  const leftoverSqft = boxes > 0 ? coverSqft - orderSqft - (stairs?.plankSqft ?? 0) : 0;
  const boxCost = boxes * p.boxPrice;

  const onConcrete = input.subfloor !== "wood";
  const warnings: string[] = [];

  // Underlayment
  let underlayment: FlooringResult["underlayment"];
  if (p.attachedPad) {
    const why =
      p.rules === "lifeproof"
        ? "The pad is attached. LifeProof approves only its own Universal Underlayment as an extra layer — anything else needs the manufacturer's OK."
        : p.rules === "coretec"
          ? "The pad is attached. COREtec allows a second underlayment only up to 3 mm thick."
          : p.rules === "pergo"
            ? "The pad is attached. Pergo allows only its FloorMate/Gold underlayment on top, and then no separate vapor barrier."
            : "The pad is attached. A second foam layer usually isn't needed and can void the warranty — check the carton before adding one.";
    underlayment = { kind: "attached", rolls: 0, cost: 0, why };
  } else if (p.install === "floating") {
    const rolls = rollsFor(netSqft, ACCESSORIES.foam.rollSqft);
    underlayment = { kind: "foam", rolls, cost: rolls * ACCESSORIES.foam.price, why: "No pad attached — a floating floor needs underlayment under it." };
  } else if (p.install === "nail" && !onConcrete) {
    const rolls = rollsFor(netSqft, ACCESSORIES.felt.rollSqft);
    underlayment = { kind: "felt", rolls, cost: rolls * ACCESSORIES.felt.price, why: "15 lb felt is the usual underlayment under nail-down wood floors." };
  } else {
    underlayment = { kind: "none", rolls: 0, cost: 0, why: "Nail-down wood over concrete needs the manufacturer's own method — see the warning above." };
  }

  // Moisture barrier over concrete
  let vapor: FlooringResult["vapor"] = null;
  if (onConcrete && netSqft > 0) {
    const required = p.type === "laminate";
    const recommended = (p.type === "lvp" && input.subfloor === "basement") || (p.type === "engineered" && p.install === "floating");
    if (required || recommended) {
      const rolls = rollsFor(netSqft, ACCESSORIES.poly.rollSqft, ACCESSORIES.poly.overlapIn, ACCESSORIES.poly.widthIn);
      vapor = { rolls, cost: rolls * ACCESSORIES.poly.price, required };
    }
    if (p.install === "nail") {
      warnings.push("Nail-down wood can't be fastened into concrete. Over a slab, use a glue-down or floating floor, or follow the manufacturer's method for building a wood subfloor first.");
    }
  }

  // Transitions at doorways
  const tr = hardwood ? TRANSITIONS.hardwood : TRANSITIONS.resilient;
  const trPieces = transitionPieces(input.doors, input.doorWidthIn, tr.lengthIn);
  const trPrice = tr.price[input.transition];

  // Quarter round over the expansion gap
  const gapIn = expansionGapIn(p, netSqft);
  let trim: FlooringResult["trim"] = null;
  if (input.trim !== "none") {
    const openingsFt = (Math.max(0, input.doors) * Math.max(0, input.doorWidthIn)) / 12;
    const linearFt = Math.max(0, perimeterFt - openingsFt);
    const stock = input.trim === "paint" ? QUARTER_ROUND.paint : hardwood ? QUARTER_ROUND.matchedHardwood : QUARTER_ROUND.matchedResilient;
    const pieces = stickPieces(linearFt, stock.lengthIn, QUARTER_ROUND.wastePct);
    if (linearFt > 0) trim = { linearFt, pieces, stickIn: stock.lengthIn, price: stock.price, cost: pieces * stock.price };
  }
  const gapCovered = gapIn + QUARTER_ROUND.toleranceIn <= QUARTER_ROUND.coverIn;
  if (input.trim !== "none" && !gapCovered) {
    warnings.push(`A ${inchFraction(gapIn)} expansion gap is wider than standard quarter round (about 0.8 in) reliably covers. Remove and reset the baseboards over the new floor, or use a wider shoe or base.`);
  }

  // Layout and product rules
  if (input.layout === "herringbone" && !p.pattern) {
    warnings.push(
      lifeproof
        ? "Laying standard LifeProof planks in herringbone voids the warranty — pick LifeProof Herringbone instead."
        : "Herringbone is laid with planks made for it. Check that this product is approved for herringbone before buying.",
    );
  }
  if (p.pattern && input.layout !== "herringbone") {
    warnings.push(`This is a ${p.pattern} product, which needs the herringbone layout's 15–20% overage.`);
  }
  if (input.wasteOverride != null && input.wasteOverride < waste.layout) {
    warnings.push(`${Math.round(input.wasteOverride)}% is below the ${waste.layout}% the manufacturers call for with this layout. Running short means a second order from a different dye lot.`);
  }
  if (lifeproof && maxSpanFt > TMOLD.lifeproofMaxRunFt) {
    warnings.push(`LifeProof needs a T-molding expansion break in any run longer than ${TMOLD.lifeproofMaxRunFt} ft.`);
  }
  if (p.rules === "pergo") {
    if (maxSpanFt >= TMOLD.pergoRoomFt) warnings.push(`Pergo requires a T-molding in rooms ${TMOLD.pergoRoomFt} ft or more long or wide.`);
    if (input.doors > 0 && input.doorWidthIn < TMOLD.pergoDoorwayUnderIn) {
      warnings.push(`Pergo requires a T-molding in every doorway narrower than ${TMOLD.pergoDoorwayUnderIn} in, even between rooms with the same floor.`);
    }
  }
  if (p.rules === "coretec" && netSqft >= GAP_IN.lvpLargeSqft) {
    warnings.push("At 2,500 sq ft and up, COREtec and Shaw call for a 1/2 in perimeter gap instead of 1/4 in.");
  }
  if (steps > 0 && hardwood) {
    warnings.push("Hardwood stairs are usually built with solid stair treads, not floor planks — they are not included here. Pros quote $100–$200 per step installed (Fixr).");
  }
  if (stairs && lifeproof) {
    warnings.push(
      input.stairs.widthIn > LIFEPROOF_TREADS.lengthIn
        ? `LifeProof planks on stairs void the warranty, and the matching ${LIFEPROOF_TREADS.lengthIn} in treads are too short for ${Math.round(input.stairs.widthIn)} in stairs.`
        : "LifeProof planks on stairs void the warranty, so the list uses matching stair treads (2 per box) instead of planks.",
    );
  }

  // Plank rows across the largest area (straight layout): helps balance a skinny last row.
  let rows: FlooringResult["rows"];
  const main = areas.reduce<Rect | undefined>((best, a) => (!best || rectArea(a) > rectArea(best) ? a : best), undefined);
  if (main && input.layout === "straight" && p.plankWidthIn) {
    const acrossIn = (input.runAlong === "length" ? main.w : main.l) * 12 - 2 * gapIn;
    const count = ceilQty(acrossIn / p.plankWidthIn);
    rows = { count, lastRowIn: acrossIn - (count - 1) * p.plankWidthIn };
  }

  const rule = p.type === "lvp" || p.type === "laminate" ? RULES[p.rules] : undefined;
  const materialsCost =
    boxCost +
    underlayment.cost +
    (vapor?.cost ?? 0) +
    trPieces * trPrice +
    (trim?.cost ?? 0) +
    (stairs ? stairs.noseCost + stairs.treadCost : 0);

  return {
    netSqft,
    perimeterFt,
    maxSpanFt,
    waste,
    wastePct,
    orderSqft,
    boxesNeeded,
    boxes,
    coverSqft,
    leftoverSqft,
    boxCost,
    effectivePsf: netSqft > 0 ? boxCost / netSqft : 0,
    underlayment,
    vapor,
    transitions: { pieces: trPieces, stickIn: tr.lengthIn, price: trPrice, cost: trPieces * trPrice },
    trim,
    stairs,
    gapIn,
    gapCovered,
    acclimation: acclimationFor(p),
    concreteLimit: onConcrete ? rule?.concreteLimit : undefined,
    flatness: rule?.flatness,
    rows,
    materialsCost,
    laborCost: netSqft * Math.max(0, input.laborPerSqft),
    removalCost: input.removal ? netSqft * REMOVAL_PSF : 0,
    warnings,
  };
}

/** Boxes and cost of every listed product of one type for the same order area. */
export function compareProducts(type: FloorType, orderSqft: number, patterned: boolean) {
  return PRODUCTS.filter((p) => p.type === type && !!p.pattern === patterned).map((p) => {
    const r = resolveProduct(p.id, type, { sqftPerBox: 0, pricePerSqft: 0, attachedPad: false });
    const boxes = boxesFor(orderSqft, r.sqftPerBox);
    return { product: r, boxes, leftoverSqft: boxes * r.sqftPerBox - orderSqft, cost: boxes * r.boxPrice };
  });
}

/* ───────────────────────── carpet ───────────────────────── */

export interface CarpetLayout {
  rollFt: number;
  runAlong: RunAlong;
  drops: number;
  cutLenFt: number;
  linearFt: number;
  sqft: number;
  sqyd: number;
  seams: number;
  seamLf: number;
  /** Width of carpet beyond the room across the drops, inches (0 = no side allowance at all). */
  sideSlackIn: number;
}

/**
 * Broadloom is cut from full-width rolls and every piece keeps the same pile direction (CRI 105 §5.2),
 * so fills come from extra full-width drops: drops = ceil(across ÷ roll width), each run + trim long.
 */
export function carpetLayout(lengthFt: number, widthFt: number, rollFt: number, runAlong: RunAlong, trimIn: number): CarpetLayout {
  const run = runAlong === "length" ? lengthFt : widthFt;
  const across = runAlong === "length" ? widthFt : lengthFt;
  const valid = run > 0 && across > 0 && rollFt > 0;
  const drops = valid ? ceilQty(across / rollFt) : 0;
  const cutLenFt = valid ? run + (2 * Math.max(0, trimIn)) / 12 : 0;
  const linearFt = drops * cutLenFt;
  const sqft = linearFt * rollFt;
  const seams = Math.max(0, drops - 1);
  return {
    rollFt,
    runAlong,
    drops,
    cutLenFt,
    linearFt,
    sqft,
    sqyd: sqft / 9,
    seams,
    seamLf: seams * run,
    sideSlackIn: valid ? (drops * rollFt - across) * 12 : 0,
  };
}

/** Cheapest orientation; ties go to fewer seams, then to seams running the room's long way (CRI 105 §5.1). */
export function bestCarpetLayout(lengthFt: number, widthFt: number, rollFt: number, trimIn: number): CarpetLayout {
  const longWay: RunAlong = lengthFt >= widthFt ? "length" : "width";
  const a = carpetLayout(lengthFt, widthFt, rollFt, longWay, trimIn);
  const b = carpetLayout(lengthFt, widthFt, rollFt, longWay === "length" ? "width" : "length", trimIn);
  if (Math.abs(a.sqft - b.sqft) > 1e-9) return a.sqft < b.sqft ? a : b;
  return b.seams < a.seams ? b : a;
}

export interface CarpetStairsResult {
  steps: number;
  pieceIn: number;
  across: number;
  rows: number;
  linearFt: number;
  sqft: number;
  sqyd: number;
  netSqft: number;
  padSqft: number;
}

/** Stair pieces (tread + riser + nose wrap + allowance) packed side by side across the roll, pile running down. */
export function carpetStairs(steps: number, widthIn: number, treadIn: number, riserIn: number, rollFt: number): CarpetStairsResult {
  const n = Math.max(0, Math.round(steps));
  const pieceIn = treadIn + riserIn + STAIR_CARPET.noseWrapIn + STAIR_CARPET.allowanceIn;
  const valid = n > 0 && widthIn > 0 && treadIn > 0 && rollFt > 0;
  const across = valid ? Math.max(1, Math.floor((rollFt * 12) / (widthIn + STAIR_CARPET.sideClearanceIn))) : 0;
  const rows = valid ? ceilQty(n / across) : 0;
  const linearFt = (rows * pieceIn) / 12;
  const sqft = linearFt * rollFt;
  return {
    steps: n,
    pieceIn,
    across,
    rows,
    linearFt,
    sqft,
    sqyd: sqft / 9,
    netSqft: valid ? (n * (treadIn + riserIn + STAIR_CARPET.noseWrapIn) * widthIn) / 144 : 0,
    padSqft: valid ? (n * (treadIn + STAIR_CARPET.noseWrapIn) * widthIn) / 144 : 0,
  };
}

export interface CarpetInput {
  room: Rect | null;
  rollFt: number;
  orient: "auto" | RunAlong;
  trimIn: number;
  doors: number;
  doorWidthIn: number;
  pad: boolean;
  stairs: StairInput | null;
  laborPerSqft: number;
  stairLaborPerStep: number;
  removal: boolean;
}

export interface CarpetResult {
  netSqft: number;
  layout: CarpetLayout | null;
  stairs: CarpetStairsResult | null;
  orderSqft: number;
  orderSqyd: number;
  linearFt: number;
  /** % of purchased carpet that ends up as offcuts. */
  wastePct: number;
  padSqft: number;
  tackStripLf: number;
  doubledTackLf: number;
  carpetCost: number;
  padCost: number;
  materialsCost: number;
  roomLaborCost: number;
  stairLaborCost: number;
  laborCost: number;
  removalCost: number;
  warnings: string[];
}

export function computeCarpet(input: CarpetInput): CarpetResult {
  const room = input.room && rectArea(input.room) > 0 ? input.room : null;
  const netRoom = room ? rectArea(room) : 0;
  const layout = room
    ? input.orient === "auto"
      ? bestCarpetLayout(room.l, room.w, input.rollFt, input.trimIn)
      : carpetLayout(room.l, room.w, input.rollFt, input.orient, input.trimIn)
    : null;
  const st = input.stairs && input.stairs.steps > 0 ? carpetStairs(input.stairs.steps, input.stairs.widthIn, input.stairs.treadIn, input.stairs.riserIn, input.rollFt) : null;

  const orderSqft = (layout?.sqft ?? 0) + (st?.sqft ?? 0);
  const netSqft = netRoom + (st?.netSqft ?? 0);
  const padSqft = input.pad ? netRoom * CARPET.padAllowance + (st?.padSqft ?? 0) : 0;

  // Tack strip runs along every wall but never across door openings; walls over 30 ft get a second row.
  let tackStripLf = 0;
  let doubledTackLf = 0;
  if (room) {
    const openings = (Math.max(0, input.doors) * Math.max(0, input.doorWidthIn)) / 12;
    doubledTackLf = (room.l > CARPET.longStretchFt ? 2 * room.l : 0) + (room.w > CARPET.longStretchFt ? 2 * room.w : 0);
    tackStripLf = Math.max(0, rectPerimeter(room) - openings) + doubledTackLf;
  }

  const warnings: string[] = [];
  if (layout && layout.drops > 0 && layout.sideSlackIn < 3) {
    warnings.push("The room is as wide as the carpet across the drops, leaving almost no edge to trim at the side walls. Measure at several points — if a wall is out of square you may need an extra fill strip.");
  }
  if (layout && layout.seams > 0 && room) {
    const seamsRunLongWay = (layout.runAlong === "length" ? room.l : room.w) >= Math.max(room.l, room.w);
    warnings.push(
      seamsRunLongWay
        ? "Place the seam where traffic runs along it, not across it, and keep it out of doorways (CRI 105)."
        : "This cheapest layout puts the seam across the room's long way. CRI 105 prefers seams that run the length of the room, parallel to traffic — compare the options below.",
    );
  }
  if (st && input.stairs && input.stairs.widthIn + STAIR_CARPET.sideClearanceIn > input.rollFt * 12) {
    warnings.push("These stairs are wider than the roll, so each step needs a seam. Ask the installer about a wider roll.");
  }
  if (room && (room.l > CARPET.longStretchFt || room.w > CARPET.longStretchFt)) {
    warnings.push("Walls longer than 30 ft need architectural (3-row) tack strip or two rows of standard strip to hold the stretch (CRI 105).");
  }

  const carpetCost = orderSqft * CARPET.pricePerSqft;
  const padCost = padSqft * CARPET.padPerSqft;
  const roomLaborCost = netRoom * Math.max(0, input.laborPerSqft);
  const stairLaborCost = st ? st.steps * Math.max(0, input.stairLaborPerStep) : 0;
  return {
    netSqft,
    layout,
    stairs: st,
    orderSqft,
    orderSqyd: orderSqft / 9,
    linearFt: (layout?.linearFt ?? 0) + (st?.linearFt ?? 0),
    wastePct: orderSqft > 0 ? ((orderSqft - netSqft) / orderSqft) * 100 : 0,
    padSqft,
    tackStripLf,
    doubledTackLf,
    carpetCost,
    padCost,
    materialsCost: carpetCost + padCost,
    roomLaborCost,
    stairLaborCost,
    laborCost: roomLaborCost + stairLaborCost,
    removalCost: input.removal ? netRoom * CARPET.removalPerSqft : 0,
    warnings,
  };
}

/* ───────────────────────── baseboard ───────────────────────── */

/** Wall segments that get baseboard: 4 walls per room plus extra runs, with openings cut from the longest walls. */
export function wallSegments(rooms: Rect[], extraFt: number, deductionsFt: number[]): number[] {
  const walls = rooms.filter((r) => rectArea(r) > 0).flatMap((r) => [r.l, r.w, r.l, r.w]);
  if (extraFt > 0) walls.push(extraFt);
  for (const d of [...deductionsFt].filter((x) => x > 0).sort((a, b) => b - a)) {
    let longest = 0;
    for (let i = 1; i < walls.length; i++) if (walls[i] > walls[longest]) longest = i;
    if (walls.length) walls[longest] = Math.max(0, walls[longest] - d);
  }
  return walls.filter((x) => x > 1e-6);
}

export interface CutPlan {
  /** Pieces cut from each stick, feet. */
  sticks: number[][];
  splices: number;
}

/**
 * Walls longer than a stick take full sticks plus a scarf-joined remainder; the remaining pieces are
 * packed first-fit-decreasing so short walls never need a splice.
 */
export function packSticks(segments: number[], stockFt: number): CutPlan {
  const sticks: number[][] = [];
  const pieces: number[] = [];
  let splices = 0;
  if (stockFt <= 0) return { sticks, splices };
  for (const seg of segments) {
    let rest = seg;
    while (rest > stockFt + 1e-9) {
      sticks.push([stockFt]);
      rest -= stockFt;
      splices++;
    }
    if (rest > 1e-9) pieces.push(rest);
  }
  const free: number[] = sticks.map(() => 0);
  for (const piece of pieces.sort((a, b) => b - a)) {
    const i = free.findIndex((f) => f >= piece - 1e-9);
    if (i >= 0) {
      sticks[i].push(piece);
      free[i] -= piece;
    } else {
      sticks.push([piece]);
      free.push(stockFt - piece);
    }
  }
  return { sticks, splices };
}

export interface BaseboardInput {
  rooms: Rect[];
  extraFt: number;
  doors: number;
  doorWidthIn: number;
  skipFt: number;
  outsideCorners: number;
  stockFt: number;
  wastePct: number;
  heightIn: number;
  coats: number;
  quarterRound: boolean;
  paint: boolean;
  laborPerLf: number;
}

export interface BaseboardOption {
  stockFt: number;
  pieces: number;
  splices: number;
  offcutFt: number;
  cost: number;
}

export interface BaseboardResult {
  netLf: number;
  buyLf: number;
  pieces: number;
  plan: CutPlan;
  options: BaseboardOption[];
  insideCorners: number;
  outsideCorners: number;
  squareEnds: number;
  nails: number;
  caulkTubes: number;
  paintSqft: number;
  quarts: number;
  gallons: number;
  paintCost: number;
  qrPieces: number;
  baseCost: number;
  materialsCost: number;
  laborCost: number;
  warnings: string[];
}

/** Cheapest mix of gallons and quarts for a paint quantity. */
export function paintPlan(gallonsNeeded: number): { gallons: number; quarts: number; cost: number } {
  const q = ceilQty(gallonsNeeded * 4);
  let gallons = Math.floor(q / 4);
  let quarts = q % 4;
  if (quarts * BASEBOARD.quartPrice > BASEBOARD.gallonPrice) {
    gallons += 1;
    quarts = 0;
  }
  return { gallons, quarts, cost: gallons * BASEBOARD.gallonPrice + quarts * BASEBOARD.quartPrice };
}

function baseOption(segments: number[], netLf: number, stockFt: number, wastePct: number): BaseboardOption & { plan: CutPlan } {
  const plan = packSticks(segments, stockFt);
  const byLength = netLf > 0 ? ceilQty((netLf * (1 + wastePct / 100)) / stockFt) : 0;
  const pieces = Math.max(byLength, plan.sticks.length);
  return { stockFt, pieces, splices: plan.splices, offcutFt: pieces * stockFt - netLf, cost: pieces * stockFt * BASEBOARD.pricePerLf, plan };
}

export function computeBaseboard(input: BaseboardInput): BaseboardResult {
  const doors = Math.max(0, Math.round(input.doors));
  const doorFt = Math.max(0, input.doorWidthIn) / 12;
  const deductions = [...Array.from({ length: doors }, () => doorFt), Math.max(0, input.skipFt)];
  const segments = wallSegments(input.rooms, Math.max(0, input.extraFt), deductions);
  const netLf = segments.reduce((s, x) => s + x, 0);
  const wastePct = Math.max(0, input.wastePct);

  const options = BASEBOARD.stockFt.map((ft) => baseOption(segments, netLf, ft, wastePct));
  const chosen = options.find((o) => o.stockFt === input.stockFt) ?? baseOption(segments, netLf, input.stockFt, wastePct);

  const roomsWithArea = input.rooms.filter((r) => rectArea(r) > 0).length;
  const outsideCorners = Math.max(0, Math.round(input.outsideCorners));
  // Every outside corner on a closed wall line comes with one more inside corner.
  const insideCorners = netLf > 0 ? 4 * roomsWithArea + outsideCorners : 0;

  const studs = ceilQty((netLf * 12) / BASEBOARD.studSpacingIn);
  const caulkTubes = input.paint ? ceilQty(netLf / BASEBOARD.caulkLfPerTube) : 0;
  const paintSqft = input.paint ? (netLf * Math.max(0, input.heightIn)) / 12 : 0;
  const paint = paintPlan((paintSqft * Math.max(0, input.coats)) / BASEBOARD.paintSqftPerGal);
  const qrPieces = input.quarterRound ? stickPieces(netLf, QUARTER_ROUND.paint.lengthIn, BASEBOARD.wastePct) : 0;

  const baseCost = chosen.cost;
  const warnings: string[] = [];
  if (chosen.splices > 0) {
    warnings.push(`${chosen.splices} wall${chosen.splices === 1 ? " is" : "s are"} longer than a ${input.stockFt} ft stick. Join pieces with a 45° scarf joint over a stud, not a butt joint.`);
  }
  if (wastePct < 5 && netLf > 0) warnings.push("With almost no allowance, one bad cope or miter means another trip to the store.");

  return {
    netLf,
    buyLf: netLf * (1 + wastePct / 100),
    pieces: chosen.pieces,
    plan: chosen.plan,
    options: options.map((o) => ({ stockFt: o.stockFt, pieces: o.pieces, splices: o.splices, offcutFt: o.offcutFt, cost: o.cost })),
    insideCorners,
    outsideCorners,
    squareEnds: 2 * doors,
    nails: studs * BASEBOARD.nailsPerStud,
    caulkTubes,
    paintSqft,
    quarts: paint.quarts,
    gallons: paint.gallons,
    paintCost: input.paint ? paint.cost : 0,
    qrPieces,
    baseCost,
    materialsCost: baseCost + (input.paint ? caulkTubes * BASEBOARD.caulkPrice + paint.cost : 0) + qrPieces * QUARTER_ROUND.paint.price,
    laborCost: netLf * Math.max(0, input.laborPerLf),
    warnings,
  };
}
