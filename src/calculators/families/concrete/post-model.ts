// Shared (server + client) model for the post-hole calculator: defaults and input mapping.

import type { PostBase, PostHoleInput } from "./compute";
import { POST_RULES, POST_TYPES, type BagSize } from "./data";

export const POST_DEFAULTS = {
  post: "4x4",
  /** round post diameter, in */
  dia: 4,
  /** hole diameter, in — 0 follows the 3× post-width rule */
  hole: 0,
  /** post height above ground, ft */
  above: 6,
  /** post depth in the ground, in — 0 follows the 1/3-of-length rule */
  embed: 0,
  base: "gravel",
  baseIn: POST_RULES.baseLayerIn as number,
  cap: POST_RULES.capIn as number,
  count: 1,
  waste: 10,
  product: "fast",
  bag: 50,
};

export type PostValues = typeof POST_DEFAULTS;

export function postType(v: Pick<PostValues, "post">) {
  return POST_TYPES.find((t) => t.id === v.post) ?? POST_TYPES[0];
}

/** "4×4", "5×5 vinyl", "3 in round" — how people name the post. */
export function postLabel(v: Pick<PostValues, "post" | "dia">): string {
  const t = postType(v);
  if (t.id === "round") return `${Math.round(v.dia * 100) / 100} in round`;
  return t.id === "5x5" ? "5×5 vinyl" : t.label;
}

/** Widest face of the post (or its diameter), inches. */
export function postWidthIn(v: Pick<PostValues, "post" | "dia">): number {
  const t = postType(v);
  return t.id === "round" ? v.dia : Math.max(t.w, t.d);
}

export function holeDiaFor(v: Pick<PostValues, "post" | "dia" | "hole">): number {
  return v.hole > 0 ? v.hole : postWidthIn(v) * POST_RULES.holeTimesPost;
}

export function embedFor(v: Pick<PostValues, "above" | "embed">): number {
  return v.embed > 0 ? v.embed : v.above * 12 * POST_RULES.embedPerAboveGround;
}

export function postInputFrom(v: PostValues): PostHoleInput {
  const t = postType(v);
  const round = t.id === "round";
  const base: PostBase = v.base === "drymix" || v.base === "none" ? v.base : "gravel";
  return {
    postShape: round ? "round" : "rect",
    postWIn: round ? v.dia : t.w,
    postDIn: round ? v.dia : t.d,
    holeDiaIn: holeDiaFor(v),
    aboveGroundIn: v.above * 12,
    embedIn: embedFor(v),
    base,
    baseIn: v.baseIn,
    capIn: v.cap,
    count: v.count,
    wastePct: v.waste,
    productId: v.product,
    bagSize: v.bag as BagSize,
  };
}

