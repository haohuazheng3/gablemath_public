// Shared (server + client) model for the paver base calculator: defaults, base-type switching and input mapping.

import { AREA_DEFAULTS, areasFrom } from "./area-model";
import type { PaverInput } from "./compute";
import { DEFAULT_DELIVERY, DEFAULT_PAYLOAD_LB, PAVER, PAVER_BASES, PAVER_USES, SAND_TONS_PER_YD, aggregate, sandType } from "./data";

const CRUSHER = aggregate("crusher");
const CLEAR = aggregate("57");
/** 1/8 in chip bedding weighs like small clean stone: Mulch Pros #89 scale weight 2,800 lb/yd³. */
const CHIP_TONS_PER_YD = 1.4;

export const PAVER_DEFAULTS = {
  ...AREA_DEFAULTS,
  l1: 12,
  w1: 12,
  a1: 144,
  use: "patio",
  base: "crusher",
  /** Compacted base depth, bedding depth and paver thickness, inches. */
  bd: PAVER_USES[0].baseIn,
  sd: PAVER.beddingIn as number,
  pv: PAVER.paverIn as number,
  cf: CRUSHER.compaction ?? 1,
  den: CRUSHER.tonsPerYd,
  ext: PAVER.extendIn as number,
  wall: 0,
  extra: PAVER.wastePct as number,
  u: CRUSHER.sellBy as string,
  p: CRUSHER.price,
  bp: CRUSHER.bagPrice ?? 0,
  sp: sandType("leveling").bagPrice ?? 0,
  del: DEFAULT_DELIVERY,
  payload: DEFAULT_PAYLOAD_LB,
  buy: "auto",
};

export type PaverValues = typeof PAVER_DEFAULTS;

export function paverUse(id: string) {
  return PAVER_USES.find((u) => u.id === id) ?? PAVER_USES[0];
}

export function paverBase(id: string) {
  return PAVER_BASES.find((b) => b.id === id) ?? PAVER_BASES[0];
}

export function basePatch(id: string): Partial<PaverValues> {
  const clear = id === "clear";
  const m = clear ? CLEAR : CRUSHER;
  return {
    base: clear ? "clear" : "crusher",
    cf: m.compaction ?? 1,
    den: m.tonsPerYd,
    u: m.sellBy,
    p: m.price,
    bp: m.bagPrice ?? 0,
    // Chip-stone bedding has no dated bag price; sand bedding does.
    sp: clear ? 0 : (sandType("leveling").bagPrice ?? 0),
  };
}

export function paverInputFrom(v: PaverValues): PaverInput {
  const use = paverUse(v.use);
  const base = paverBase(v.base);
  return {
    areas: areasFrom(v),
    count: v.count,
    baseIn: v.bd,
    beddingIn: v.sd,
    paverIn: v.pv,
    base: base.id,
    recommended: use.range,
    useLabel: use.label,
    compaction: v.cf,
    tonsPerYd: v.den,
    extendIn: v.ext,
    wallFt: v.wall,
    extraPct: v.extra,
    unit: v.u === "yd" ? "yd" : "ton",
    price: v.p,
    baseBagPrice: v.bp,
    beddingBagPrice: v.sp,
    deliveryFee: v.del,
    payloadLb: v.payload,
    bagCuft: PAVER.bagCuft,
    beddingTonsPerYd: base.id === "clear" ? CHIP_TONS_PER_YD : SAND_TONS_PER_YD,
  };
}
