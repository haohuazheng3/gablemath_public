// Pure concrete math shared by the client calculators and the server-rendered answers.

import { ceilQty, ceilTo } from "@/lib/format";
import { CUFT_PER_CUYD } from "@/lib/units";
import {
  BAG_YIELD_CUFT,
  BAGS_PER_PALLET,
  CONCRETE_LB_PER_CUFT,
  FORM_LUMBER,
  GRAVEL_BAG_CUFT,
  GRAVEL_BASE,
  IRC_FOOTING,
  IRC_STAIRS,
  POST_MIX_ROWS,
  POST_RULES,
  QUIKTUBE_TABLE,
  READY_MIX,
  REBAR,
  SONOCO_4FT,
  TUBE_RULES,
  product,
  type BagSize,
  type ProductId,
} from "./data";

const CUIN_PER_CUFT = 1728;

export interface Section {
  shape: "rect" | "circle";
  /** feet — length, or diameter for circles */
  l: number;
  /** feet — width (ignored for circles) */
  w: number;
}

export function sectionArea(s: Section): number {
  if (s.l <= 0) return 0;
  if (s.shape === "circle") return Math.PI * (s.l / 2) ** 2;
  return s.w > 0 ? s.l * s.w : 0;
}

export function sectionPerimeter(s: Section): number {
  if (s.shape === "circle") return Math.PI * s.l;
  return 2 * (s.l + s.w);
}

/** Area of a circle from its diameter (any unit, squared). */
export function circleArea(dia: number): number {
  return dia > 0 ? Math.PI * (dia / 2) ** 2 : 0;
}

/** Bags of a given size for a volume, waste included, always rounded up to whole bags. */
export function bagsFor(cuft: number, size: BagSize, wastePct: number): number {
  return ceilQty((cuft * (1 + wastePct / 100)) / BAG_YIELD_CUFT[size]);
}

export interface ReadyMixFees {
  pricePerYd: number;
  shortLoadUnderYd: number;
  shortLoadFee: number;
  deliveryFee: number;
  fuelFee: number;
}

export const DEFAULT_FEES: ReadyMixFees = {
  pricePerYd: READY_MIX.pricePerYd,
  shortLoadUnderYd: READY_MIX.shortLoadUnderYd,
  shortLoadFee: READY_MIX.shortLoadFee,
  deliveryFee: READY_MIX.deliveryFee,
  fuelFee: READY_MIX.fuelFee,
};

export function readyMixOrderYd(cuydWithWaste: number): number {
  if (cuydWithWaste <= 0) return 0;
  return Math.max(READY_MIX.minOrderYd, ceilTo(cuydWithWaste, READY_MIX.orderIncrementYd));
}

export function readyMixCost(orderYd: number, fees: ReadyMixFees): number {
  if (orderYd <= 0) return 0;
  const trucks = Math.ceil(orderYd / READY_MIX.truckCapacityYd);
  return (
    orderYd * fees.pricePerYd +
    (orderYd < fees.shortLoadUnderYd ? fees.shortLoadFee : 0) +
    trucks * (fees.deliveryFee + fees.fuelFee)
  );
}

export function bagPrice(productId: string, size: BagSize, count: number): number | undefined {
  const p = product(productId);
  const bulk = p.bulkPrice?.[size];
  const pallet = BAGS_PER_PALLET[size];
  if (bulk != null && pallet != null && count >= pallet) return bulk;
  return p.price[size];
}

/* ───────── one concrete order: bags of every size, ready-mix, break-even ───────── */

export interface BagOption {
  size: BagSize;
  bags: number;
  price?: number;
  cost?: number;
}

export interface OrderInput {
  productId: string;
  bagSize: BagSize;
  wastePct: number;
  fees?: ReadyMixFees;
}

export interface ConcreteOrder {
  cuftNet: number;
  cuydNet: number;
  cuftWithWaste: number;
  cuydWithWaste: number;
  wastePct: number;
  bags: number;
  bagSize: BagSize;
  bagsBySize: BagOption[];
  weightLb: number;
  pallets: number;
  waterGal: [number, number];
  bagCost?: number;
  readyMixYd: number;
  readyMixCost: number;
  /** smallest volume (yd³, waste included) at which ready-mix beats bags at these prices */
  breakEvenYd?: number;
  cheaper: "bags" | "ready-mix" | "unknown";
  /** finished weight of the placed concrete */
  concreteWeightLb: number;
}

/** Bags needed in every size the product is sold in, with prices (pallet tier applied). */
export function bagOptions(productId: string, cuftNet: number, wastePct: number): BagOption[] {
  const p = product(productId);
  return p.sizes.map((size) => {
    const bags = bagsFor(cuftNet, size, wastePct);
    const price = bagPrice(p.id, size, bags);
    return { size, bags, price, cost: price != null ? price * bags : undefined };
  });
}

// Break-even: the smallest order (waste included) where a truck costs less than the same
// volume in bags of the selected size, bulk tier applied.
function findBreakEvenYd(productId: string, size: BagSize, fees: ReadyMixFees, fallbackPrice: number): number | undefined {
  for (let yd = 0.25; yd <= 12; yd += 0.25) {
    const n = ceilQty((yd * CUFT_PER_CUYD) / BAG_YIELD_CUFT[size]);
    const bagC = n * (bagPrice(productId, size, n) ?? fallbackPrice);
    if (readyMixCost(readyMixOrderYd(yd), fees) < bagC) return yd;
  }
  return undefined;
}

export function concreteOrder(cuftNet: number, input: OrderInput): ConcreteOrder {
  const fees = input.fees ?? DEFAULT_FEES;
  const p = product(input.productId);
  const size: BagSize = p.sizes.includes(input.bagSize) ? input.bagSize : p.sizes[p.sizes.length - 1];
  const net = Math.max(0, cuftNet);
  const waste = Math.max(0, input.wastePct);
  const cuftWithWaste = net * (1 + waste / 100);
  const cuydWithWaste = cuftWithWaste / CUFT_PER_CUYD;

  const bags = bagsFor(net, size, waste);
  const unitPrice = bagPrice(p.id, size, bags);
  const bagCost = unitPrice != null ? unitPrice * bags : undefined;
  const perPallet = BAGS_PER_PALLET[size];
  const waterScale = size / p.waterPerLb;
  const readyMixYd = readyMixOrderYd(cuydWithWaste);
  const rmCost = readyMixCost(readyMixYd, fees);

  return {
    cuftNet: net,
    cuydNet: net / CUFT_PER_CUYD,
    cuftWithWaste,
    cuydWithWaste,
    wastePct: waste,
    bags,
    bagSize: size,
    bagsBySize: bagOptions(p.id, net, waste),
    weightLb: bags * size,
    pallets: perPallet ? bags / perPallet : 0,
    waterGal: [p.waterGal[0] * waterScale * bags, p.waterGal[1] * waterScale * bags],
    bagCost,
    readyMixYd,
    readyMixCost: rmCost,
    breakEvenYd: unitPrice != null ? findBreakEvenYd(p.id, size, fees, unitPrice) : undefined,
    cheaper: bagCost == null ? "unknown" : rmCost < bagCost ? "ready-mix" : "bags",
    concreteWeightLb: net * CONCRETE_LB_PER_CUFT,
  };
}

/** Warnings every bagged pour shares. `mixed` = the bags go through a mixer (not dry-poured into a post hole). */
export function orderWarnings(o: ConcreteOrder, productId: string, mixed = true): string[] {
  const warnings: string[] = [];
  if (o.wastePct < 5) warnings.push("With little or no overage you risk running short mid-pour, which leaves a weak cold joint. Most pros add 10% for bags.");
  if (mixed && productId === "fast" && o.bags > 6) warnings.push("Fast-Setting mix stiffens in about 20 minutes — mix only what you can place and finish in that time, one or two bags per batch.");
  if (o.weightLb > 1500) warnings.push(`That's ${Math.round((o.weightLb / 2000) * 10) / 10} tons of bags — more than most pickups can carry in one trip. Ask about store delivery.`);
  return warnings;
}

/* ───────── shared extras ───────── */

export interface GravelBase {
  cuydCompacted: number;
  cuydLoose: number;
  tons: number;
  cost: number;
}

/** Compacted gravel base under a footprint that already includes the 6 in overhang on each side. */
export function gravelBaseFor(baseAreaSqFt: number): GravelBase {
  const cuydCompacted = (baseAreaSqFt * (GRAVEL_BASE.depthIn / 12)) / CUFT_PER_CUYD;
  const cuydLoose = cuydCompacted * GRAVEL_BASE.compaction;
  const tons = cuydLoose * GRAVEL_BASE.tonsPerYdLoose;
  return { cuydCompacted, cuydLoose, tons, cost: tons * GRAVEL_BASE.pricePerTon };
}

/** Smallest dimensional board that is at least as tall as the pour (2×12s are stacked beyond 11¼ in). */
export function formLumberFor(heightIn: number): string {
  const fit = FORM_LUMBER.find((b) => b.heightIn >= heightIn - 1e-9);
  if (fit) return fit.name;
  const tallest = FORM_LUMBER[FORM_LUMBER.length - 1];
  return `${Math.ceil(heightIn / tallest.heightIn - 1e-9)} rows of ${tallest.name}`;
}

/**
 * Chair height that keeps the bar centre between mid-depth and the upper third of the slab (IRC R506.2.4),
 * rounded up to the next ½ in: 2 in for a 4 in slab, 2½ in at 5 in, 3 in at 6 in.
 */
export function chairHeightIn(slabIn: number, barDiaIn: number): number {
  const lowest = slabIn / 2 - barDiaIn / 2;
  return Math.max(0.5, Math.ceil(lowest * 2 - 1e-9) / 2);
}

/* ───────── slabs ───────── */

export interface SlabInput {
  sections: Section[];
  thicknessIn: number;
  wastePct: number;
  productId: string;
  bagSize: BagSize;
  /** number of identical slabs/pads */
  count: number;
  rebar: "none" | "patio" | "driveway";
  gravelBase: boolean;
  fees?: ReadyMixFees;
}

export interface SlabResult extends ConcreteOrder {
  areaSqFt: number;
  perimeterFt: number;
  gravel?: GravelBase;
  forms: { boards8ft: number; stakes: number; lumber: string };
  rebarPlan?: { size: string; spacingIn: number; linearFt: number; sticks: number; chairs: number; chairIn: number };
  warnings: string[];
}

export function computeSlab(input: SlabInput): SlabResult {
  const count = Math.max(1, Math.round(input.count || 1));
  const area1 = input.sections.reduce((s, x) => s + sectionArea(x), 0);
  const perim1 = input.sections.reduce((s, x) => s + (sectionArea(x) > 0 ? sectionPerimeter(x) : 0), 0);
  const areaSqFt = area1 * count;
  const perimeterFt = perim1 * count;
  const t = Math.max(0, input.thicknessIn);
  const order = concreteOrder(areaSqFt * (t / 12), input);

  let gravel: GravelBase | undefined;
  if (input.gravelBase && areaSqFt > 0) {
    const ext = (GRAVEL_BASE.extendIn / 12) * 2;
    const baseArea =
      input.sections.reduce((s, x) => {
        if (sectionArea(x) <= 0) return s;
        if (x.shape === "circle") return s + Math.PI * ((x.l + ext) / 2) ** 2;
        return s + (x.l + ext) * (x.w + ext);
      }, 0) * count;
    gravel = gravelBaseFor(baseArea);
  }

  const forms = {
    boards8ft: perimeterFt > 0 ? ceilQty(perimeterFt / 8) : 0,
    stakes: perimeterFt > 0 ? ceilQty(perimeterFt / 3) + 4 * count : 0,
    lumber: formLumberFor(t),
  };

  let rebarPlan: SlabResult["rebarPlan"];
  if (input.rebar !== "none" && areaSqFt > 0) {
    const spec = REBAR[input.rebar];
    const sp = spec.spacingIn / 12;
    let linear = 0;
    for (const s of input.sections) {
      if (sectionArea(s) <= 0) continue;
      const L = s.l;
      const W = s.shape === "circle" ? s.l : s.w;
      const edge = 0.25; // 3 in clear cover at each edge
      const runsAlongL = Math.floor((W - 2 * edge) / sp) + 1;
      const runsAlongW = Math.floor((L - 2 * edge) / sp) + 1;
      let len = runsAlongL * (L - 2 * edge) + runsAlongW * (W - 2 * edge);
      if (s.shape === "circle") len *= Math.PI / 4;
      linear += Math.max(0, len);
    }
    linear *= count * REBAR.lapFactor;
    rebarPlan = {
      size: spec.size,
      spacingIn: spec.spacingIn,
      linearFt: linear,
      sticks: ceilQty(linear / REBAR.stickLengthFt),
      chairs: ceilQty(areaSqFt * REBAR.chairsPerSqFt),
      chairIn: chairHeightIn(t, spec.diaIn),
    };
  }

  const warnings: string[] = [];
  if (t > 0 && t < 2) warnings.push("Bagged concrete needs at least 2 in of depth; under that, use a topping or resurfacer instead.");
  else if (t > 0 && t < 3.5) warnings.push("Slabs on ground should be at least 3.5 in thick (IRC R506.1). Thinner slabs crack under load.");
  warnings.push(...orderWarnings(order, input.productId));

  return { ...order, areaSqFt, perimeterFt, gravel, forms, rebarPlan, warnings };
}

/* ───────── post holes ───────── */

export type PostBase = "gravel" | "drymix" | "none";

export interface PostHoleInput extends OrderInput {
  postShape: "rect" | "round";
  /** post width in inches (diameter for round posts) */
  postWIn: number;
  /** post depth in inches (ignored for round posts) */
  postDIn: number;
  holeDiaIn: number;
  /** visible post height above grade, inches */
  aboveGroundIn: number;
  /** how far the post goes into the ground, inches */
  embedIn: number;
  base: PostBase;
  baseIn: number;
  /** soil cap: concrete stops this far below grade */
  capIn: number;
  count: number;
}

export interface PostMixRow {
  productId: ProductId;
  size: BagSize;
  /** bags per post, unrounded and without waste */
  perPost: number;
  /** bags for the whole job, waste included */
  total: number;
  cost?: number;
}

export interface PostHoleResult {
  postAreaSqIn: number;
  holeDiaIn: number;
  holeDepthIn: number;
  postLengthIn: number;
  concreteDepthIn: number;
  cuftPerPost: number;
  /** selected bag size, unrounded and without waste */
  bagsPerPost: number;
  /** whole bags if each hole is filled from its own bags, waste included */
  bagsPerHoleRounded: number;
  /** whole bags if the entire hole were filled with concrete — how bag labels and Quikrete's calculator count */
  fullDepthBagsPerPost: number;
  order: ConcreteOrder;
  mixes: PostMixRow[];
  gravelCuft: number;
  gravelBags: number;
  soilCuft: number;
  dryPour: boolean;
  /** gallons: ~1 gal per 50 lb when dry-poured, else the product's start–max mixing water */
  waterGal: [number, number];
  /** dry-pour lifts of ≤ 30 in (Fast-Setting) */
  lifts: number;
  warnings: string[];
}

export function postAreaSqIn(shape: "rect" | "round", wIn: number, dIn: number): number {
  return shape === "round" ? circleArea(wIn) : Math.max(0, wIn) * Math.max(0, dIn);
}

/** Concrete in one hole (cu ft): the ring around the post, plus a dry-mix bottom layer when used. */
export function postHoleCuft(holeDiaIn: number, postAreaIn2: number, concreteDepthIn: number, dryMixBaseIn = 0): number {
  const hole = circleArea(holeDiaIn);
  const ring = Math.max(0, hole - postAreaIn2) * Math.max(0, concreteDepthIn);
  return (ring + hole * Math.max(0, dryMixBaseIn)) / CUIN_PER_CUFT;
}

/** Quikrete's online post calculator: round post, hole filled to the top, 50 lb Fast-Setting, no waste. */
export function quikreteCalcBags(postDiaIn: number, holeDiaIn: number, depthIn: number): number {
  return ceilQty(postHoleCuft(holeDiaIn, circleArea(postDiaIn), depthIn) / BAG_YIELD_CUFT[50]);
}

export function computePostHoles(input: PostHoleInput): PostHoleResult {
  const count = Math.max(1, Math.round(input.count || 1));
  const p = product(input.productId);
  const postArea = postAreaSqIn(input.postShape, input.postWIn, input.postDIn);
  const postWidest = input.postShape === "round" ? input.postWIn : Math.max(input.postWIn, input.postDIn);
  const holeDiaIn = Math.max(0, input.holeDiaIn);
  const embedIn = Math.max(0, input.embedIn);
  const baseIn = input.base === "none" ? 0 : Math.max(0, input.baseIn);
  const capIn = Math.max(0, input.capIn);
  const concreteDepthIn = Math.max(0, embedIn - capIn);
  const dryMixIn = input.base === "drymix" ? baseIn : 0;

  const cuftPerPost = postHoleCuft(holeDiaIn, postArea, concreteDepthIn, dryMixIn);
  const totalCuft = cuftPerPost * count;
  const order = concreteOrder(totalCuft, input);
  const size = order.bagSize;
  const dryPour = p.id === "fast";
  const dryPourGal = order.bags * (size / 50) * POST_RULES.dryPourGalPer50Lb;

  const mixes: PostMixRow[] = POST_MIX_ROWS.map(({ productId, size: sz }) => {
    const total = bagsFor(totalCuft, sz, order.wastePct);
    const price = bagPrice(productId, sz, total);
    return { productId, size: sz, perPost: cuftPerPost / BAG_YIELD_CUFT[sz], total, cost: price != null ? price * total : undefined };
  });

  const gravelCuft = input.base === "gravel" ? (circleArea(holeDiaIn) * baseIn * count) / CUIN_PER_CUFT : 0;
  const holeDepthIn = embedIn + baseIn;

  const warnings: string[] = [];
  if (concreteDepthIn <= 0) warnings.push("The soil cap is as deep as the post is buried, so there is nothing left to fill with concrete. Bury the post deeper or reduce the cap.");
  if (input.aboveGroundIn > 0 && embedIn < input.aboveGroundIn * POST_RULES.embedPerAboveGround - 0.5)
    warnings.push(
      `Quikrete and Sakrete bury a third of the post's overall length — ${fmtIn(input.aboveGroundIn * POST_RULES.embedPerAboveGround)} for ${fmtIn(input.aboveGroundIn)} above ground.`,
    );
  if (postWidest > 0 && holeDiaIn > 0 && holeDiaIn < postWidest * POST_RULES.holeTimesPost - 0.5)
    warnings.push(
      `Quikrete and Sakrete size the hole at about 3× the post width (${fmtIn(postWidest * POST_RULES.holeTimesPost)} here). A narrower hole uses less concrete but gives the post less grip.`,
    );
  if (holeDiaIn > 0 && holeDiaIn <= postWidest) warnings.push("The hole is no wider than the post, so there is no room for concrete around it.");
  if (dryPour && concreteDepthIn > POST_RULES.maxLiftIn)
    warnings.push(`Pour this ${fmtIn(concreteDepthIn)} column in ${Math.ceil(concreteDepthIn / POST_RULES.maxLiftIn - 1e-9)} lifts: fill no more than 30 in of dry mix, soak it, let the water sink in, then add the rest (Quikrete Fast-Setting instructions).`);
  warnings.push(...orderWarnings(order, p.id, !dryPour));

  return {
    postAreaSqIn: postArea,
    holeDiaIn,
    holeDepthIn,
    postLengthIn: input.aboveGroundIn + embedIn,
    concreteDepthIn,
    cuftPerPost,
    bagsPerPost: cuftPerPost / BAG_YIELD_CUFT[size],
    bagsPerHoleRounded: bagsFor(cuftPerPost, size, order.wastePct),
    fullDepthBagsPerPost: ceilQty(postHoleCuft(holeDiaIn, postArea, holeDepthIn) / BAG_YIELD_CUFT[size]),
    order,
    mixes,
    gravelCuft,
    gravelBags: ceilQty(gravelCuft / GRAVEL_BAG_CUFT),
    soilCuft: (circleArea(holeDiaIn) * holeDepthIn * count) / CUIN_PER_CUFT,
    dryPour,
    waterGal: dryPour ? [dryPourGal, dryPourGal] : order.waterGal,
    lifts: dryPour && concreteDepthIn > 0 ? Math.ceil(concreteDepthIn / POST_RULES.maxLiftIn - 1e-9) : 1,
    warnings,
  };
}

function fmtIn(inches: number): string {
  const r = Math.round(inches * 4) / 4;
  return `${Number.isInteger(r) ? r : r.toFixed(2).replace(/0$/, "")} in`;
}

/* ───────── footings ───────── */

export interface FootingInput extends OrderInput {
  kind: "wall" | "pad";
  lengthFt: number;
  widthIn: number;
  thickIn: number;
  /** width of the wall or block that sits on the footing (0 = skip the projection check) */
  wallIn: number;
  /** continuous #4 bars along the footing */
  bars: number;
  padCount: number;
  padLengthIn: number;
  padWidthIn: number;
  padThickIn: number;
  forms: boolean;
}

export interface FootingResult {
  order: ConcreteOrder;
  /** cu ft per linear foot (wall) or per pad */
  cuftPerUnit: number;
  rebar?: { bars: number; linearFt: number; sticks: number; weightLb: number; cost: number };
  forms?: { linearFt: number; lumber: string; boards8ft: number; stakes: number };
  projectionIn?: number;
  warnings: string[];
}

export function computeFooting(input: FootingInput): FootingResult {
  const wall = input.kind === "wall";
  const pads = Math.max(1, Math.round(input.padCount || 1));
  const cuftPerUnit = wall
    ? (Math.max(0, input.widthIn) * Math.max(0, input.thickIn)) / 144
    : (Math.max(0, input.padLengthIn) * Math.max(0, input.padWidthIn) * Math.max(0, input.padThickIn)) / CUIN_PER_CUFT;
  const cuftNet = wall ? cuftPerUnit * Math.max(0, input.lengthFt) : cuftPerUnit * pads;
  const order = concreteOrder(cuftNet, input);

  let rebar: FootingResult["rebar"];
  const bars = Math.max(0, Math.round(input.bars));
  if (wall && bars > 0 && input.lengthFt > 0) {
    const linearFt = input.lengthFt * bars * REBAR.lapFactor;
    const sticks = ceilQty(linearFt / REBAR.stickLengthFt);
    rebar = { bars, linearFt, sticks, weightLb: linearFt * IRC_FOOTING.barLbPerFt, cost: sticks * REBAR.pricePerStick["#4"] };
  }

  let forms: FootingResult["forms"];
  if (input.forms && cuftNet > 0) {
    const linearFt = wall ? 2 * input.lengthFt : (pads * 2 * (input.padLengthIn + input.padWidthIn)) / 12;
    forms = {
      linearFt,
      lumber: formLumberFor(wall ? input.thickIn : input.padThickIn),
      boards8ft: ceilQty(linearFt / 8),
      stakes: ceilQty(linearFt / 3) + (wall ? 0 : 4 * pads),
    };
  }

  const warnings: string[] = [];
  let projectionIn: number | undefined;
  if (wall) {
    if (input.widthIn < IRC_FOOTING.minWidthIn || input.thickIn < IRC_FOOTING.minThickIn)
      warnings.push("That is smaller than the IRC minimum footing of 12 in wide × 6 in thick (R403.1.1). Weak soil or a heavier building needs more — see the width table below.");
    if (input.wallIn > 0) {
      projectionIn = (input.widthIn - input.wallIn) / 2;
      if (projectionIn < IRC_FOOTING.minProjectionIn)
        warnings.push(`The footing should stick out at least 2 in past each face of the wall (IRC R403.1.1); here it projects ${fmtIn(Math.max(0, projectionIn))}. Widen it to ${fmtIn(input.wallIn + 4)} or more.`);
      else if (projectionIn > input.thickIn)
        warnings.push(`IRC R403.1.1 limits the projection to the footing thickness. A ${fmtIn(projectionIn)} projection needs a footing at least ${fmtIn(projectionIn)} thick.`);
    }
  } else if (input.padThickIn < IRC_FOOTING.minThickIn) {
    warnings.push("Footings should be at least 6 in thick (IRC R403.1.1). Deck footings are sized by IRC Table R507.3.1.");
  }
  warnings.push(...orderWarnings(order, input.productId));

  return { order, cuftPerUnit, rebar, forms, projectionIn, warnings };
}

/* ───────── round columns (Sonotube / Quik-Tube) ───────── */

export interface ColumnInput extends OrderInput {
  diaIn: number;
  /** concrete height inside the tube, feet */
  lengthFt: number;
  aboveGradeIn: number;
  count: number;
  /** footing poured under the tube: thickness in inches (0 = none) */
  footingIn: number;
  /** footing diameter (0 = the hole, 2× the tube) */
  footingDiaIn: number;
}

export interface ColumnResult {
  tubeCuft: number;
  footingCuft: number;
  footingDiaIn: number;
  holeDiaIn: number;
  cuftPerColumn: number;
  /** bags per column by size: unrounded, and whole bags without waste (what tube tables print) */
  perColumn: { size: BagSize; exact: number; whole: number }[];
  order: ConcreteOrder;
  quikTube?: Record<60 | 80, number>;
  sonoco?: Record<60 | 80, number>;
  tubes: { lengthFt: number; buy: number; perTube: number };
  belowGradeIn: number;
  gravelCuft: number;
  warnings: string[];
}

export function tubeCuftPerFt(diaIn: number): number {
  return circleArea(diaIn) / 144;
}

export function computeColumns(input: ColumnInput): ColumnResult {
  const count = Math.max(1, Math.round(input.count || 1));
  const p = product(input.productId);
  const dia = Math.max(0, input.diaIn);
  const len = Math.max(0, input.lengthFt);
  const holeDiaIn = dia * TUBE_RULES.holeTimesDia;
  const footingIn = Math.max(0, input.footingIn);
  const footingDiaIn = footingIn > 0 ? (input.footingDiaIn > 0 ? input.footingDiaIn : holeDiaIn) : 0;

  const tubeCuft = tubeCuftPerFt(dia) * len;
  const footingCuft = (circleArea(footingDiaIn) * footingIn) / CUIN_PER_CUFT;
  const cuftPerColumn = tubeCuft + footingCuft;
  const order = concreteOrder(cuftPerColumn * count, input);

  const perColumn = p.sizes.map((size) => ({
    size,
    exact: cuftPerColumn / BAG_YIELD_CUFT[size],
    whole: ceilQty(cuftPerColumn / BAG_YIELD_CUFT[size]),
  }));

  const ft = Math.round(len);
  const qt = QUIKTUBE_TABLE[dia];
  const quikTube = qt && Math.abs(len - ft) < 1e-9 && ft >= 1 && ft <= 4 ? { 60: qt[60][ft - 1], 80: qt[80][ft - 1] } : undefined;
  const sonoco = Math.abs(len - TUBE_RULES.stockLengthFt) < 1e-9 ? SONOCO_4FT[dia] : undefined;

  const stock = len <= TUBE_RULES.stockLengthFt ? TUBE_RULES.stockLengthFt : len <= TUBE_RULES.longLengthFt ? TUBE_RULES.longLengthFt : len;
  const perTube = len > 0 ? Math.max(1, Math.floor(stock / len + 1e-9)) : 1;
  const tubes = { lengthFt: stock, buy: len > 0 ? Math.ceil(count / perTube) : 0, perTube };

  const belowGradeIn = len * 12 - Math.max(0, input.aboveGradeIn) + footingIn;
  const gravelCuft = footingIn > 0 ? (circleArea(holeDiaIn) * TUBE_RULES.gravelIn * count) / CUIN_PER_CUFT : 0;

  const warnings: string[] = [];
  const aboveFt = input.aboveGradeIn / 12;
  if (aboveFt > TUBE_RULES.maxAboveGradeFt)
    warnings.push("Builder's-grade tubes (Sonotube Builder's Tube, Quik-Tube) are rated for use below grade and up to 3 ft above it. Taller exposed columns need a heavier-wall form.");
  else if (aboveFt >= TUBE_RULES.braceAboveFt)
    warnings.push("With 2 ft or more of tube above ground, brace it with a wood collar or frame and side braces so it stays plumb while you fill it (Quik-Tube instructions).");
  if (len > 0 && belowGradeIn < IRC_FOOTING.minDepthBelowGradeIn)
    warnings.push("Footings must sit at least 12 in below undisturbed ground (IRC R403.1.4; R507.3.2 for decks) and below your local frost depth.");
  if (footingIn > 0 && footingDiaIn <= dia) warnings.push("The footing should be wider than the tube so the column bears on it fully.");
  warnings.push(...orderWarnings(order, p.id));

  return { tubeCuft, footingCuft, footingDiaIn, holeDiaIn, cuftPerColumn, perColumn, order, quikTube, sonoco, tubes, belowGradeIn, gravelCuft, warnings };
}

/* ───────── steps ───────── */

export type StepsTop = "landing" | "existing";

export interface StepsInput extends OrderInput {
  /** number of step-ups (risers), counting the last one onto the landing or porch */
  steps: number;
  riseIn: number;
  runIn: number;
  widthFt: number;
  top: StepsTop;
  landingIn: number;
  gravelBase: boolean;
}

/**
 * Side profile area of solid steps on grade, square inches. Step i is a block i·R tall and D deep.
 * With a new landing of depth P on top: R·D·(n−1)n/2 + n·R·P. Up to an existing porch the last
 * riser is the porch itself: R·D·(n−1)n/2.
 */
export function stairCrossSectionSqIn(n: number, riseIn: number, runIn: number, top: StepsTop, landingIn: number): number {
  if (n < 1 || riseIn <= 0 || runIn <= 0) return 0;
  const treads = (riseIn * runIn * (n - 1) * n) / 2;
  return top === "landing" ? treads + n * riseIn * Math.max(landingIn, 0) : treads;
}

/** Fewest equal risers that keep each one at or under the code maximum. */
export function stepsForRise(totalRiseIn: number, maxRiserIn: number = IRC_STAIRS.maxRiserIn): { steps: number; riseIn: number } {
  if (totalRiseIn <= 0) return { steps: 0, riseIn: 0 };
  const steps = Math.max(1, Math.ceil(totalRiseIn / maxRiserIn - 1e-9));
  return { steps, riseIn: totalRiseIn / steps };
}

export interface StepsResult {
  crossSectionSqIn: number;
  order: ConcreteOrder;
  landingCuft: number;
  totalRiseIn: number;
  /** height of the concrete itself (one riser less when stepping onto an existing porch) */
  concreteHeightIn: number;
  runLengthIn: number;
  footprintSqFt: number;
  forms: { risers: number; riserLumber: string; widthFt: number; sideLengthIn: number; sideHeightIn: number; plywoodSheets: number };
  gravel?: GravelBase;
  checks: { riserOk: boolean; treadOk: boolean; nosingNeeded: boolean; handrail: boolean; guard: boolean; landingOk: boolean | null };
  warnings: string[];
}

export function computeSteps(input: StepsInput): StepsResult {
  const n = Math.max(0, Math.round(input.steps));
  const R = Math.max(0, input.riseIn);
  const D = Math.max(0, input.runIn);
  const W = Math.max(0, input.widthFt);
  const landing = input.top === "landing";
  const P = landing ? Math.max(0, input.landingIn) : 0;

  const crossSectionSqIn = stairCrossSectionSqIn(n, R, D, input.top, P);
  const order = concreteOrder((crossSectionSqIn / 144) * W, input);
  const landingCuft = landing && n > 0 ? ((n * R * P) / 144) * W : 0;
  const treadsInConcrete = Math.max(0, n - 1);
  const runLengthIn = treadsInConcrete * D + P;
  const concreteHeightIn = (landing ? n : treadsInConcrete) * R;
  const footprintSqFt = (runLengthIn / 12) * W;

  const ext = (GRAVEL_BASE.extendIn / 12) * 2;
  const gravel = input.gravelBase && footprintSqFt > 0 ? gravelBaseFor((runLengthIn / 12 + ext) * (W + ext)) : undefined;

  const forms = {
    risers: landing ? n : treadsInConcrete,
    riserLumber: formLumberFor(R),
    widthFt: W,
    sideLengthIn: runLengthIn,
    sideHeightIn: concreteHeightIn,
    plywoodSheets: runLengthIn > 0 && concreteHeightIn > 0 ? 2 * Math.ceil(runLengthIn / 96 - 1e-9) * Math.ceil(concreteHeightIn / 48 - 1e-9) : 0,
  };

  const checks = {
    riserOk: R <= IRC_STAIRS.maxRiserIn + 1e-9,
    treadOk: D >= IRC_STAIRS.minTreadIn - 1e-9,
    nosingNeeded: D < IRC_STAIRS.noNosingTreadIn - 1e-9,
    handrail: n >= IRC_STAIRS.handrailRisers,
    guard: landing && concreteHeightIn > IRC_STAIRS.guardAboveIn,
    landingOk: landing ? P >= IRC_STAIRS.landingMinIn - 1e-9 : null,
  };

  const warnings: string[] = [];
  if (n > 0 && !landing && n < 2) warnings.push("One step-up onto an existing porch needs no concrete steps — the porch edge is the step.");
  if (!checks.riserOk) {
    const fix = stepsForRise(n * R);
    warnings.push(`Risers over 7¾ in don't meet IRC R311.7.5.1. Use ${fix.steps} steps of ${fmtIn(fix.riseIn)} for this ${fmtIn(n * R)} rise.`);
  }
  if (!checks.treadOk) warnings.push("Treads must be at least 10 in deep (IRC R311.7.5.2).");
  else if (checks.nosingNeeded) warnings.push("Treads under 11 in need a ¾–1¼ in nosing (IRC R311.7.5.3), which is hard to form in concrete. Most concrete steps use 11–12 in treads instead.");
  if (checks.landingOk === false) warnings.push("A landing at an exterior door must be at least 36 in deep in the direction of travel and as wide as the door (IRC R311.3).");
  if (checks.handrail) warnings.push("Four or more risers need a handrail 34–38 in high on at least one side (IRC R311.7.8). Set anchors or sleeves while the concrete is wet.");
  if (checks.guard) warnings.push("The landing is more than 30 in above grade, so its open sides need a guard at least 36 in high (IRC R312.1).");
  warnings.push(...orderWarnings(order, input.productId));

  return { crossSectionSqIn, order, landingCuft, totalRiseIn: n * R, concreteHeightIn, runLengthIn, footprintSqFt, forms, gravel, checks, warnings };
}
