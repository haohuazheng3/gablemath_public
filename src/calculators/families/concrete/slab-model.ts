// Shared (server + client) model for the slab calculator: defaults and input mapping.
// Kept out of the "use client" component so server pages can compute answers too.

import { DEFAULT_FEES, type Section } from "./compute";
import type { BagSize } from "./data";

export const SLAB_DEFAULTS = {
  project: "patio",
  shape: "rect",
  l1: 10,
  w1: 10,
  sections: 1,
  l2: 6,
  w2: 4,
  l3: 4,
  w3: 4,
  t: 4,
  waste: 10,
  product: "standard",
  bag: 80,
  count: 1,
  rebar: "none",
  base: true,
  rm: DEFAULT_FEES.pricePerYd,
  slf: DEFAULT_FEES.shortLoadFee,
  del: DEFAULT_FEES.deliveryFee,
  fuel: DEFAULT_FEES.fuelFee,
};

export type SlabValues = typeof SLAB_DEFAULTS;

export function slabInputFrom(v: SlabValues) {
  const sections: Section[] = [{ shape: v.shape === "circle" ? "circle" : "rect", l: v.l1, w: v.w1 }];
  if (v.sections >= 2) sections.push({ shape: "rect", l: v.l2, w: v.w2 });
  if (v.sections >= 3) sections.push({ shape: "rect", l: v.l3, w: v.w3 });
  return {
    sections,
    thicknessIn: v.t,
    wastePct: v.waste,
    productId: v.product,
    bagSize: v.bag as BagSize,
    count: v.count,
    rebar: (v.rebar === "patio" || v.rebar === "driveway" ? v.rebar : "none") as "none" | "patio" | "driveway",
    gravelBase: v.base,
    fees: { pricePerYd: v.rm, shortLoadUnderYd: DEFAULT_FEES.shortLoadUnderYd, shortLoadFee: v.slf, deliveryFee: v.del, fuelFee: v.fuel },
  };
}

