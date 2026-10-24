// Shared (server + client) model for the wood & vinyl fence calculator: defaults and input mapping.
// Kept out of the "use client" component so server pages can compute answers too.

import type { FenceInput, SettingMethod } from "./compute";
import { BOB_OVERLAP_IN, STYLES, VINYL_CENTERS_8FT_IN, WOOD_MAX_SPACING_FT, type FenceStyle, type MixId, type WoodSpecies } from "./data";
import { LAYOUT_DEFAULTS, gatesFrom, runsFrom } from "./layout-model";

export const FENCE_DEFAULTS = {
  ...LAYOUT_DEFAULTS,
  style: "privacy",
  h: STYLES.privacy.heightFt,
  sp: WOOD_MAX_SPACING_FT,
  vc: VINYL_CENTERS_8FT_IN,
  pw: STYLES.privacy.picketWidthIn,
  gap: STYLES.privacy.gapIn,
  ov: BOB_OVERLAP_IN,
  wood: "pt",
  rails: 0,
  gp6: true,
  hole: 0,
  emb: 0,
  frost: 0,
  set: "concrete",
  mix: "fs50",
  waste: 10,
};

export type FenceValues = typeof FENCE_DEFAULTS;

export const FENCE_STYLE_IDS = Object.keys(STYLES) as FenceStyle[];

export function fenceStyle(v: Pick<FenceValues, "style">): FenceStyle {
  return FENCE_STYLE_IDS.includes(v.style as FenceStyle) ? (v.style as FenceStyle) : "privacy";
}

/** Values to apply when the user switches style, so each style starts from its usual build. */
export function styleDefaults(style: FenceStyle): Partial<FenceValues> {
  const s = STYLES[style];
  return { style, h: s.heightFt, pw: s.picketWidthIn, gap: s.gapIn, ...(style === "vinyl" ? { vc: VINYL_CENTERS_8FT_IN } : {}) };
}

export function fenceInputFrom(v: FenceValues): FenceInput {
  return {
    style: fenceStyle(v),
    runs: runsFrom(v),
    loop: v.loop,
    heightFt: v.h,
    spacingFt: v.sp,
    vinylCentersIn: v.vc,
    picketWidthIn: v.pw,
    gapIn: v.gap,
    overlapIn: v.ov,
    species: (v.wood === "cedar" ? "cedar" : "pt") as WoodSpecies,
    railsOverride: v.rails,
    gates: gatesFrom(v),
    gatePosts6x6: v.gp6,
    holeIn: v.hole,
    embedIn: v.emb,
    frostIn: v.frost,
    setting: (["concrete", "mixed", "gravel"].includes(v.set) ? v.set : "concrete") as SettingMethod,
    mixId: (v.mix === "cm80" ? "cm80" : "fs50") as MixId,
    wastePct: v.waste,
  };
}
