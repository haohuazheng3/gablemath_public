// Shared (server + client) model for the backer board calculator.

import type { Preset } from "@/calculators/types";
import { fmt, fmtInt } from "@/lib/format";
import { backerPlan, type BackerSurface } from "./compute";

export const BACKER_DEFAULTS = {
  sqft: 40,
  surface: "floor",
  board: "hardie-14",
};

export type BackerValues = typeof BACKER_DEFAULTS;

export function backerInputFrom(v: BackerValues) {
  return { areaSqFt: v.sqft, backerId: v.board, surface: (v.surface === "wall" ? "wall" : "floor") as BackerSurface };
}

const spec = (slug: string, sqft: number, surface: string, board: string, label: string, h1: string, title: string): Preset<BackerValues> => {
  const values: BackerValues = { sqft, surface, board };
  const r = backerPlan(backerInputFrom(values));
  return {
    slug,
    values,
    label,
    group: surface === "floor" ? "Floors" : "Showers & tub surrounds",
    h1,
    metaTitle: title,
    metaDescription: `${fmt(sqft)} sq ft of ${surface} takes ${fmtInt(r.sheets)} sheets of ${r.backer.short} (10% extra) and about ${fmtInt(r.fasteners)} screws${r.under ? `, plus ${fmtInt(r.under.bags)} bag of thinset underneath` : ""}.`,
  };
};

export const BACKER_PRESETS: Preset<BackerValues>[] = [
  spec("5x8-bathroom-floor", 40, "floor", "hardie-14", "5×8 bathroom floor", "How much cement board for a 5×8 bathroom floor?", "Cement Board for a 5x8 Bathroom Floor"),
  spec("tub-surround", 60, "wall", "durock-12", "5-ft tub surround", "How many sheets of cement board for a tub surround?", "Cement Board for a Tub Surround: Sheets & Screws"),
  spec("3x5-shower", 77, "wall", "hardie-500", "3×5 shower walls", "How many sheets of HardieBacker for a 3×5 shower?", "HardieBacker for a 3x5 Shower: Sheets & Screws"),
];
