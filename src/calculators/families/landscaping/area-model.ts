// Shared (server + client) area inputs used by every landscaping calculator: up to three
// rectangles, or one circle / tree ring / known square footage, times a number of copies.

import type { Area } from "./compute";

export const AREA_DEFAULTS = {
  shape: "rect",
  l1: 10,
  w1: 10,
  a1: 100,
  sections: 1,
  l2: 6,
  w2: 4,
  l3: 4,
  w3: 4,
  count: 1,
};

export interface AreaValues {
  shape: string;
  l1: number;
  w1: number;
  a1: number;
  sections: number;
  l2: number;
  w2: number;
  l3: number;
  w3: number;
  count: number;
  /** Tree ring only: trunk diameter in inches. */
  tr?: number;
}

/** Extra rectangles only make sense for drawn shapes (L-shapes, side beds). */
export function allowsSections(shape: string): boolean {
  return shape === "rect" || shape === "circle";
}

export function areasFrom(v: AreaValues): Area[] {
  const first: Area =
    v.shape === "circle"
      ? { shape: "circle", d: v.l1 }
      : v.shape === "ring"
        ? { shape: "ring", d: v.l1, trunkIn: v.tr ?? 0 }
        : v.shape === "sqft"
          ? { shape: "sqft", sqft: v.a1 }
          : { shape: "rect", l: v.l1, w: v.w1 };
  const out: Area[] = [first];
  if (allowsSections(v.shape)) {
    if (v.sections >= 2) out.push({ shape: "rect", l: v.l2, w: v.w2 });
    if (v.sections >= 3) out.push({ shape: "rect", l: v.l3, w: v.w3 });
  }
  return out;
}

/** "10×12 ft", "8 ft round", "200 sq ft" — used in titles and saved-project summaries. */
export function areaLabel(v: AreaValues, fmtLen: (ft: number) => string): string {
  const base =
    v.shape === "circle"
      ? `${fmtLen(v.l1)} round`
      : v.shape === "ring"
        ? `${fmtLen(v.l1)} tree ring`
        : v.shape === "sqft"
          ? `${Math.round(v.a1)} sq ft`
          : `${fmtLen(v.l1)} × ${fmtLen(v.w1)}`;
  const extra = allowsSections(v.shape) && v.sections > 1 ? ` + ${v.sections - 1} more area${v.sections > 2 ? "s" : ""}` : "";
  return `${v.count > 1 ? `${v.count} × ` : ""}${base}${extra}`;
}
