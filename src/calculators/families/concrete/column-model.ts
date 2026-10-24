// Shared (server + client) model for the column / Sonotube calculator: defaults and input mapping.

import { DEFAULT_FEES, type ColumnInput } from "./compute";
import type { BagSize } from "./data";

export const COLUMN_DEFAULTS = {
  /** tube diameter, in */
  dia: 12,
  /** concrete height in the tube, ft */
  len: 4,
  /** tube above finished grade, in */
  above: 6,
  count: 1,
  /** footing under the tube: thickness in inches, 0 = none */
  ftg: 0,
  /** footing diameter, in — 0 = the hole (2× the tube) */
  fdia: 0,
  waste: 10,
  product: "standard",
  bag: 80,
  rm: DEFAULT_FEES.pricePerYd,
  slf: DEFAULT_FEES.shortLoadFee,
  del: DEFAULT_FEES.deliveryFee,
  fuel: DEFAULT_FEES.fuelFee,
};

export type ColumnValues = typeof COLUMN_DEFAULTS;

export function columnInputFrom(v: ColumnValues): ColumnInput {
  return {
    diaIn: v.dia,
    lengthFt: v.len,
    aboveGradeIn: v.above,
    count: v.count,
    footingIn: v.ftg,
    footingDiaIn: v.fdia,
    wastePct: v.waste,
    productId: v.product,
    bagSize: v.bag as BagSize,
    fees: { pricePerYd: v.rm, shortLoadUnderYd: DEFAULT_FEES.shortLoadUnderYd, shortLoadFee: v.slf, deliveryFee: v.del, fuelFee: v.fuel },
  };
}
