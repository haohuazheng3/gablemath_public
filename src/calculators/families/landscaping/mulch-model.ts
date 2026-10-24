// Shared (server + client) model for the mulch calculator: defaults, mode switching and input mapping.

import { AREA_DEFAULTS, areasFrom } from "./area-model";
import { bagPriceFor, type MulchInput, type MulchMode } from "./compute";
import { DEFAULT_DELIVERY, MULCH_TYPES, PLAY_INITIAL_IN, TREE_RING, mulchType, type MulchId } from "./data";

const DYED = mulchType("dyed");

export const MULCH_DEFAULTS = {
  ...AREA_DEFAULTS,
  /** Trunk diameter for tree rings, inches. */
  tr: 6,
  mode: "bed",
  mat: DYED.id as string,
  d: DYED.defaultDepth,
  /** Existing mulch depth (top-up mode), inches. */
  ex: 2,
  bag: DYED.defaultBag,
  bp: DYED.bagPrice[DYED.defaultBag],
  bulk: DYED.bulkPerYd ?? 0,
  del: DEFAULT_DELIVERY,
  extra: 0,
  buy: "auto",
};

export type MulchValues = typeof MULCH_DEFAULTS;

/** Which mulches each mode offers (playgrounds need CPSC-listed loose fill). */
export const MODE_MATERIALS: Record<MulchMode, MulchId[]> = {
  bed: ["dyed", "hardwood", "pinebark", "cypress", "compost", "rubber", "pinestraw"],
  ring: ["dyed", "hardwood", "pinebark", "cypress", "compost", "pinestraw"],
  topup: ["dyed", "hardwood", "pinebark", "cypress", "compost", "rubber"],
  play: ["playground", "hardwood", "rubber"],
};

export function mulchMode(v: string): MulchMode {
  return v === "ring" || v === "topup" || v === "play" ? v : "bed";
}

function depthFor(id: MulchId, mode: MulchMode): number {
  if (mode === "play") return id === "rubber" ? 6 : PLAY_INITIAL_IN;
  if (mode === "ring") return TREE_RING.depthIn;
  return mulchType(id).defaultDepth;
}

export function materialPatch(id: string, mode: MulchMode): Partial<MulchValues> {
  const t = mulchType(id);
  return {
    mat: t.id,
    bag: t.defaultBag,
    bp: bagPriceFor(t.bagPrice, t.defaultBag).price ?? 0,
    bulk: t.bulkPerYd ?? 0,
    d: depthFor(t.id, mode),
  };
}

export function bagPatch(matId: string, size: number): Partial<MulchValues> {
  return { bag: size, bp: bagPriceFor(mulchType(matId).bagPrice, size).price ?? 0 };
}

/** Switch mode, keeping the user's dimensions wherever the shape still applies. */
export function modePatch(next: MulchMode, v: MulchValues): Partial<MulchValues> {
  const allowed = MODE_MATERIALS[next];
  const mat = allowed.includes(v.mat as MulchId) ? v.mat : allowed[0];
  const patch: Partial<MulchValues> = { mode: next, ...materialPatch(mat, next) };
  if (next === "ring") return { ...patch, shape: "ring", l1: 2 * TREE_RING.minRadiusFt, sections: 1 };
  if (next === "play") return { ...patch, shape: "rect", l1: 10, w1: 12, sections: 1 };
  if (next === "topup") Object.assign(patch, { d: 3, ex: 2 });
  return v.shape === "ring" || v.mode === "play" ? { ...patch, shape: "rect", l1: 10, w1: 10 } : patch;
}

export function mulchInputFrom(v: MulchValues): MulchInput {
  const mode = mulchMode(v.mode);
  const id = MULCH_TYPES.some((m) => m.id === v.mat) ? (v.mat as MulchId) : DYED.id;
  return {
    mode,
    areas: mode === "play" ? areasFrom({ ...v, shape: "rect" }) : areasFrom(v),
    count: v.count,
    depthIn: v.d,
    existingIn: v.ex,
    material: id,
    bagCuft: v.bag,
    bagPrice: v.bp,
    bulkPerYd: v.bulk,
    deliveryFee: v.del,
    extraPct: v.extra,
  };
}
