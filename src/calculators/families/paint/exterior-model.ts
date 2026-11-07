// Shared (server + client) model for the exterior paint calculator: defaults and input mapping.

import { autoTrimLf, type ExteriorInput } from "./compute";

/** Defaults: a 2,000 sq ft two-story house on a 32 × 32 ft footprint (the worked example in our research). */
export const EXTERIOR_DEFAULTS = {
  measure: "footprint",
  len: 32,
  wid: 32,
  perim: 128,
  area: 2000,
  h: 18,
  gables: 2,
  gableW: 32,
  rise: 8,
  doors: 2,
  windows: 16,
  garage: 0,
  garageW: 16,
  garageH: 7,
  siding: "wood-lap",
  coats: 2,
  product: "typical-ext",
  cov: 300,
  trimAuto: true,
  trimLf: 300,
  trimIn: 6,
  primer: false,
  primerProduct: "sw-ext-wood",
  method: "roller",
  loss: 0,
  pre1978: false,
};

export type ExteriorValues = typeof EXTERIOR_DEFAULTS;

export function exteriorPerimeter(v: ExteriorValues): number {
  return v.measure === "footprint" ? 2 * (Math.max(0, v.len) + Math.max(0, v.wid)) : Math.max(0, v.perim);
}

export function exteriorInputFrom(v: ExteriorValues): ExteriorInput {
  const perimeterFt = exteriorPerimeter(v);
  const shape = {
    perimeterFt,
    gables: v.measure === "area" ? 0 : v.gables,
    gableWidthFt: v.gableW,
    gableRiseFt: v.rise,
    doors: v.doors,
    windows: v.windows,
    garageDoors: v.garage,
    garage: { w: v.garageW, h: v.garageH },
  };
  return {
    ...shape,
    wallHeightFt: v.h,
    directSqFt: v.measure === "area" ? v.area : null,
    sidingId: v.siding,
    trimLf: v.trimAuto ? autoTrimLf(shape) : v.trimLf,
    trimIn: v.trimIn,
    coats: v.coats,
    productId: v.product,
    rate: v.cov,
    primer: v.primer,
    primerId: v.primerProduct,
    lossPct: v.loss,
    pre1978: v.pre1978,
  };
}
