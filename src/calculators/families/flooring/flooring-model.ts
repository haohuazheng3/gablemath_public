// Shared (server + client) model for the flooring calculator: defaults and input mapping.
// Kept out of the "use client" component so server pages can compute answers too.

import type { FlooringInput, Rect, RunAlong, Subfloor } from "./compute";
import { resolveProduct } from "./compute";
import { LABOR, type Complexity, type FloorType, type Layout, type TransitionKind, type TrimKind } from "./data";

export const MAX_AREAS = 6;

export const FLOORING_DEFAULTS = {
  type: "lvp",
  product: "lifeproof-87x48",
  /** custom product: sq ft per box, $/sq ft, attached pad */
  boxSqft: 20,
  psf: 2.98,
  pad: true,
  mode: "rooms",
  areas: 1,
  l1: 12,
  w1: 12,
  l2: 6,
  w2: 3,
  l3: 10,
  w3: 4,
  l4: 12,
  w4: 11,
  l5: 12,
  w5: 10,
  l6: 10,
  w6: 10,
  sqft: 1000,
  wallFt: 0,
  layout: "straight",
  dir: "length",
  complexity: "simple",
  wasteAuto: true,
  waste: 10,
  spare: 0,
  subfloor: "wood",
  doors: 1,
  doorW: 32,
  trans: "tmold",
  trim: "matched",
  steps: 0,
  stairW: 36,
  tread: 10,
  riser: 7.5,
  labor: LABOR.lvp.rate,
  removal: false,
};

export type FlooringValues = typeof FLOORING_DEFAULTS;

const TYPES: FloorType[] = ["lvp", "laminate", "engineered", "solid"];
const pick = <T extends string>(v: string, allowed: readonly T[], fallback: T): T => (allowed.includes(v as T) ? (v as T) : fallback);

export function flooringType(v: FlooringValues): FloorType {
  return pick(v.type, TYPES, "lvp");
}

export function flooringAreas(v: FlooringValues): Rect[] {
  const dims: [number, number][] = [
    [v.l1, v.w1],
    [v.l2, v.w2],
    [v.l3, v.w3],
    [v.l4, v.w4],
    [v.l5, v.w5],
    [v.l6, v.w6],
  ];
  const n = Math.min(MAX_AREAS, Math.max(1, Math.round(v.areas)));
  return dims.slice(0, n).map(([l, w]) => ({ l, w }));
}

export function flooringInputFrom(v: FlooringValues): FlooringInput {
  const type = flooringType(v);
  const roomsMode = v.mode !== "area";
  return {
    product: resolveProduct(v.product, type, { sqftPerBox: v.boxSqft, pricePerSqft: v.psf, attachedPad: v.pad }),
    areas: roomsMode ? flooringAreas(v) : [],
    totalSqft: roomsMode ? 0 : v.sqft,
    wallFt: roomsMode ? 0 : v.wallFt,
    layout: pick<Layout>(v.layout, ["straight", "diagonal", "herringbone"], "straight"),
    runAlong: pick<RunAlong>(v.dir, ["length", "width"], "length"),
    complexity: pick<Complexity>(v.complexity, ["simple", "average", "complex"], "simple"),
    wasteOverride: v.wasteAuto ? undefined : v.waste,
    spareBoxes: v.spare,
    subfloor: pick<Subfloor>(v.subfloor, ["wood", "slab", "basement"], "wood"),
    doors: v.doors,
    doorWidthIn: v.doorW,
    transition: pick<TransitionKind>(v.trans, ["tmold", "reducer"], "tmold"),
    trim: pick<TrimKind>(v.trim, ["matched", "paint", "none"], "matched"),
    stairs: { steps: v.steps, widthIn: v.stairW, treadIn: v.tread, riserIn: v.riser },
    laborPerSqft: v.labor,
    removal: v.removal,
  };
}
