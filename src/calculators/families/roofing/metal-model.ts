// Shared (server + client) model for the metal roofing calculator.

import type { MetalInput } from "./compute";

export const METAL_DEFAULTS = {
  l: 40,
  w: 30,
  style: "gable",
  pitch: 4,
  eave: 12,
  rake: 12,
  profile: "r-panel",
  stock: false,
  under: true,
};

export type MetalValues = typeof METAL_DEFAULTS;

export function metalInputFrom(v: MetalValues): MetalInput {
  return {
    lengthFt: v.l,
    widthFt: v.w,
    style: v.style === "shed" ? "shed" : "gable",
    rise: v.pitch,
    eaveOverhangIn: v.eave,
    rakeOverhangIn: v.rake,
    profileId: v.profile,
    stockLengths: v.stock,
    underlayment: v.under,
  };
}
