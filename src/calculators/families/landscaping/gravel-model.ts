// Shared (server + client) model for the gravel calculator: defaults, use presets and input mapping.

import { AREA_DEFAULTS, areasFrom } from "./area-model";
import type { GravelInput, GravelLayerInput } from "./compute";
import { DEFAULT_DELIVERY, DEFAULT_EXTRA_PCT, DEFAULT_PAYLOAD_LB, GRAVEL_USES, STONE_BAG_CUFT, aggregate, type GravelId } from "./data";

const TOP = aggregate("crusher");
const BASE = aggregate("57");

export const GRAVEL_DEFAULTS = {
  ...AREA_DEFAULTS,
  l1: 10,
  w1: 12,
  a1: 120,
  use: "pad",
  /** Known amount mode (shape "vol"): amount and unit. */
  vol: 5,
  vu: "yd",
  layers: 1,
  m1: TOP.id as string,
  d1: 4,
  c1: true,
  cf1: TOP.compaction ?? 1,
  den1: TOP.tonsPerYd,
  u1: TOP.sellBy as string,
  p1: TOP.price,
  bp1: TOP.bagPrice ?? 0,
  m2: BASE.id as string,
  d2: 4,
  c2: false,
  cf2: BASE.compaction ?? 1,
  den2: BASE.tonsPerYd,
  u2: BASE.sellBy as string,
  p2: BASE.price,
  bp2: BASE.bagPrice ?? 0,
  extra: DEFAULT_EXTRA_PCT,
  del: DEFAULT_DELIVERY,
  payload: DEFAULT_PAYLOAD_LB,
  buy: "auto",
};

export type GravelValues = typeof GRAVEL_DEFAULTS;

export interface LayerValues {
  m: string;
  d: number;
  c: boolean;
  cf: number;
  den: number;
  u: string;
  p: number;
  bp: number;
}

export function layerValues(v: GravelValues, n: 1 | 2): LayerValues {
  return n === 1
    ? { m: v.m1, d: v.d1, c: v.c1, cf: v.cf1, den: v.den1, u: v.u1, p: v.p1, bp: v.bp1 }
    : { m: v.m2, d: v.d2, c: v.c2, cf: v.cf2, den: v.den2, u: v.u2, p: v.p2, bp: v.bp2 };
}

/** Patch one layer's fields by short name, e.g. layerPatch(2, { d: 4 }) → { d2: 4 }. */
export function layerPatch(n: 1 | 2, p: Partial<LayerValues>): Partial<GravelValues> {
  const out: Record<string, string | number | boolean> = {};
  for (const [k, val] of Object.entries(p)) if (val !== undefined) out[`${k}${n}`] = val;
  return out as Partial<GravelValues>;
}

/** Reset a layer's weight, compaction and prices to the picked material's researched defaults. */
export function materialPatch(n: 1 | 2, id: string): Partial<GravelValues> {
  const m = aggregate(id);
  return layerPatch(n, { m: m.id, cf: m.compaction ?? 1, den: m.tonsPerYd, u: m.sellBy, p: m.price, bp: m.bagPrice ?? 0, c: !!m.compaction });
}

export function projectPatch(id: string): Partial<GravelValues> {
  const use = GRAVEL_USES.find((u) => u.id === id) ?? GRAVEL_USES[0];
  const [top, base] = use.layers;
  return {
    use: use.id,
    layers: base ? 2 : 1,
    ...materialPatch(1, top.material),
    d1: top.depthIn,
    c1: top.compacted,
    ...(base ? { ...materialPatch(2, base.material), d2: base.depthIn, c2: base.compacted } : {}),
  };
}

function layer(m: string, d: number, c: boolean, cf: number, den: number, u: string, p: number, bp: number): GravelLayerInput {
  return {
    material: aggregate(m).id as GravelId,
    depthIn: d,
    compacted: c,
    compaction: cf,
    tonsPerYd: den,
    unit: u === "yd" ? "yd" : "ton",
    price: p,
    bagPrice: bp,
  };
}

export function gravelInputFrom(v: GravelValues): GravelInput {
  const l1 = layer(v.m1, v.d1, v.c1, v.cf1, v.den1, v.u1, v.p1, v.bp1);
  const l2 = layer(v.m2, v.d2, v.c2, v.cf2, v.den2, v.u2, v.p2, v.bp2);
  const isVolume = v.shape === "vol";
  return {
    areas: areasFrom(v),
    count: v.count,
    volume: isVolume ? { amount: v.vol, unit: v.vu === "ton" ? "ton" : "yd" } : undefined,
    layers: !isVolume && v.layers >= 2 ? [l1, l2] : [l1],
    extraPct: v.extra,
    deliveryFee: v.del,
    payloadLb: v.payload,
    bagCuft: STONE_BAG_CUFT,
  };
}
