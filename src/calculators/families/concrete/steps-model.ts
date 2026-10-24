// Shared (server + client) model for the concrete steps calculator: defaults and input mapping.

import { DEFAULT_FEES, stepsForRise, type StepsInput } from "./compute";
import type { BagSize } from "./data";

export const STEPS_DEFAULTS = {
  /** "steps" = enter the number of steps and the rise; "height" = enter the total height */
  mode: "steps",
  n: 3,
  rise: 7,
  /** total rise from ground to the top surface, in (height mode) */
  height: 21,
  run: 11,
  /** ft */
  width: 4,
  /** "landing" = pour a new landing on top; "existing" = steps up to an existing porch or slab */
  top: "landing",
  land: 36,
  base: true,
  waste: 10,
  product: "standard",
  bag: 80,
  rm: DEFAULT_FEES.pricePerYd,
  slf: DEFAULT_FEES.shortLoadFee,
  del: DEFAULT_FEES.deliveryFee,
  fuel: DEFAULT_FEES.fuelFee,
};

export type StepsValues = typeof STEPS_DEFAULTS;

/** Steps and rise actually used, after solving from the total height in height mode. */
export function stepLayout(v: Pick<StepsValues, "mode" | "n" | "rise" | "height">): { steps: number; riseIn: number } {
  return v.mode === "height" ? stepsForRise(v.height) : { steps: Math.max(0, Math.round(v.n)), riseIn: v.rise };
}

export function stepsInputFrom(v: StepsValues): StepsInput {
  const { steps, riseIn } = stepLayout(v);
  return {
    steps,
    riseIn,
    runIn: v.run,
    widthFt: v.width,
    top: v.top === "existing" ? "existing" : "landing",
    landingIn: v.land,
    gravelBase: v.base,
    wastePct: v.waste,
    productId: v.product,
    bagSize: v.bag as BagSize,
    fees: { pricePerYd: v.rm, shortLoadUnderYd: DEFAULT_FEES.shortLoadUnderYd, shortLoadFee: v.slf, deliveryFee: v.del, fuelFee: v.fuel },
  };
}
