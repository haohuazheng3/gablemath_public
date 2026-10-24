// Shared (server + client) model for the grout calculator.

import type { Preset } from "@/calculators/types";
import { fmt } from "@/lib/format";
import { autoGrout, describePlan, groutNeed, tileDims } from "./compute";
import { tileFormat } from "./data";

export const GROUT_DEFAULTS = {
  sqft: 100,
  size: "12x24",
  chip: 2,
  cl: 24,
  cw: 12,
  t: tileFormat("12x24").thickIn,
  joint: 0.125,
  grout: "auto",
};

export type GroutValues = typeof GROUT_DEFAULTS;

export function groutInputFrom(v: GroutValues) {
  const d = tileDims(v.size, { l: v.cl, w: v.cw, pcs: 1, t: v.t }, v.chip);
  return {
    areaSqFt: v.sqft,
    longIn: d.groutLongIn,
    shortIn: d.groutShortIn,
    thickIn: v.t > 0 ? v.t : d.thickIn,
    jointIn: v.joint,
    groutId: v.grout === "auto" ? autoGrout(v.joint) : v.grout,
  };
}

const spec = (slug: string, sqft: number, size: string, joint: number, label: string, h1: string, title: string, group: string): Preset<GroutValues> => {
  const f = tileFormat(size);
  const values: GroutValues = { ...GROUT_DEFAULTS, sqft, size, joint, t: f.thickIn };
  const r = groutNeed(groutInputFrom(values));
  return {
    slug,
    values,
    label,
    group,
    h1,
    metaTitle: title,
    metaDescription: `${fmt(sqft)} sq ft of ${f.label} tile with a ${joint === 0.125 ? "1/8" : joint} in joint takes about ${fmt(r.lb ?? 0, 1)} lb of ${r.grout.short} grout — buy ${describePlan(r.plan)}.`,
  };
};

export const GROUT_PRESETS: Preset<GroutValues>[] = [
  spec("3x6-subway-backsplash", 30, "3x6", 0.125, "30 sq ft 3×6 subway backsplash", "How much grout for a 3×6 subway tile backsplash?", "Grout for a 3x6 Subway Tile Backsplash (30 Sq Ft)", "Walls & backsplashes"),
  spec("12x24-floor-100-sq-ft", 100, "12x24", 0.125, "100 sq ft of 12×24, 1/8 in joint", "How much grout for 100 sq ft of 12×24 tile with a 1/8 joint?", "Grout for 100 Sq Ft of 12x24 Tile, 1/8 in Joint", "Floors"),
];
