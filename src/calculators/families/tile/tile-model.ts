// Shared (server + client) model for the tile calculator: defaults, input mapping and curated presets.

import type { Preset } from "@/calculators/types";
import { fmt, fmtInt } from "@/lib/format";
import { computeTile, type Rect, type TileInput } from "./compute";
import { WASTE_RULES, tileFormat, type PatternId, type ProjectId, type TrowelId, type WaterproofId } from "./data";

export const TILE_DEFAULTS = {
  project: "floor",
  n: 1,
  l1: 5,
  w1: 8,
  l2: 8,
  w2: 7,
  l3: 3,
  w3: 7,
  l4: 3,
  w4: 7,
  o: 0,
  ow1: 3,
  oh1: 7,
  ow2: 3,
  oh2: 3,
  size: "12x24",
  chip: 2,
  cl: 24,
  cw: 12,
  cpcs: 8,
  ct: 0.375,
  joint: 0.125,
  pattern: "straight",
  waste: 0,
  attic: false,
  trowel: "auto",
  mortar: "auto",
  grout: "auto",
  backer: "hardie-14",
  wp: "none",
};

export type TileValues = typeof TILE_DEFAULTS;

/** Board and membrane that usually go with each kind of job. */
export const PROJECT_SETUP: Record<ProjectId, { label: string; backer: string; wp: string; surface: string; note: string }> = {
  floor: { label: "Floor", backer: "hardie-14", wp: "none", surface: "Floor area", note: "Over a wood subfloor, 1/4 in cement board set in thinset is the usual base." },
  shower: { label: "Shower walls", backer: "hardie-500", wp: "redgard", surface: "Wall", note: "Enter each wall as width × tiled height (84 in = 7 ft is common)." },
  walls: { label: "Walls", backer: "none", wp: "none", surface: "Wall", note: "Dry walls can be tiled over sound, primed drywall." },
  backsplash: { label: "Backsplash", backer: "none", wp: "none", surface: "Run", note: "Enter each run as length × height (18 in = 1.5 ft from counter to upper cabinets)." },
};

export function tileInputFrom(v: TileValues): TileInput {
  const all: Rect[] = [
    { l: v.l1, w: v.w1 },
    { l: v.l2, w: v.w2 },
    { l: v.l3, w: v.w3 },
    { l: v.l4, w: v.w4 },
  ];
  const ops: Rect[] = [
    { l: v.ow1, w: v.oh1 },
    { l: v.ow2, w: v.oh2 },
  ];
  const project = (v.project in PROJECT_SETUP ? v.project : "floor") as ProjectId;
  return {
    project,
    surfaces: all.slice(0, Math.min(4, Math.max(1, v.n))),
    openings: ops.slice(0, Math.min(2, Math.max(0, v.o))),
    sizeId: v.size,
    custom: { l: v.cl, w: v.cw, pcs: v.cpcs, t: v.ct },
    chipIn: v.chip,
    price: tileFormat(v.size).price,
    jointIn: v.joint,
    pattern: v.pattern as PatternId,
    wastePct: v.waste > 0 ? v.waste : null,
    atticPct: v.attic ? WASTE_RULES.atticPct : 0,
    trowelId: v.trowel as TrowelId | "auto",
    mortarId: v.mortar,
    groutId: v.grout,
    backerId: v.backer,
    waterproof: v.wp as WaterproofId | "none",
  };
}

/** Values for a tile size: the suggested joint comes from the carton. */
export function sizeValues(size: string): Pick<TileValues, "size" | "joint"> {
  const f = tileFormat(size);
  return { size: f.id, joint: f.jointIn };
}

type Spec = { slug: string; group: string; label: string; h1: string; title: string; v: Partial<TileValues> };

const floor = (l: number, w: number, size: string, pattern = "straight"): Partial<TileValues> => ({ project: "floor", n: 1, l1: l, w1: w, ...sizeValues(size), pattern, backer: "hardie-14", wp: "none" });
const walls = (project: "shower" | "backsplash", rects: [number, number][], size: string, pattern: string): Partial<TileValues> => {
  const v: Partial<TileValues> = { project, n: rects.length, ...sizeValues(size), pattern, backer: PROJECT_SETUP[project].backer, wp: PROJECT_SETUP[project].wp };
  rects.forEach(([l, w], k) => Object.assign(v, { [`l${k + 1}`]: l, [`w${k + 1}`]: w }));
  return v;
};

const SPECS: Spec[] = [
  { slug: "5x8-bathroom-floor", group: "Bathroom floors", label: "5×8 bathroom floor, 12×24", h1: "How many tiles for a 5×8 bathroom floor?", title: "Tile for a 5x8 Bathroom Floor (12x24)", v: floor(5, 8, "12x24") },
  { slug: "8x10-bathroom-floor", group: "Bathroom floors", label: "8×10 bathroom floor, 12×24", h1: "How many tiles for an 8×10 bathroom floor?", title: "Tile for an 8x10 Bathroom Floor (12x24)", v: floor(8, 10, "12x24") },
  { slug: "10x10-bathroom-floor", group: "Bathroom floors", label: "10×10 bathroom floor, 12×12", h1: "How many 12×12 tiles for a 10×10 bathroom?", title: "Tile for a 10x10 Bathroom Floor (12x12)", v: floor(10, 10, "12x12") },
  { slug: "100-sq-ft-12x24", group: "Floors by square footage", label: "100 sq ft of 12×24", h1: "How many boxes of 12×24 tile for 100 sq ft?", title: "How Many 12x24 Tiles for 100 Sq Ft?", v: floor(10, 10, "12x24") },
  { slug: "120-sq-ft-12x12", group: "Floors by square footage", label: "120 sq ft of 12×12", h1: "How many 12×12 tiles for 120 sq ft?", title: "How Many 12x12 Tiles for 120 Sq Ft?", v: floor(10, 12, "12x12") },
  { slug: "10x12-room-12x24", group: "Floors by square footage", label: "10×12 room, 12×24", h1: "How many 12×24 tiles for a 10×12 room?", title: "12x24 Tiles for a 10x12 Room: Boxes & Cost", v: floor(10, 12, "12x24") },
  { slug: "100-sq-ft-6x24-herringbone", group: "Floors by square footage", label: "100 sq ft 6×24 herringbone", h1: "How much 6×24 plank tile for 100 sq ft of herringbone?", title: "6x24 Herringbone Tile for 100 Sq Ft: Waste & Boxes", v: floor(10, 10, "6x24", "herringbone") },
  { slug: "3x5-shower-walls", group: "Showers & tub surrounds", label: "3×5 shower walls, 3×6 subway", h1: "How much tile for 3×5 shower walls?", title: "Tile for 3x5 Shower Walls: Subway, Thinset, Grout", v: walls("shower", [[3, 7], [5, 7], [3, 7]], "3x6", "offset12") },
  { slug: "5x8-shower-walls", group: "Showers & tub surrounds", label: "5×8 walk-in shower walls, 12×24", h1: "How much tile for a 5×8 walk-in shower?", title: "Tile for 5x8 Shower Walls (12x24): Boxes & Supplies", v: walls("shower", [[5, 7], [8, 7], [5, 7]], "12x24", "offset13") },
  { slug: "tub-surround", group: "Showers & tub surrounds", label: "5-ft tub surround, 4×12", h1: "How much tile for a 60-inch tub surround?", title: "Tile for a 5 ft Tub Surround: Boxes & Backer", v: walls("shower", [[2.5, 6], [5, 6], [2.5, 6]], "4x12", "offset12") },
  { slug: "kitchen-backsplash-30-sq-ft-3x6-subway", group: "Backsplashes", label: "30 sq ft backsplash, 3×6 subway", h1: "How many 3×6 subway tiles for a 30 sq ft backsplash?", title: "3x6 Subway Tile for a 30 Sq Ft Backsplash", v: walls("backsplash", [[20, 1.5]], "3x6", "offset12") },
];

export const TILE_PRESETS: Preset<TileValues>[] = SPECS.map((s) => {
  const values: TileValues = { ...TILE_DEFAULTS, ...s.v };
  const r = computeTile(tileInputFrom(values));
  const unit = r.dims.sheet ? "sheets" : "boxes";
  return {
    slug: s.slug,
    values,
    group: s.group,
    label: s.label,
    h1: s.h1,
    metaTitle: s.title,
    metaDescription: `${fmt(r.area.net)} sq ft of ${r.dims.format.label} tile: ${fmtInt(r.tiles.pieces)} pieces with ${fmt(r.waste, 0)}% waste = ${fmtInt(r.tiles.boxes)} ${unit}, ${fmtInt(r.thinset.bags)} bag${r.thinset.bags === 1 ? "" : "s"} of thinset, ${fmt(r.grout.lb ?? 0, 1)} lb of grout.`,
  };
});
