// Shared (server + client) model for the thinset calculator.

import type { Preset } from "@/calculators/types";
import { fmt, fmtInt } from "@/lib/format";
import { autoMortar, autoTrowel, needsBackButter, thinsetBags, tileDims } from "./compute";
import { MORTAR_WASTE_PCT, tileFormat, type TrowelId } from "./data";

export const THINSET_DEFAULTS = {
  sqft: 100,
  size: "12x24",
  trowel: "auto",
  mortar: "auto",
  bb: true,
  waste: MORTAR_WASTE_PCT,
};

export type ThinsetValues = typeof THINSET_DEFAULTS;

export function thinsetInputFrom(v: ThinsetValues) {
  const d = tileDims(v.size);
  return {
    areaSqFt: v.sqft,
    mortarId: v.mortar === "auto" ? autoMortar(d) : v.mortar,
    trowelId: (v.trowel === "auto" ? autoTrowel(d) : v.trowel) as TrowelId,
    backButter: v.bb,
    wastePct: v.waste,
    longIn: d.longIn,
  };
}

const spec = (slug: string, sqft: number, size: string, label: string, h1: string, title: string, group: string): Preset<ThinsetValues> => {
  const values: ThinsetValues = { ...THINSET_DEFAULTS, sqft, size, bb: needsBackButter(tileFormat(size).longIn) };
  const i = thinsetInputFrom(values);
  const r = thinsetBags(i);
  return {
    slug,
    values,
    label,
    group,
    h1,
    metaTitle: title,
    metaDescription: `${fmt(sqft)} sq ft of ${tileFormat(size).label} tile needs ${fmtInt(r.bags)} bag${r.bags === 1 ? "" : "s"} of ${r.mortar.short} thinset (${fmt(r.cov, 0)} sq ft per bag with the recommended trowel). Compare trowels and brands.`,
  };
};

export const THINSET_PRESETS: Preset<ThinsetValues>[] = [
  spec("100-sq-ft-12x24", 100, "12x24", "100 sq ft of 12×24", "How much thinset for 100 sq ft of 12×24 tile?", "Thinset for 100 Sq Ft of 12x24 Tile: Bags by Trowel", "Floors"),
  spec("200-sq-ft-12x12", 200, "12x12", "200 sq ft of 12×12", "How many bags of thinset for 200 sq ft of 12×12 tile?", "Thinset for 200 Sq Ft of 12x12 Tile", "Floors"),
  spec("50-sq-ft-backsplash", 50, "3x6", "50 sq ft subway backsplash", "How much thinset for a 50 sq ft backsplash?", "Thinset for a 50 Sq Ft Subway Tile Backsplash", "Walls & backsplashes"),
];
