// Shared (server + client) model for the deck & fence stain calculator: defaults and input mapping.

import type { StainInput } from "./compute";
import { FENCE_STYLE, type WoodCondition } from "./data";

/** Defaults: a 12 × 16 ft deck with 44 ft of 3 ft balustered railing (SW's worked deck example) and 3 steps. */
export const STAIN_DEFAULTS = {
  mode: "deck",
  dl: 12,
  dw: 16,
  railings: true,
  railLf: 44,
  railH: 3,
  spindles: true,
  steps: 3,
  stairW: 4,
  fl: 100,
  fh: 6,
  sides: 2,
  style: "privacy",
  opacity: "semi",
  product: "typical-semi",
  cond: "weathered",
  coats: 2,
  method: "brush",
  loss: 0,
};

export type StainValues = typeof STAIN_DEFAULTS;

const CONDITIONS: WoodCondition[] = ["new", "weathered", "rough"];

export function stainInputFrom(v: StainValues): StainInput {
  return {
    mode: v.mode === "fence" ? "fence" : "deck",
    deck: { l: v.dl, w: v.dw, railLf: v.railings ? v.railLf : 0, railH: v.railH, spindles: v.spindles, steps: v.steps, stairW: v.stairW },
    fence: { lf: v.fl, h: v.fh, sides: v.sides, styleFactor: (FENCE_STYLE.find((s) => s.id === v.style) ?? FENCE_STYLE[0]).factor },
    productId: v.product,
    condition: CONDITIONS.includes(v.cond as WoodCondition) ? (v.cond as WoodCondition) : "weathered",
    coats: v.coats,
    lossPct: v.loss,
  };
}
