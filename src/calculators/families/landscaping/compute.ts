// Pure landscaping math shared by the client calculators and the server-rendered answers.

import { ceilQty } from "@/lib/format";
import { CUFT_PER_CUYD, LB_PER_SHORT_TON } from "@/lib/units";
import {
  MAX_LIFT_IN,
  MULCH_MAX_TOTAL_IN,
  PAVER,
  PLAY_MAINTAIN_IN,
  PLAY_USE_ZONE_FT,
  SAND_RANGE,
  SOIL_BAG_SIZES,
  SOIL_IN_PLACE_TONS_PER_YD,
  SQFT_PER_CUYD_AT_1IN,
  TREE_RING,
  TRUCK,
  aggregate,
  mulchType,
  soilType,
  type GravelId,
  type MulchId,
  type SoilId,
} from "./data";

/* ───────────────────────── areas ───────────────────────── */

export type Area =
  | { shape: "rect"; l: number; w: number }
  | { shape: "circle"; d: number }
  /** Tree ring: outer diameter in ft, trunk diameter in inches; mulch stops a gap short of the bark. */
  | { shape: "ring"; d: number; trunkIn: number }
  | { shape: "sqft"; sqft: number };

/** Radius (ft) of the bare circle left around a trunk: half the trunk plus the recommended gap. */
export function ringInnerRadiusFt(trunkIn: number): number {
  return (Math.max(0, trunkIn) / 2 + TREE_RING.gapIn) / 12;
}

export function areaOf(a: Area): number {
  switch (a.shape) {
    case "rect":
      return a.l > 0 && a.w > 0 ? a.l * a.w : 0;
    case "circle":
      return a.d > 0 ? Math.PI * (a.d / 2) ** 2 : 0;
    case "ring": {
      const R = a.d / 2;
      const r = ringInnerRadiusFt(a.trunkIn);
      return R > r ? Math.PI * (R * R - r * r) : 0;
    }
    case "sqft":
      return Math.max(0, a.sqft);
  }
}

/** Edge length in ft; 0 when only the square footage is known. */
export function perimeterOf(a: Area): number {
  if (areaOf(a) <= 0) return 0;
  switch (a.shape) {
    case "rect":
      return 2 * (a.l + a.w);
    case "circle":
    case "ring":
      return Math.PI * a.d;
    case "sqft":
      return 0;
  }
}

/**
 * Footprint grown by `ft` on every side (base past the paver edge, playground use zone).
 * An area typed in as square feet is treated as a square, since its edges are unknown.
 */
export function grownArea(a: Area, ft: number): number {
  const area = areaOf(a);
  if (area <= 0) return 0;
  switch (a.shape) {
    case "rect":
      return (a.l + 2 * ft) * (a.w + 2 * ft);
    case "circle":
    case "ring":
      return Math.PI * (a.d / 2 + ft) ** 2;
    case "sqft":
      return (Math.sqrt(area) + 2 * ft) ** 2;
  }
}

function copies(count: number): number {
  return Math.max(1, Math.round(count || 1));
}

export function totalArea(areas: Area[], count = 1): number {
  return areas.reduce((s, a) => s + areaOf(a), 0) * copies(count);
}

export function totalPerimeter(areas: Area[], count = 1): number {
  return areas.reduce((s, a) => s + perimeterOf(a), 0) * copies(count);
}

/* ───────────────────────── volume, weight, packaging ───────────────────────── */

export interface Quantity {
  /** In place, at the finished depth. */
  cuftFinished: number;
  cuydFinished: number;
  /** What to buy: loose volume including compaction and the extra allowance. */
  cuftOrder: number;
  cuydOrder: number;
}

export function orderVolume(cuftFinished: number, compaction = 1, extraPct = 0): Quantity {
  const finished = Math.max(0, cuftFinished);
  const order = finished * Math.max(1, compaction) * (1 + Math.max(0, extraPct) / 100);
  return {
    cuftFinished: finished,
    cuydFinished: finished / CUFT_PER_CUYD,
    cuftOrder: order,
    cuydOrder: order / CUFT_PER_CUYD,
  };
}

export function volumeQuantity(cuyd: number): Quantity {
  const c = Math.max(0, cuyd);
  return { cuftFinished: c * CUFT_PER_CUYD, cuydFinished: c, cuftOrder: c * CUFT_PER_CUYD, cuydOrder: c };
}

/** Whole bags of `bagCuft` that hold `cuft`. */
export function bagsFor(cuft: number, bagCuft: number): number {
  return bagCuft > 0 ? ceilQty(cuft / bagCuft) : 0;
}

/** Square feet one cubic yard covers at a depth (324 ÷ inches). */
export function coveragePerCuyd(depthIn: number): number {
  return depthIn > 0 ? SQFT_PER_CUYD_AT_1IN / depthIn : 0;
}

/** Square feet one ton covers at a loose depth: 324 ÷ (inches × t/yd³). */
export function coveragePerTon(depthIn: number, tonsPerYd: number): number {
  return depthIn > 0 && tonsPerYd > 0 ? SQFT_PER_CUYD_AT_1IN / (depthIn * tonsPerYd) : 0;
}

/** Compacted layers go down in lifts no thicker than 3 in (Unilock). */
export function liftsFor(depthIn: number): number {
  return depthIn > 0 ? ceilQty(depthIn / MAX_LIFT_IN) : 0;
}

export interface TruckPlan {
  truck: "single-axle" | "tandem";
  loads: number;
}

/** Dump-truck loads: up to 5 t rides a single-axle; heavier orders go on tandems of up to 18 t. */
export function truckFor(tons: number): TruckPlan {
  if (tons <= 0) return { truck: "single-axle", loads: 0 };
  if (tons <= TRUCK.singleAxleTons) return { truck: "single-axle", loads: 1 };
  return { truck: "tandem", loads: ceilQty(tons / TRUCK.tandemTons) };
}

export function pickupTrips(weightLb: number, payloadLb: number): number {
  return payloadLb > 0 ? ceilQty(weightLb / payloadLb) : 0;
}

/**
 * Price of a bag size. Uses a dated price for that exact size when there is one; otherwise scales
 * the per-cubic-foot price of a known size and flags the result as an estimate.
 */
export function bagPriceFor(prices: Record<number, number>, size: number): { price?: number; estimated: boolean } {
  if (prices[size] != null) return { price: prices[size], estimated: false };
  const known = Object.entries(prices).map(([s, p]) => [Number(s), p] as const);
  if (!known.length || size <= 0) return { estimated: false };
  const [s, p] = known[0];
  return { price: Math.round((p / s) * size * 100) / 100, estimated: true };
}

/* ───────────────────────── bags vs bulk ───────────────────────── */

export type BuyMode = "auto" | "delivered" | "pickup" | "bags";
export type BuyChoice = Exclude<BuyMode, "auto">;

export interface BuyInput {
  /** Loose cubic yards to buy. */
  cuyd: number;
  bagCuft: number;
  /** Price per bag; 0 or undefined = not sold bagged here / unknown. */
  bagPrice?: number;
  /** Bulk price per cubic yard; undefined = no bulk price. */
  bulkPerYd?: number;
  deliveryFee: number;
  /** Truckloads needed for a delivered order. */
  loads: number;
}

export interface BuyResult {
  bags: number;
  bagCost?: number;
  bagPerYd?: number;
  bulkMaterial?: number;
  bulkDelivered?: number;
  cheaper: "bags" | "bulk" | "unknown";
  /** Cubic yards from which delivered bulk beats bags: delivery ÷ (bag $/yd − bulk $/yd). */
  breakEvenYd?: number;
}

export function compareBuy(i: BuyInput): BuyResult {
  const bags = bagsFor(i.cuyd * CUFT_PER_CUYD, i.bagCuft);
  const hasBag = !!i.bagPrice && i.bagPrice > 0 && i.bagCuft > 0;
  const bagCost = hasBag ? bags * i.bagPrice! : undefined;
  const bagPerYd = hasBag ? (i.bagPrice! * CUFT_PER_CUYD) / i.bagCuft : undefined;
  const bulkMaterial = i.bulkPerYd != null && i.bulkPerYd > 0 ? i.cuyd * i.bulkPerYd : undefined;
  const bulkDelivered = bulkMaterial != null ? bulkMaterial + Math.max(1, i.loads) * i.deliveryFee : undefined;
  const breakEvenYd =
    bagPerYd != null && i.bulkPerYd != null && i.bulkPerYd > 0 && bagPerYd > i.bulkPerYd ? i.deliveryFee / (bagPerYd - i.bulkPerYd) : undefined;
  const cheaper = bagCost == null || bulkDelivered == null ? "unknown" : bulkDelivered < bagCost ? "bulk" : "bags";
  return { bags, bagCost, bagPerYd, bulkMaterial, bulkDelivered, cheaper, breakEvenYd };
}

export function buyMode(v: string): BuyMode {
  return v === "delivered" || v === "pickup" || v === "bags" ? v : "auto";
}

/** "Cheapest" picks delivered bulk or bags by price; when only one side is priced, that side wins. */
export function resolveBuy(mode: BuyMode, r: BuyResult): BuyChoice {
  if (mode !== "auto") return mode;
  if (r.bulkDelivered == null) return r.bagCost != null ? "bags" : "delivered";
  if (r.bagCost == null) return "delivered";
  return r.bulkDelivered < r.bagCost ? "delivered" : "bags";
}

/** Cost of the chosen way of buying (pickup skips the delivery fee). */
export function costOf(choice: BuyChoice, r: BuyResult): number | undefined {
  if (choice === "bags") return r.bagCost;
  if (choice === "pickup") return r.bulkMaterial;
  return r.bulkDelivered;
}

/* ───────────────────────── gravel ───────────────────────── */

export interface GravelLayerInput {
  material: GravelId;
  depthIn: number;
  /** Ignored for clean stone, which has no compaction factor. */
  compacted: boolean;
  compaction: number;
  /** Loose t/yd³ in use (material default or the supplier's figure). */
  tonsPerYd: number;
  unit: "ton" | "yd";
  /** Bulk price per `unit`. */
  price: number;
  /** Per 0.5 cu ft bag; 0 = not sold bagged. */
  bagPrice: number;
}

export interface GravelInput {
  areas: Area[];
  count: number;
  /** A known order amount instead of area × depth (first layer only). */
  volume?: { amount: number; unit: "yd" | "ton" };
  layers: GravelLayerInput[];
  extraPct: number;
  deliveryFee: number;
  payloadLb: number;
  bagCuft: number;
}

export interface GravelLayerResult {
  layer: GravelLayerInput;
  /** Compaction factor actually applied (1 for loose layers and clean stone). */
  factor: number;
  q: Quantity;
  tons: number;
  tonsLow: number;
  tonsHigh: number;
  weightLb: number;
  bulkPerYd: number;
  buy: BuyResult;
  truck: TruckPlan;
  pickupTrips: number;
  /** Depth to spread before compacting. */
  looseDepthIn: number;
  lifts: number;
  coveragePerTonSqFt: number;
}

export interface GravelResult {
  areaSqFt: number;
  perimeterFt: number;
  layers: GravelLayerResult[];
  totalTons: number;
  totalCuyd: number;
  totalWeightLb: number;
  warnings: string[];
}

export function bulkPricePerYd(unit: "ton" | "yd", price: number, tonsPerYd: number): number {
  return unit === "yd" ? price : price * tonsPerYd;
}

/** Converts a bulk price when the user switches between $/ton and $/yd. */
export function convertPrice(price: number, from: string, to: string, tonsPerYd: number): number {
  if (from === to || tonsPerYd <= 0) return price;
  return Math.round((to === "yd" ? price * tonsPerYd : price / tonsPerYd) * 100) / 100;
}

export function computeGravel(input: GravelInput): GravelResult {
  const areaSqFt = input.volume ? 0 : totalArea(input.areas, input.count);
  const perimeterFt = input.volume ? 0 : totalPerimeter(input.areas, input.count);
  const layers = (input.volume ? input.layers.slice(0, 1) : input.layers).map((layer): GravelLayerResult => {
    const m = aggregate(layer.material);
    const density = layer.tonsPerYd > 0 ? layer.tonsPerYd : m.tonsPerYd;
    const factor = m.compaction && layer.compacted ? Math.max(1, layer.compaction) : 1;
    let q: Quantity;
    if (input.volume) {
      const v = Math.max(0, input.volume.amount);
      q = volumeQuantity(input.volume.unit === "ton" ? v / density : v);
    } else {
      q = orderVolume(areaSqFt * (Math.max(0, layer.depthIn) / 12), factor, input.extraPct);
    }
    const tons = q.cuydOrder * density;
    const bulkPerYd = bulkPricePerYd(layer.unit, layer.price, density);
    const truck = truckFor(tons);
    const looseDepthIn = layer.depthIn * factor;
    return {
      layer: { ...layer, tonsPerYd: density },
      factor,
      q,
      tons,
      tonsLow: q.cuydOrder * m.range[0],
      tonsHigh: q.cuydOrder * m.range[1],
      weightLb: tons * LB_PER_SHORT_TON,
      bulkPerYd,
      buy: compareBuy({ cuyd: q.cuydOrder, bagCuft: input.bagCuft, bagPrice: layer.bagPrice, bulkPerYd, deliveryFee: input.deliveryFee, loads: truck.loads }),
      truck,
      pickupTrips: pickupTrips(tons * LB_PER_SHORT_TON, input.payloadLb),
      looseDepthIn,
      lifts: factor > 1 ? liftsFor(layer.depthIn) : 0,
      coveragePerTonSqFt: coveragePerTon(looseDepthIn, density),
    };
  });

  const warnings: string[] = [];
  if (!input.volume) {
    for (const l of layers) {
      const m = aggregate(l.layer.material);
      if (l.layer.depthIn > 0 && l.layer.depthIn < 2 && !m.compaction) {
        warnings.push(`Under 2 in of ${m.short} lets fabric and soil show through — Stone Center recommends at least 2 in for decorative stone.`);
      }
      if (m.id === "river" && l.layer.depthIn > 0 && l.layer.depthIn < 3) {
        warnings.push("River rock of 1–3 in needs roughly 3 in of depth to cover the ground; Roseville Rock Supply suggests 3–6 in for rock.");
      }
      if (m.compaction && !l.layer.compacted && (m.id === "crusher" || m.id === "concrete")) {
        warnings.push(`${capitalize(m.short)} is a base material meant to be compacted. Left loose it ruts; turn on "compacted" if you will tamp it.`);
      }
    }
    if (input.extraPct < 5) warnings.push("With no extra you will likely come up short: ground is never flat and yards load by the scoop. Supplier calculators add about 10%.");
  }
  return {
    areaSqFt,
    perimeterFt,
    layers,
    totalTons: layers.reduce((s, l) => s + l.tons, 0),
    totalCuyd: layers.reduce((s, l) => s + l.q.cuydOrder, 0),
    totalWeightLb: layers.reduce((s, l) => s + l.weightLb, 0),
    warnings,
  };
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/* ───────────────────────── mulch ───────────────────────── */

export type MulchMode = "bed" | "ring" | "topup" | "play";

export interface MulchInput {
  mode: MulchMode;
  /** For playgrounds: the equipment footprint (the use zone is added). */
  areas: Area[];
  count: number;
  /** Finished depth (target depth when topping up). */
  depthIn: number;
  existingIn: number;
  material: MulchId;
  bagCuft: number;
  bagPrice: number;
  bulkPerYd: number;
  deliveryFee: number;
  extraPct: number;
}

export interface MulchResult {
  /** Area that gets mulch (use zone included for playgrounds). */
  areaSqFt: number;
  perimeterFt: number;
  addDepthIn: number;
  q: Quantity;
  bags: number;
  bagsBySize: { size: number; bags: number }[];
  bales: number;
  weightLb?: number;
  buy: BuyResult;
  coveragePerBagSqFt: number;
  coveragePerYdSqFt: number;
  warnings: string[];
}

export function computeMulch(input: MulchInput): MulchResult {
  const t = mulchType(input.material);
  const n = copies(input.count);
  const areaSqFt =
    input.mode === "play" ? input.areas.reduce((s, a) => s + grownArea(a, PLAY_USE_ZONE_FT), 0) * n : totalArea(input.areas, n);
  const perimeterFt = input.mode === "play" ? 0 : totalPerimeter(input.areas, n);
  const target = Math.max(0, input.depthIn);
  const existing = input.mode === "topup" ? Math.max(0, input.existingIn) : 0;
  const addDepthIn = Math.max(0, target - existing);
  const q = orderVolume(areaSqFt * (addDepthIn / 12), 1, input.extraPct);
  const bags = bagsFor(q.cuftOrder, input.bagCuft);
  const bales = t.sqftPerBale ? ceilQty((areaSqFt * (1 + Math.max(0, input.extraPct) / 100)) / t.sqftPerBale) : 0;
  const buy = compareBuy({
    cuyd: q.cuydOrder,
    bagCuft: input.bagCuft,
    bagPrice: input.bagPrice,
    bulkPerYd: input.bulkPerYd > 0 ? input.bulkPerYd : undefined,
    deliveryFee: input.deliveryFee,
    loads: 1,
  });

  const warnings: string[] = [];
  const total = existing + addDepthIn;
  if (input.mode === "topup" && areaSqFt > 0 && existing >= target) {
    warnings.push(`Your beds already have ${fmtIn(existing)} — at or above the ${fmtIn(target)} target, so no new mulch is needed. Loosen the crusted top layer with a rake instead.`);
  } else if (input.mode !== "play" && t.id !== "pinestraw" && total > MULCH_MAX_TOTAL_IN) {
    warnings.push(`That makes ${fmtIn(total)} of mulch in total. More than ${MULCH_MAX_TOTAL_IN} in keeps water and air from reaching roots; Extension guidance is 2–3 in for most mulches.`);
  }
  if (input.mode === "bed" && t.id !== "pinestraw" && target > 0 && target < t.depth[0]) {
    warnings.push(`Under ${t.depth[0]} in of ${t.short} won't hold back weeds — MSU Extension recommends ${t.depth[0]}–${t.depth[1]} in.`);
  }
  if (input.mode === "ring" && target > TREE_RING.depthIn) {
    warnings.push(`Keep tree rings to 2–3 in deep and flat — piling mulch higher against the trunk (a "mulch volcano") invites rot and pests.`);
  }
  if (input.mode === "play") {
    const minIn = t.id === "rubber" ? 6 : PLAY_MAINTAIN_IN;
    if (target < minIn) {
      warnings.push(`CPSC calls for at least ${minIn} in of ${t.id === "rubber" ? "shredded rubber" : "loose wood fill"} under play equipment${t.id === "rubber" ? "" : " — start at 12 in so it settles no lower than 9"}.`);
    }
  }

  return {
    areaSqFt,
    perimeterFt,
    addDepthIn,
    q,
    bags,
    bagsBySize: t.bagSizes.map((size) => ({ size, bags: bagsFor(q.cuftOrder, size) })),
    bales,
    weightLb: t.tonsPerYd ? q.cuydOrder * t.tonsPerYd * LB_PER_SHORT_TON : undefined,
    buy,
    coveragePerBagSqFt: addDepthIn > 0 && input.bagCuft > 0 ? input.bagCuft / (addDepthIn / 12) : 0,
    coveragePerYdSqFt: coveragePerCuyd(addDepthIn),
    warnings,
  };
}

function fmtIn(n: number): string {
  return `${Math.round(n * 100) / 100} in`;
}

/* ───────────────────────── topsoil, compost, fill ───────────────────────── */

export interface SoilInput {
  mode: "area" | "beds";
  areas: Area[];
  count: number;
  depthIn: number;
  /** Raised beds: inside length & width (ft), soil depth (in), number of beds. */
  bed: { l: number; w: number; hIn: number; count: number };
  material: SoilId;
  /** Extra for settling and uneven ground. */
  settlePct: number;
  bagCuft: number;
  bagPrice: number;
  bulkPerYd: number;
  deliveryFee: number;
  payloadLb: number;
}

export interface SoilResult {
  areaSqFt: number;
  q: Quantity;
  tons: number;
  weightLb: number;
  bags: number;
  bagsBySize: { size: number; bags: number }[];
  /** Raised beds: soil for one bed, settling included. */
  perBed?: { cuft: number; bags: number };
  /** 50/50 blend made at home: equal parts topsoil and compost. */
  blendSplit?: { topsoilCuft: number; compostCuft: number };
  buy: BuyResult;
  truck: TruckPlan;
  pickupTrips: number;
  warnings: string[];
}

export function computeSoil(input: SoilInput): SoilResult {
  const s = soilType(input.material);
  const beds = copies(input.bed.count);
  const isBeds = input.mode === "beds";
  const bedArea = input.bed.l > 0 && input.bed.w > 0 ? input.bed.l * input.bed.w : 0;
  const areaSqFt = isBeds ? bedArea * beds : totalArea(input.areas, input.count);
  const depthIn = Math.max(0, isBeds ? input.bed.hIn : input.depthIn);
  const q = orderVolume(areaSqFt * (depthIn / 12), 1, input.settlePct);
  const tons = q.cuydOrder * s.tonsPerYd;
  const truck = truckFor(tons);
  const perBedCuft = q.cuftOrder / (isBeds ? beds : 1);

  const warnings: string[] = [];
  if (input.settlePct < 5) warnings.push("Loose soil settles after the first soaking. Roseville Rock Supply suggests ordering 5–10% extra.");
  if (s.id === "fill" && isBeds) warnings.push("Fill dirt is unscreened subsoil — fine for raising grade, poor for growing. Fill raised beds with topsoil, compost or a blend.");

  return {
    areaSqFt,
    q,
    tons,
    weightLb: tons * LB_PER_SHORT_TON,
    bags: bagsFor(q.cuftOrder, input.bagCuft),
    bagsBySize: SOIL_BAG_SIZES.map((size) => ({ size, bags: bagsFor(q.cuftOrder, size) })),
    perBed: isBeds ? { cuft: perBedCuft, bags: bagsFor(perBedCuft, input.bagCuft) } : undefined,
    blendSplit: s.id === "blend" ? { topsoilCuft: q.cuftOrder / 2, compostCuft: q.cuftOrder / 2 } : undefined,
    buy: compareBuy({
      cuyd: q.cuydOrder,
      bagCuft: input.bagCuft,
      bagPrice: input.bagPrice,
      bulkPerYd: input.bulkPerYd > 0 ? input.bulkPerYd : undefined,
      deliveryFee: input.deliveryFee,
      loads: truck.loads,
    }),
    truck,
    pickupTrips: pickupTrips(tons * LB_PER_SHORT_TON, input.payloadLb),
    warnings,
  };
}

/* ───────────────────────── sand ───────────────────────── */

export interface SandBagOption {
  id: string;
  label: string;
  cuft: number;
  lb: number;
}

export interface SandInput {
  areas: Area[];
  count: number;
  volume?: { amount: number; unit: "yd" | "ton" };
  depthIn: number;
  extraPct: number;
  tonsPerYd: number;
  bag: SandBagOption;
  bagOptions: readonly SandBagOption[];
  bagPrice: number;
  bulk?: { price: number; per: "ton" | "yd" };
  deliveryFee: number;
  payloadLb: number;
}

export interface SandResult {
  areaSqFt: number;
  q: Quantity;
  tons: number;
  tonsLow: number;
  tonsHigh: number;
  weightLb: number;
  bags: number;
  bagsByOption: { id: string; label: string; bags: number }[];
  /** Bags of the chosen size in one short ton, by weight. */
  bagsPerTon: number;
  buy: BuyResult;
  truck: TruckPlan;
  pickupTrips: number;
  warnings: string[];
}

export function computeSand(input: SandInput): SandResult {
  const density = input.tonsPerYd > 0 ? input.tonsPerYd : 1.4;
  const areaSqFt = input.volume ? 0 : totalArea(input.areas, input.count);
  let q: Quantity;
  if (input.volume) {
    const v = Math.max(0, input.volume.amount);
    q = volumeQuantity(input.volume.unit === "ton" ? v / density : v);
  } else {
    q = orderVolume(areaSqFt * (Math.max(0, input.depthIn) / 12), 1, input.extraPct);
  }
  const tons = q.cuydOrder * density;
  const truck = truckFor(tons);
  const bulkPerYd = input.bulk ? bulkPricePerYd(input.bulk.per, input.bulk.price, density) : undefined;

  const warnings: string[] = [];
  if (!input.volume && input.extraPct < 5) warnings.push("Add 5–10% for spillage and an uneven subgrade (Roseville Rock Supply).");

  return {
    areaSqFt,
    q,
    tons,
    tonsLow: q.cuydOrder * SAND_RANGE[0],
    tonsHigh: q.cuydOrder * SAND_RANGE[1],
    weightLb: tons * LB_PER_SHORT_TON,
    bags: bagsFor(q.cuftOrder, input.bag.cuft),
    bagsByOption: input.bagOptions.map((b) => ({ id: b.id, label: b.label, bags: bagsFor(q.cuftOrder, b.cuft) })),
    bagsPerTon: input.bag.lb > 0 ? LB_PER_SHORT_TON / input.bag.lb : 0,
    buy: compareBuy({ cuyd: q.cuydOrder, bagCuft: input.bag.cuft, bagPrice: input.bagPrice, bulkPerYd, deliveryFee: input.deliveryFee, loads: truck.loads }),
    truck,
    pickupTrips: pickupTrips(tons * LB_PER_SHORT_TON, input.payloadLb),
    warnings,
  };
}

/* ───────────────────────── paver base ───────────────────────── */

export interface PaverInput {
  areas: Area[];
  count: number;
  baseIn: number;
  beddingIn: number;
  paverIn: number;
  base: "crusher" | "clear";
  /** Manufacturer range for the use, e.g. Unilock patios 6–8 in. */
  recommended: [number, number];
  useLabel: string;
  compaction: number;
  tonsPerYd: number;
  extendIn: number;
  /** Edges that butt against a house, steps or other paving and need no restraint. */
  wallFt: number;
  extraPct: number;
  unit: "ton" | "yd";
  price: number;
  baseBagPrice: number;
  beddingBagPrice: number;
  deliveryFee: number;
  payloadLb: number;
  bagCuft: number;
  beddingTonsPerYd: number;
}

export interface PaverResult {
  areaSqFt: number;
  /** Base footprint including the extension past the edges. */
  baseAreaSqFt: number;
  perimeterFt: number;
  edgeFt: number;
  /** Edges were estimated by treating a square-foot entry as a square. */
  approxEdges: boolean;
  base: {
    q: Quantity;
    factor: number;
    tons: number;
    tonsLow: number;
    tonsHigh: number;
    weightLb: number;
    bags: number;
    pallets: number;
    bulkPerYd: number;
    buy: BuyResult;
    truck: TruckPlan;
    pickupTrips: number;
    looseDepthIn: number;
    lifts: number;
  };
  bedding: { q: Quantity; tons: number; bags: number; cost?: number };
  excavation: { depthIn: number; cuyd: number; tons: number };
  warnings: string[];
}

export function computePaverBase(input: PaverInput): PaverResult {
  const n = copies(input.count);
  const areaSqFt = totalArea(input.areas, n);
  const ext = Math.max(0, input.extendIn) / 12;
  const baseAreaSqFt = input.areas.reduce((s, a) => s + grownArea(a, ext), 0) * n;
  const approxEdges = input.areas.some((a) => a.shape === "sqft" && areaOf(a) > 0);
  const perimeterFt =
    input.areas.reduce((s, a) => s + (a.shape === "sqft" ? (areaOf(a) > 0 ? 4 * Math.sqrt(areaOf(a)) : 0) : perimeterOf(a)), 0) * n;
  const edgeFt = Math.max(0, perimeterFt - Math.max(0, input.wallFt));

  const m = aggregate(input.base === "clear" ? "57" : "crusher");
  const factor = input.base === "crusher" ? Math.max(1, input.compaction) : 1;
  const density = input.tonsPerYd > 0 ? input.tonsPerYd : m.tonsPerYd;
  const baseIn = Math.max(0, input.baseIn);
  const q = orderVolume(baseAreaSqFt * (baseIn / 12), factor, input.extraPct);
  const tons = q.cuydOrder * density;
  const truck = truckFor(tons);
  const bulkPerYd = bulkPricePerYd(input.unit, input.price, density);
  const bags = bagsFor(q.cuftOrder, input.bagCuft);

  // The screeded bed is laid loose over the paver footprint only (not the extension).
  const beddingIn = Math.max(0, input.beddingIn);
  const bq = orderVolume(areaSqFt * (beddingIn / 12), 1, input.extraPct);
  const beddingBags = bagsFor(bq.cuftOrder, input.bagCuft);

  const digIn = baseIn + beddingIn + Math.max(0, input.paverIn);
  const digCuyd = (baseAreaSqFt * (digIn / 12)) / CUFT_PER_CUYD;

  const warnings: string[] = [];
  const [lo, hi] = input.recommended;
  if (baseIn > 0 && baseIn < lo) {
    warnings.push(`Unilock calls for ${lo}–${hi} in of compacted base under a ${input.useLabel.toLowerCase()}. A thinner base is the most common reason pavers heave and sink.`);
  }
  if (beddingIn > 2) warnings.push("Bedding thicker than 2 in (Quikrete's upper limit; Unilock uses 1 in) lets pavers settle unevenly — raise the gravel base instead.");
  if (input.extraPct < 5 && input.base === "crusher") warnings.push("Even with compaction counted, an uneven subgrade eats material. Roseville Rock Supply suggests 5–10% extra.");

  return {
    areaSqFt,
    baseAreaSqFt,
    perimeterFt,
    edgeFt,
    approxEdges,
    base: {
      q,
      factor,
      tons,
      tonsLow: q.cuydOrder * m.range[0],
      tonsHigh: q.cuydOrder * m.range[1],
      weightLb: tons * LB_PER_SHORT_TON,
      bags,
      pallets: bags / PAVER.bagsPerPallet,
      bulkPerYd,
      buy: compareBuy({ cuyd: q.cuydOrder, bagCuft: input.bagCuft, bagPrice: input.baseBagPrice, bulkPerYd, deliveryFee: input.deliveryFee, loads: truck.loads }),
      truck,
      pickupTrips: pickupTrips(tons * LB_PER_SHORT_TON, input.payloadLb),
      looseDepthIn: baseIn * factor,
      lifts: liftsFor(baseIn),
    },
    bedding: {
      q: bq,
      tons: bq.cuydOrder * input.beddingTonsPerYd,
      bags: beddingBags,
      cost: input.beddingBagPrice > 0 ? beddingBags * input.beddingBagPrice : undefined,
    },
    excavation: { depthIn: digIn, cuyd: digCuyd, tons: digCuyd * SOIL_IN_PLACE_TONS_PER_YD },
    warnings,
  };
}
