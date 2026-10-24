// Shared (server + client) model for the footing calculator: defaults and input mapping.

import { DEFAULT_FEES, type FootingInput } from "./compute";
import type { BagSize } from "./data";

export const FOOTING_DEFAULTS = {
  type: "wall",
  /** total run of continuous footing, ft */
  len: 40,
  w: 16,
  t: 8,
  /** wall or block width on top, in (0 skips the projection check) */
  wall: 8,
  bars: 2,
  pads: 6,
  pl: 24,
  pw: 24,
  pt: 12,
  forms: false,
  waste: 10,
  product: "standard",
  bag: 80,
  rm: DEFAULT_FEES.pricePerYd,
  slf: DEFAULT_FEES.shortLoadFee,
  del: DEFAULT_FEES.deliveryFee,
  fuel: DEFAULT_FEES.fuelFee,
};

export type FootingValues = typeof FOOTING_DEFAULTS;

export function footingInputFrom(v: FootingValues): FootingInput {
  return {
    kind: v.type === "pad" ? "pad" : "wall",
    lengthFt: v.len,
    widthIn: v.w,
    thickIn: v.t,
    wallIn: v.wall,
    bars: v.bars,
    padCount: v.pads,
    padLengthIn: v.pl,
    padWidthIn: v.pw,
    padThickIn: v.pt,
    forms: v.forms,
    wastePct: v.waste,
    productId: v.product,
    bagSize: v.bag as BagSize,
    fees: { pricePerYd: v.rm, shortLoadUnderYd: DEFAULT_FEES.shortLoadUnderYd, shortLoadFee: v.slf, deliveryFee: v.del, fuelFee: v.fuel },
  };
}
