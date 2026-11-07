// Shared (server + client) model for the fence cost calculator.

import type { FenceCostInput } from "./compute";
import { INSTALLED, type CostMaterialId } from "./data";

export const FENCE_COST_DEFAULTS = {
  len: 150,
  mat: "wood-privacy",
  h: 6,
  wg: 1,
  dg: 0,
  rem: false,
  stain: false,
  sides: 2,
  quote: 0,
};

export type FenceCostValues = typeof FENCE_COST_DEFAULTS;

function costMaterial(v: Pick<FenceCostValues, "mat">): CostMaterialId {
  return (INSTALLED.some((m) => m.id === v.mat) ? v.mat : "wood-privacy") as CostMaterialId;
}

export function fenceCostInputFrom(v: FenceCostValues): FenceCostInput {
  return {
    lengthFt: v.len,
    material: costMaterial(v),
    heightFt: v.h,
    walkGates: v.wg,
    driveGates: v.dg,
    removeOld: v.rem,
    stain: v.stain,
    stainSides: v.sides === 1 ? 1 : 2,
    quote: v.quote,
  };
}
