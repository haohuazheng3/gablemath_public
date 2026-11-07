// Pure paint, primer and stain math shared by the client calculators and the server-rendered answers.

import { ceilQty, ceilTo } from "@/lib/format";
import {
  BRAND_CALC,
  CEILING_PAINTS,
  DROP_CLOTH_SQFT,
  LEAD_YEAR,
  OLYMPIC_GUIDE,
  OPENING,
  PACK_GAL,
  POPCORN_FACTOR,
  QUART_SHARE_ESTIMATE,
  RAILING_FACTOR,
  ROUGH_WOOD_FACTOR,
  SPRAY_LOSS_PCT,
  STAIR_STEP_IN,
  SUPPLY,
  TAPE_FT_PER_ROLL,
  TRIM_PAINTS,
  TYPICAL_GALLON,
  WALL_TEXTURES,
  exteriorPaint,
  exteriorPrimer,
  interiorPrimer,
  planRate,
  siding,
  stain,
  stainsFor,
  wallPaint,
  type PackPrices,
  type PackSize,
  type PaintProduct,
  type PriceBasis,
  type PriceCategory,
  type PrimerUse,
  type StainProduct,
  type TextureId,
  type WoodCondition,
} from "./data";

/* ───────── prices & containers ───────── */

export type PriceTag = PriceBasis | "typical" | "estimate";

export interface Priced {
  prices: PackPrices;
  tags: Partial<Record<PackSize, PriceTag>>;
  note: string;
}

const SIZES: PackSize[] = ["p5", "p35", "gal", "qt"];
const QUARTS: Record<PackSize, number> = { qt: 1, gal: 4, p35: 14, p5: 20 };
const cents = (n: number) => Math.round(n * 100) / 100;

/**
 * Prices for one product: the verified ones, an estimated quart when only the gallon is listed,
 * or the category's typical (median) gallon when nothing is listed.
 */
export function resolvePrices(p: { prices?: PackPrices; basis?: PriceBasis; priceNote?: string }, category: PriceCategory): Priced {
  const tags: Partial<Record<PackSize, PriceTag>> = {};
  if (p.prices && p.basis) {
    const prices: PackPrices = { ...p.prices };
    for (const s of SIZES) if (prices[s] != null) tags[s] = p.basis;
    if (prices.qt == null && prices.gal != null) {
      prices.qt = cents(prices.gal * QUART_SHARE_ESTIMATE);
      tags.qt = "estimate";
    }
    return { prices, tags, note: p.priceNote ?? "" };
  }
  const gal = TYPICAL_GALLON[category];
  return {
    prices: { gal, qt: cents(gal * QUART_SHARE_ESTIMATE) },
    tags: { gal: "typical", qt: "estimate" },
    note: "No verified online price — showing the median gallon price of the products we priced. Enter your store's price.",
  };
}

export interface PackLine {
  size: PackSize;
  count: number;
  unitPrice: number;
  tag: PriceTag;
}

export interface PackPlan {
  lines: PackLine[];
  needGal: number;
  gallons: number;
  cost: number;
  leftoverGal: number;
}

const MAX_DP_QUARTS = 4000;

/**
 * Cheapest mix of quarts, gallons and pails that covers the need, using the product's real prices
 * (3 quarts usually cost more than a gallon; a 5-gal pail is not always cheaper per gallon).
 * Ties go to fewer containers.
 */
export function cheapestPack(needGal: number, priced: Pick<Priced, "prices" | "tags">): PackPlan {
  const need = Math.max(0, needGal);
  const sizes = SIZES.filter((s) => (priced.prices[s] ?? 0) > 0);
  let q = ceilQty(need * 4);
  const counts: Partial<Record<PackSize, number>> = {};
  if (!q || !sizes.length) return { lines: [], needGal: need, gallons: 0, cost: 0, leftoverGal: 0 };

  // Absurdly large jobs: pre-fill with the cheapest-per-quart size so the table stays small.
  if (q > MAX_DP_QUARTS) {
    const bulk = [...sizes].sort((a, b) => priced.prices[a]! / QUARTS[a] - priced.prices[b]! / QUARTS[b])[0];
    const n = Math.ceil((q - MAX_DP_QUARTS) / QUARTS[bulk]);
    counts[bulk] = n;
    q = Math.max(0, q - n * QUARTS[bulk]);
  }

  const cost = new Float64Array(q + 1);
  const cans = new Int32Array(q + 1);
  const pick: PackSize[] = new Array(q + 1);
  for (let i = 1; i <= q; i++) {
    let best = Infinity;
    let bestCans = Infinity;
    for (const s of sizes) {
      const prev = Math.max(0, i - QUARTS[s]);
      const c = cost[prev] + priced.prices[s]!;
      const n = cans[prev] + 1;
      if (c < best - 1e-6 || (Math.abs(c - best) <= 1e-6 && n < bestCans)) {
        best = c;
        bestCans = n;
        pick[i] = s;
      }
    }
    cost[i] = best;
    cans[i] = bestCans;
  }
  for (let i = q; i > 0; ) {
    const s = pick[i];
    counts[s] = (counts[s] ?? 0) + 1;
    i = Math.max(0, i - QUARTS[s]);
  }

  const lines: PackLine[] = SIZES.filter((s) => counts[s]).map((s) => ({
    size: s,
    count: counts[s]!,
    unitPrice: priced.prices[s]!,
    tag: priced.tags[s] ?? "typical",
  }));
  const gallons = lines.reduce((t, l) => t + l.count * PACK_GAL[l.size], 0);
  return {
    lines,
    needGal: need,
    gallons,
    cost: cents(lines.reduce((t, l) => t + l.count * l.unitPrice, 0)),
    leftoverGal: Math.max(0, gallons - need),
  };
}

/** The same need bought only in the given sizes (for the "whole gallons vs pails" comparison). */
export function packOnly(needGal: number, priced: Priced, only: PackSize[]): PackPlan | null {
  const prices: PackPrices = {};
  for (const s of only) if (priced.prices[s] != null) prices[s] = priced.prices[s];
  if (!Object.keys(prices).length) return null;
  return cheapestPack(needGal, { prices, tags: priced.tags });
}

const SIZE_TEXT: Record<PackSize, (n: number) => string> = {
  p5: (n) => `${n} × 5 gal`,
  p35: (n) => `${n} × 3.5 gal`,
  gal: (n) => `${n} gal`,
  qt: (n) => `${n} qt`,
};

/** "1 × 5 gal + 2 gal + 1 qt" */
export function packText(plan: PackPlan): string {
  if (!plan.lines.length) return "0 gal";
  return plan.lines.map((l) => SIZE_TEXT[l.size](l.count)).join(" + ");
}

/** Gallons of coating for an area: area × coats ÷ rate, plus the loss allowance. */
export function gallonsFor(areaSqFt: number, coats: number, rate: number, lossPct: number): number {
  if (areaSqFt <= 0 || coats <= 0 || rate <= 0) return 0;
  return ((areaSqFt * coats) / rate) * (1 + Math.max(0, lossPct) / 100);
}

/** Sherwin-Williams' calculator: per coat, rounded up to the next 0.1 gal. */
export function swGallonsPerCoat(areaSqFt: number, rate: number): number {
  return Math.round(ceilTo(Math.max(0, areaSqFt) / rate, 0.1) * 10) / 10;
}

/** Benjamin Moore's calculator: round(area) ÷ 350 × 2 coats, as whole gallons plus quarts. */
export function bmGallonsQuarts(areaSqFt: number): { gallons: number; quarts: number } {
  const g = (Math.round(Math.max(0, areaSqFt)) / BRAND_CALC.bmRate) * BRAND_CALC.bmCoats;
  let gallons = Math.floor(g);
  let quarts = Math.max(0, Math.ceil((g % 1) / 0.25 - 1e-9));
  if (quarts === 4) {
    gallons += 1;
    quarts = 0;
  }
  return { gallons, quarts };
}

/** Area of a triangular gable end: width × peak height ÷ 2 (SW custom calculator). */
export function gableArea(widthFt: number, riseFt: number): number {
  return widthFt > 0 && riseFt > 0 ? (widthFt * riseFt) / 2 : 0;
}

/** Trim face area: linear feet × face height in inches ÷ 12. */
export function trimArea(lf: number, heightIn: number): number {
  return lf > 0 && heightIn > 0 ? (lf * heightIn) / 12 : 0;
}

/** Casing around one opening: two legs and a head for doors; four sides for windows. */
export function casingLf(w: number, h: number, sides: 3 | 4): number {
  return Math.max(0, 2 * h + (sides === 4 ? 2 : 1) * w);
}

/* ───────── shared result pieces ───────── */

export interface Need {
  key: "walls" | "ceiling" | "trim" | "primer" | "siding" | "stain";
  label: string;
  productId: string;
  productName: string;
  areaSqFt: number;
  coats: number;
  /** effective per-coat spread rate after texture / surface factors (sq ft/gal) */
  rate: number;
  gallons: number;
  priced: Priced;
  pack: PackPlan;
}

export interface SupplyLine {
  id: string;
  name: string;
  qty: number;
  unit: string;
  price?: number;
  note?: string;
}

function need(n: Omit<Need, "pack">): Need {
  return { ...n, pack: cheapestPack(n.gallons, n.priced) };
}

const productName = (p: Pick<PaintProduct, "brand" | "name">) => (p.brand === "Any brand" ? p.name : `${p.brand} ${p.name}`);

function costOf(needs: Need[]): number {
  return cents(needs.reduce((t, n) => t + n.pack.cost, 0));
}

function suppliesCost(lines: SupplyLine[]): number {
  return cents(lines.reduce((t, l) => t + (l.price ?? 0) * l.qty, 0));
}

function rollerSupplies(systems: number, nap: string, brushes: number): SupplyLine[] {
  if (systems <= 0) return [];
  return [
    { id: SUPPLY.covers.id, name: `${SUPPLY.covers.name}, ${nap} nap`, qty: Math.ceil(systems / 3), unit: "packs", price: SUPPLY.covers.price, note: "a fresh cover for each product or color" },
    { id: SUPPLY.trayKit.id, name: SUPPLY.trayKit.name, qty: 1, unit: "kit", price: SUPPLY.trayKit.price },
    { id: SUPPLY.brush.id, name: SUPPLY.brush.name, qty: brushes, unit: brushes === 1 ? "brush" : "brushes", price: SUPPLY.brush.price, note: "for cutting in" },
  ];
}

const LEAD_KIT: SupplyLine = { id: "lead-test", name: "EPA-recognized lead test kit", qty: 1, unit: "kit", note: `home built before ${LEAD_YEAR}: test before sanding or scraping` };

const LEAD_WARNING = `Built before ${LEAD_YEAR}? The EPA estimates about three-quarters of those homes still have some lead paint. Test before you sand or scrape, keep dust down (mist, plastic sheeting, HEPA vacuum), and hire an RRP-certified contractor if you pay someone to do it.`;

/* ───────── interior rooms ───────── */

export interface RoomInput {
  rooms: { l: number; w: number }[];
  heightFt: number;
  doors: number;
  windows: number;
  door: { w: number; h: number };
  window: { w: number; h: number };
  /** wall hidden behind cabinets, tile or built-ins (sq ft) */
  blockedSqFt: number;
  closet: { w: number; d: number } | null;
  walls: boolean;
  ceiling: boolean;
  trim: boolean;
  baseboardIn: number;
  casingIn: number;
  doorSlabs: boolean;
  extraTrimLf: number;
  extraTrimIn: number;
  coats: number;
  deepColor: boolean;
  primer: PrimerUse;
  wallProductId: string;
  /** per-coat spread rate the user plans with (defaults to the product's low end) */
  wallRate: number;
  ceilingProductId: string;
  trimProductId: string;
  primerProductId: string;
  texture: TextureId;
  popcornCeiling: boolean;
  lossPct: number;
  touchUp: boolean;
  pre1978: boolean;
}

export interface RoomResult {
  perimeterFt: number;
  wallGrossSqFt: number;
  openingsSqFt: number;
  trimOnWallSqFt: number;
  wallNetSqFt: number;
  closetWallSqFt: number;
  ceilingSqFt: number;
  baseboardLf: number;
  casingLf: number;
  trimSqFt: number;
  doorSlabSqFt: number;
  topcoats: number;
  needs: Need[];
  paintCost: number;
  totalGallons: number;
  supplies: SupplyLine[];
  suppliesCost: number;
  sw: { areaSqFt: number; perCoat: number; total: number };
  bm: { areaSqFt: number; gallons: number; quarts: number };
  warnings: string[];
}

/** Paint products for a "same as walls" choice resolve to the wall line. */
function sideProduct(list: PaintProduct[], id: string): PaintProduct | null {
  return id === "same" ? null : (list.find((p) => p.id === id) ?? null);
}

export function computeRoom(input: RoomInput): RoomResult {
  const h = Math.max(0, input.heightFt);
  const rooms = input.rooms.filter((r) => r.l > 0 && r.w > 0);
  const doors = Math.max(0, Math.round(input.doors));
  const windows = Math.max(0, Math.round(input.windows));
  const doorSqFt = Math.max(0, input.door.w * input.door.h);
  const windowSqFt = Math.max(0, input.window.w * input.window.h);

  const perimeterFt = rooms.reduce((t, r) => t + 2 * (r.l + r.w), 0);
  const closet = input.closet && input.closet.w > 0 && input.closet.d > 0 ? input.closet : null;
  const closetWallSqFt = closet ? (2 * closet.d + closet.w) * h : 0;
  const wallGrossSqFt = perimeterFt * h + closetWallSqFt;
  const openingsSqFt = doors * doorSqFt + windows * windowSqFt;

  const baseboardLf = Math.max(0, perimeterFt + (closet ? 2 * closet.d + closet.w : 0) - doors * input.door.w);
  const casingTotalLf = doors * casingLf(input.door.w, input.door.h, 3) + windows * casingLf(input.window.w, input.window.h, 4);
  const trimOnWallSqFt = input.trim ? trimArea(baseboardLf, input.baseboardIn) + trimArea(casingTotalLf, input.casingIn) : 0;
  const wallNetSqFt = Math.max(0, wallGrossSqFt - openingsSqFt - Math.max(0, input.blockedSqFt) - trimOnWallSqFt);
  const ceilingSqFt = rooms.reduce((t, r) => t + r.l * r.w, 0) + (closet ? closet.w * closet.d : 0);

  const doorSlabSqFt = input.doorSlabs ? doors * doorSqFt * 2 : 0;
  const trimSqFt = trimArea(baseboardLf, input.baseboardIn) + trimArea(casingTotalLf, input.casingIn) + trimArea(input.extraTrimLf, input.extraTrimIn) + doorSlabSqFt;

  const texture = WALL_TEXTURES.find((t) => t.id === input.texture) ?? WALL_TEXTURES[0];
  const ceilingFactor = input.popcornCeiling ? POPCORN_FACTOR : 1;
  const coats = Math.max(1, Math.round(input.coats));
  const topcoats = coats + (input.deepColor && input.primer === "none" ? 1 : 0);
  const loss = Math.max(0, input.lossPct);

  const wp = wallPaint(input.wallProductId);
  const wallRate = input.wallRate > 0 ? input.wallRate : planRate(wp);
  const wallPriced = resolvePrices(wp, "interior");
  const needs: Need[] = [];

  if (input.walls && wallNetSqFt > 0) {
    const rate = wallRate * texture.factor;
    needs.push(
      need({
        key: "walls",
        label: "Walls",
        productId: wp.id,
        productName: productName(wp),
        areaSqFt: wallNetSqFt,
        coats: topcoats,
        rate,
        gallons: gallonsFor(wallNetSqFt, topcoats, rate, loss) + (input.touchUp ? PACK_GAL.qt : 0),
        priced: wallPriced,
      }),
    );
  }

  if (input.ceiling && ceilingSqFt > 0) {
    const cp = sideProduct(CEILING_PAINTS, input.ceilingProductId);
    const rate = (cp ? planRate(cp) : wallRate) * ceilingFactor;
    needs.push(
      need({
        key: "ceiling",
        label: "Ceiling",
        productId: cp?.id ?? wp.id,
        productName: cp ? productName(cp) : `${productName(wp)} (ceiling color)`,
        areaSqFt: ceilingSqFt,
        coats,
        rate,
        gallons: gallonsFor(ceilingSqFt, coats, rate, loss),
        priced: cp ? resolvePrices(cp, "interior") : wallPriced,
      }),
    );
  }

  if (input.trim && trimSqFt > 0) {
    const tp = sideProduct(TRIM_PAINTS, input.trimProductId);
    const rate = tp ? planRate(tp) : wallRate;
    needs.push(
      need({
        key: "trim",
        label: input.doorSlabs ? "Trim & doors" : "Trim",
        productId: tp?.id ?? wp.id,
        productName: tp ? productName(tp) : `${productName(wp)} (semi-gloss)`,
        areaSqFt: trimSqFt,
        coats,
        rate,
        gallons: gallonsFor(trimSqFt, coats, rate, loss),
        priced: tp ? resolvePrices(tp, "interior") : wallPriced,
      }),
    );
  }

  if (input.primer !== "none" && (input.walls || input.ceiling)) {
    const pp = interiorPrimer(input.primerProductId);
    const base = input.primer === "porous" ? pp.porous : pp.sealed;
    const wallsPart = input.walls ? wallNetSqFt : 0;
    // New drywall: the ceiling is new board too.
    const ceilingPart = input.primer === "porous" && input.ceiling ? ceilingSqFt : 0;
    const gallons =
      input.primer === "spot"
        ? PACK_GAL.qt
        : gallonsFor(wallsPart, 1, base * texture.factor, loss) + gallonsFor(ceilingPart, 1, base * ceilingFactor, loss);
    needs.push(
      need({
        key: "primer",
        label: input.primer === "spot" ? "Primer (spot)" : "Primer",
        productId: pp.id,
        productName: productName(pp),
        areaSqFt: input.primer === "spot" ? 0 : wallsPart + ceilingPart,
        coats: 1,
        rate: base * texture.factor,
        gallons,
        priced: resolvePrices(pp, "primer"),
      }),
    );
  }

  // Supplies scale with the job.
  const rollerSystems = needs.filter((n) => n.key === "walls" || n.key === "ceiling" || (n.key === "primer" && input.primer !== "spot")).length;
  const tapeLf = baseboardLf + casingTotalLf;
  const supplies: SupplyLine[] = [
    ...rollerSupplies(rollerSystems, texture.nap, input.trim ? 2 : 1),
    ...(needs.length
      ? [
          { id: SUPPLY.tape.id, name: SUPPLY.tape.name, qty: Math.max(1, Math.ceil(tapeLf / TAPE_FT_PER_ROLL)), unit: "rolls", price: SUPPLY.tape.price, note: `${Math.round(tapeLf)} ft of baseboard and casing to mask` },
          {
            id: SUPPLY.dropCloth.id,
            name: SUPPLY.dropCloth.name,
            qty: input.ceiling ? rooms.reduce((t, r) => t + Math.ceil((r.l * r.w) / DROP_CLOTH_SQFT), 0) : Math.max(1, rooms.length),
            unit: "cloths",
            price: SUPPLY.dropCloth.price,
            note: input.ceiling ? "cover the whole floor when painting a ceiling" : "one per room, moved along the walls",
          },
          ...(input.ceiling || h > 8 ? [{ id: SUPPLY.pole.id, name: SUPPLY.pole.name, qty: 1, unit: "pole", price: SUPPLY.pole.price }] : []),
          ...(input.trim ? [{ id: SUPPLY.caulk.id, name: SUPPLY.caulk.name, qty: Math.max(1, rooms.length), unit: "tubes", price: SUPPLY.caulk.price, note: "fill trim gaps before painting" }] : []),
          { id: "patch", name: "Lightweight spackle & sanding sponge", qty: 1, unit: "set", note: "patch nail holes and dents first" },
          ...(input.pre1978 ? [LEAD_KIT] : []),
        ]
      : []),
  ];

  const swArea = Math.max(0, wallGrossSqFt - Math.max(0, input.blockedSqFt) - doors * BRAND_CALC.swDoorSqFt - windows * BRAND_CALC.swWindowSqFt);
  const bmArea = Math.max(0, wallGrossSqFt - Math.max(0, input.blockedSqFt) - doors * BRAND_CALC.bmDoorSqFt - windows * BRAND_CALC.bmWindowSqFt);
  const swPerCoat = swGallonsPerCoat(swArea, BRAND_CALC.swInterior);

  const warnings: string[] = [];
  const walls = needs.find((n) => n.key === "walls");
  if (loss >= SPRAY_LOSS_PCT) warnings.push(`Spraying: maker coverage figures leave out overspray (Behr says so on its labels), so we added ${loss}%. Back-roll walls after spraying for an even finish.`);
  if (texture.id !== "smooth") warnings.push(`Textured walls hold more paint: we planned at ${Math.round(texture.factor * 100)}% of the label rate (an estimate). Use a ${texture.nap} nap roller to reach the low spots.`);
  if (input.deepColor && input.primer === "none") warnings.push("Deep or bright colors (reds, yellows, navy) usually need a third coat, so we added one. A gray-tinted primer often gets you there in two topcoats instead (Valspar, Behr).");
  if (input.deepColor && input.primer !== "none") warnings.push("Ask the store to tint the primer gray or toward the new color — that is what makes deep colors cover in two coats.");
  if (walls && walls.gallons >= 4)
    warnings.push("Buying 4+ gallons of one color? Pour all the cans into one bucket and mix (\"boxing\") so every wall matches — color can vary slightly from can to can.");
  if (input.pre1978) warnings.push(LEAD_WARNING);

  const paintCost = costOf(needs);
  return {
    perimeterFt,
    wallGrossSqFt,
    openingsSqFt,
    trimOnWallSqFt,
    wallNetSqFt,
    closetWallSqFt,
    ceilingSqFt,
    baseboardLf,
    casingLf: casingTotalLf,
    trimSqFt,
    doorSlabSqFt,
    topcoats,
    needs,
    paintCost,
    totalGallons: needs.reduce((t, n) => t + n.gallons, 0),
    supplies,
    suppliesCost: suppliesCost(supplies),
    sw: { areaSqFt: swArea, perCoat: swPerCoat, total: Math.round(swPerCoat * topcoats * 10) / 10 },
    bm: { areaSqFt: Math.round(bmArea), ...bmGallonsQuarts(bmArea) },
    warnings,
  };
}

/* ───────── house exterior ───────── */

export interface ExteriorInput {
  perimeterFt: number;
  wallHeightFt: number;
  gables: number;
  gableWidthFt: number;
  gableRiseFt: number;
  /** measured siding area; replaces perimeter × height + gables when set */
  directSqFt: number | null;
  doors: number;
  windows: number;
  garageDoors: number;
  garage: { w: number; h: number };
  sidingId: string;
  trimLf: number;
  trimIn: number;
  coats: number;
  productId: string;
  rate: number;
  primer: boolean;
  primerId: string;
  lossPct: number;
  pre1978: boolean;
}

export interface ExteriorResult {
  wallSqFt: number;
  gableSqFt: number;
  grossSqFt: number;
  openingsSqFt: number;
  sidingSqFt: number;
  trimSqFt: number;
  factor: number;
  needs: Need[];
  paintCost: number;
  totalGallons: number;
  /** finish-paint gallons (siding + trim) across the maker's published range */
  range: { lowGal: number; highGal: number };
  sw: { perCoat: number; total: number };
  supplies: SupplyLine[];
  suppliesCost: number;
  warnings: string[];
}

/** Fascia ≈ perimeter, plus both rakes of each gable and casing around every opening. */
export function autoTrimLf(i: Pick<ExteriorInput, "perimeterFt" | "gables" | "gableWidthFt" | "gableRiseFt" | "doors" | "windows" | "garageDoors" | "garage">): number {
  const rakes = i.gables > 0 && i.gableWidthFt > 0 ? i.gables * 2 * Math.hypot(i.gableWidthFt / 2, Math.max(0, i.gableRiseFt)) : 0;
  return Math.round(
    Math.max(0, i.perimeterFt) +
      rakes +
      Math.max(0, i.doors) * casingLf(OPENING.doorW, OPENING.doorH, 3) +
      Math.max(0, i.windows) * casingLf(OPENING.windowW, OPENING.windowH, 4) +
      Math.max(0, i.garageDoors) * casingLf(i.garage.w, i.garage.h, 3),
  );
}

export function computeExterior(input: ExteriorInput): ExteriorResult {
  const wallSqFt = input.directSqFt == null ? Math.max(0, input.perimeterFt) * Math.max(0, input.wallHeightFt) : Math.max(0, input.directSqFt);
  const gableSqFt = input.directSqFt == null ? Math.max(0, Math.round(input.gables)) * gableArea(input.gableWidthFt, input.gableRiseFt) : 0;
  const grossSqFt = wallSqFt + gableSqFt;
  const openingsSqFt =
    Math.max(0, input.doors) * BRAND_CALC.swDoorSqFt +
    Math.max(0, input.windows) * BRAND_CALC.swWindowSqFt +
    Math.max(0, input.garageDoors) * Math.max(0, input.garage.w * input.garage.h);
  const sidingSqFt = Math.max(0, grossSqFt - openingsSqFt);
  const trimSqFt = trimArea(input.trimLf, input.trimIn);

  const s = siding(input.sidingId);
  const p = exteriorPaint(input.productId);
  const rate = input.rate > 0 ? input.rate : planRate(p);
  const coats = Math.max(1, Math.round(input.coats));
  const loss = Math.max(0, input.lossPct);
  const priced = resolvePrices(p, "exterior");
  const needs: Need[] = [];

  if (sidingSqFt > 0)
    needs.push(
      need({ key: "siding", label: "Siding", productId: p.id, productName: productName(p), areaSqFt: sidingSqFt, coats, rate: rate * s.factor, gallons: gallonsFor(sidingSqFt, coats, rate * s.factor, loss), priced }),
    );
  if (trimSqFt > 0)
    needs.push(need({ key: "trim", label: "Trim & fascia", productId: p.id, productName: `${productName(p)} (trim color)`, areaSqFt: trimSqFt, coats, rate, gallons: gallonsFor(trimSqFt, coats, rate, loss), priced }));

  if (input.primer && sidingSqFt + trimSqFt > 0) {
    const pp = exteriorPrimer(input.primerId);
    const roughStucco = s.id === "stucco-rough" && pp.roughStucco != null;
    const sidingRate = roughStucco ? pp.roughStucco! : pp.porous * s.factor;
    needs.push(
      need({
        key: "primer",
        label: "Primer",
        productId: pp.id,
        productName: productName(pp),
        areaSqFt: sidingSqFt + trimSqFt,
        coats: 1,
        rate: sidingRate,
        gallons: gallonsFor(sidingSqFt, 1, sidingRate, loss) + gallonsFor(trimSqFt, 1, pp.porous, loss),
        priced: resolvePrices(pp, "primer"),
      }),
    );
  }

  const finishAt = (r: number) => gallonsFor(sidingSqFt, coats, r * s.factor, loss) + gallonsFor(trimSqFt, coats, r, loss);
  const hi = p.rated[1];
  const swPerCoat = swGallonsPerCoat(sidingSqFt + trimSqFt, BRAND_CALC.swExterior);
  const rough = s.factor < 1;

  const supplies: SupplyLine[] = needs.length
    ? [
        ...rollerSupplies(needs.filter((n) => n.key !== "trim").length, rough ? "3/4 in" : "3/8 in", 2),
        { id: SUPPLY.tape.id, name: SUPPLY.tape.name, qty: Math.max(1, Math.ceil((Math.max(0, input.windows) * casingLf(OPENING.windowW, OPENING.windowH, 4)) / TAPE_FT_PER_ROLL)), unit: "rolls", price: SUPPLY.tape.price, note: "mask window glass and fixtures" },
        { id: SUPPLY.dropCloth.id, name: SUPPLY.dropCloth.name, qty: 2, unit: "cloths", price: SUPPLY.dropCloth.price, note: "move along the foundation, decks and walks" },
        { id: SUPPLY.pole.id, name: SUPPLY.pole.name, qty: 1, unit: "pole", price: SUPPLY.pole.price },
        ...(input.pre1978 ? [LEAD_KIT] : []),
      ]
    : [];

  const warnings: string[] = [];
  if (s.estimate) warnings.push(`${s.label}: ${s.note} Treat the result as an estimate and buy the last gallon or two after the first coat shows the real spread.`);
  if (loss >= SPRAY_LOSS_PCT) warnings.push(`Spraying: we added ${loss}% for overspray (makers' coverage excludes it). Back-roll or back-brush rough siding while it is wet.`);
  if (p.minTempF != null) warnings.push(`${productName(p)} can be applied down to ${p.minTempF}°F. Stay above it, and above the dew point, for the whole drying period.`);
  if (input.pre1978) warnings.push(LEAD_WARNING);
  if (coats === 1) warnings.push("One coat suits a same-color repaint with a premium self-priming line (SW Duration and Emerald Exterior call for 1 coat on repaints). Bare wood, a color change or chalky siding needs two.");

  const paintCost = costOf(needs);
  return {
    wallSqFt,
    gableSqFt,
    grossSqFt,
    openingsSqFt,
    sidingSqFt,
    trimSqFt,
    factor: s.factor,
    needs,
    paintCost,
    totalGallons: needs.reduce((t, n) => t + n.gallons, 0),
    range: { lowGal: finishAt(hi), highGal: finishAt(planRate(p)) },
    sw: { perCoat: swPerCoat, total: Math.round(swPerCoat * coats * 10) / 10 },
    supplies,
    suppliesCost: suppliesCost(supplies),
    warnings,
  };
}

/* ───────── deck & fence stain ───────── */

/**
 * Planning rate from a maker's range: middle of the range on new smooth wood, the low end on
 * weathered wood, and the low end × the Ready Seal rough/smooth ratio on rough-sawn boards —
 * unless the maker publishes rates by surface.
 */
export function stainRate(range: readonly [number, number], condition: WoodCondition, published?: Record<WoodCondition, number>): number {
  if (published) return published[condition];
  const [lo, hi] = range;
  if (condition === "new") return (lo + hi) / 2;
  if (condition === "rough") return lo * ROUGH_WOOD_FACTOR;
  return lo;
}

export interface StainAreaInput {
  mode: "deck" | "fence";
  deck: { l: number; w: number; railLf: number; railH: number; spindles: boolean; steps: number; stairW: number };
  fence: { lf: number; h: number; sides: number; styleFactor: number };
}

export interface StainAreas {
  floorSqFt: number;
  railSqFt: number;
  stairSqFt: number;
  fenceSqFt: number;
  totalSqFt: number;
}

export function stainAreas(i: StainAreaInput): StainAreas {
  if (i.mode === "fence") {
    const f = i.fence;
    const fenceSqFt = f.lf > 0 && f.h > 0 ? f.lf * f.h * Math.max(1, Math.round(f.sides)) * Math.max(1, f.styleFactor) : 0;
    return { floorSqFt: 0, railSqFt: 0, stairSqFt: 0, fenceSqFt, totalSqFt: fenceSqFt };
  }
  const d = i.deck;
  const floorSqFt = d.l > 0 && d.w > 0 ? d.l * d.w : 0;
  const railSqFt = d.railLf > 0 && d.railH > 0 ? d.railLf * d.railH * (d.spindles ? RAILING_FACTOR.spindles : RAILING_FACTOR.plain) : 0;
  const stairSqFt = d.steps > 0 && d.stairW > 0 ? Math.round(d.steps) * d.stairW * ((STAIR_STEP_IN.tread + STAIR_STEP_IN.riser) / 12) : 0;
  return { floorSqFt, railSqFt, stairSqFt, fenceSqFt: 0, totalSqFt: floorSqFt + railSqFt + stairSqFt };
}

export interface StainPlan {
  product: StainProduct;
  coats: number;
  rate1: number;
  rate2: number;
  coat1Gal: number;
  laterGal: number;
  gallons: number;
  priced: Priced;
  pack: PackPlan;
}

/** Gallons of one stain for an area: first coat at its rate, later coats at the (often thinner) second-coat rate. */
export function stainPlan(product: StainProduct, areaSqFt: number, condition: WoodCondition, coats: number, lossPct: number): StainPlan {
  const n = Math.min(product.maxCoats, Math.max(1, Math.round(coats)));
  const rate1 = stainRate(product.coat1, condition, product.byCondition);
  const rate2 = product.coat2 ? stainRate(product.coat2, condition) : rate1;
  const coat1Gal = gallonsFor(areaSqFt, 1, rate1, lossPct);
  const laterGal = gallonsFor(areaSqFt, n - 1, rate2, lossPct);
  const priced = resolvePrices(product, "stain");
  const gallons = coat1Gal + laterGal;
  return { product, coats: n, rate1, rate2, coat1Gal, laterGal, gallons, priced, pack: cheapestPack(gallons, priced) };
}

export interface StainInput extends StainAreaInput {
  productId: string;
  condition: WoodCondition;
  coats: number;
  lossPct: number;
}

export interface StainResult extends StainAreas, StainPlan {
  sw: { perCoat: number; total: number };
  olympic: string | null;
  /** every product of the same opacity on the same job, cheapest first */
  compare: StainPlan[];
  supplies: SupplyLine[];
  suppliesCost: number;
  warnings: string[];
}

export function computeStain(input: StainInput): StainResult {
  const areas = stainAreas(input);
  const product = stain(input.productId);
  const loss = Math.max(0, input.lossPct);
  const plan = stainPlan(product, areas.totalSqFt, input.condition, input.coats, loss);
  const compare = stainsFor(product.opacity)
    .map((p) => stainPlan(p, areas.totalSqFt, input.condition, p.coats, loss))
    .sort((a, b) => a.pack.cost - b.pack.cost);
  const swPerCoat = swGallonsPerCoat(areas.totalSqFt, BRAND_CALC.swDeck);
  const olympic = areas.totalSqFt > 0 ? (OLYMPIC_GUIDE.find((g) => areas.totalSqFt <= g.maxSqFt)?.label ?? null) : null;

  const supplies: SupplyLine[] =
    areas.totalSqFt > 0
      ? [
          ...rollerSupplies(1, input.condition === "rough" ? "3/4 in" : "3/8 in", 1),
          ...(input.mode === "deck" ? [{ id: SUPPLY.pole.id, name: SUPPLY.pole.name, qty: 1, unit: "pole", price: SUPPLY.pole.price, note: "for a roller or stain pad on the floor" }] : []),
          { id: "wood-cleaner", name: "Deck & wood cleaner / brightener", qty: 1, unit: "jug", note: "clean (and strip old coatings) first; check the label's coverage" },
          { id: SUPPLY.dropCloth.id, name: SUPPLY.dropCloth.name, qty: 1, unit: "cloth", price: SUPPLY.dropCloth.price, note: "protect siding, plants and pavers from drips" },
        ]
      : [];

  const warnings: string[] = [];
  if (product.coats === 1 && plan.coats === 1) warnings.push(`${product.brand} ${product.name}: ${product.coatsNote} A second coat on a one-coat stain sits on the surface and peels.`);
  if (input.condition === "new") warnings.push("New lumber: let it dry out first — Ready Seal asks for 12% moisture or less (14–15% in humid areas, where the wood may take only one coat). Clean off mill glaze so the stain can soak in (Behr).");
  if (loss >= SPRAY_LOSS_PCT) warnings.push(`Spraying: we added ${loss}% for overspray, which coverage figures leave out (Behr). Back-brush or back-roll right after spraying.`);
  if (product.minTempF != null) warnings.push(`Apply ${product.name} at ${product.minTempF}°F or warmer, with no rain in the forecast.`);
  if (olympic && input.mode === "deck") warnings.push(`Olympic's rule of thumb says ${olympic} for ${Math.round(areas.totalSqFt)} sq ft in any transparency — handy, but it ignores coats and wood condition, so we use each product's data sheet instead.`);

  return {
    ...areas,
    ...plan,
    sw: { perCoat: swPerCoat, total: Math.round(swPerCoat * plan.coats * 10) / 10 },
    olympic,
    compare,
    supplies,
    suppliesCost: suppliesCost(supplies),
    warnings,
  };
}
