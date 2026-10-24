// Shared (server + client) model for the shingle roofing calculator: defaults and input mapping.
// Kept out of the "use client" component so server pages can compute answers too.

import type { RoofInput, RoofStyle, IceWaterPlan } from "./compute";
import { ICE_WATER, INSTALL_EXTRAS, INSTALLED_PER_SQUARE, type OldRoof } from "./data";

export const ROOFING_DEFAULTS = {
  mode: "footprint",
  l: 40,
  w: 30,
  oh: 12,
  style: "gable",
  pitch: 6,
  valleys: 0,
  // "roof area / report" mode — prefilled from the footprint when the user switches
  area: 1503,
  eaves: 84,
  rakes: 72,
  ridge: 42,
  hips: 0,
  product: "generic",
  bps: 4,
  wasteAuto: true,
  waste: 10,
  rakeStarter: true,
  under: "synthetic",
  iw: "eaves",
  wall: ICE_WATER.wallDefaultIn,
  roll: 65,
  nails: 4,
  vent: true,
  layers: 1,
  old: "laminate",
  inst: INSTALLED_PER_SQUARE.architectural.typical,
  permit: INSTALL_EXTRAS.permit,
};

export type RoofingValues = typeof ROOFING_DEFAULTS;

const STYLES: RoofStyle[] = ["gable", "hip", "complex"];
const ICE: IceWaterPlan[] = ["eaves", "valleys", "none"];
const OLD: OldRoof[] = ["3-tab", "laminate", "premium"];

export function roofingInputFrom(v: RoofingValues): RoofInput {
  return {
    mode: v.mode === "area" ? "area" : "footprint",
    lengthFt: v.l,
    widthFt: v.w,
    overhangIn: v.oh,
    style: STYLES.includes(v.style as RoofStyle) ? (v.style as RoofStyle) : "gable",
    rise: v.pitch,
    areaSqFt: v.area,
    edges: { eaves: v.eaves, rakes: v.rakes, ridge: v.ridge, hips: v.hips, valleys: v.valleys },
    valleysFt: v.valleys,
    productId: v.product,
    customBundlesPerSquare: v.bps,
    wastePct: v.wasteAuto ? null : v.waste,
    starterOnRakes: v.rakeStarter,
    underlaymentId: v.under,
    iceWater: ICE.includes(v.iw as IceWaterPlan) ? (v.iw as IceWaterPlan) : "eaves",
    wallIn: v.wall,
    iceRollFt: v.roll,
    nailsPerShingle: v.nails,
    ridgeVent: v.vent,
    layers: v.layers,
    oldRoof: OLD.includes(v.old as OldRoof) ? (v.old as OldRoof) : "laminate",
    installedPerSquare: v.inst,
    permit: v.permit,
  };
}
