// Shared (server + client) model for the sand calculator: defaults, sand-type pricing and input mapping.

import { AREA_DEFAULTS, areasFrom } from "./area-model";
import type { SandInput } from "./compute";
import { DEFAULT_DELIVERY, DEFAULT_EXTRA_PCT, DEFAULT_PAYLOAD_LB, SAND_BAGS, SAND_TONS_PER_YD, SAND_USES, sandType } from "./data";

const PLAY = sandType("play");

export const SAND_DEFAULTS = {
  ...AREA_DEFAULTS,
  l1: 5,
  w1: 5,
  a1: 25,
  use: "sandbox",
  vol: 1,
  vu: "yd",
  d: 6,
  sand: PLAY.id as string,
  bag: "50",
  bp: PLAY.bagPrice ?? 0,
  /** Bulk price and its unit; 0 = no bulk price for this sand. */
  bulkp: PLAY.bulk?.price ?? 0,
  bulku: (PLAY.bulk?.per ?? "ton") as string,
  den: SAND_TONS_PER_YD,
  del: DEFAULT_DELIVERY,
  extra: DEFAULT_EXTRA_PCT,
  payload: DEFAULT_PAYLOAD_LB,
  buy: "auto",
};

export type SandValues = typeof SAND_DEFAULTS;

export function sandPatch(id: string): Partial<SandValues> {
  const s = sandType(id);
  return { sand: s.id, bp: s.bagPrice ?? 0, bulkp: s.bulk?.price ?? 0, bulku: s.bulk?.per ?? "ton" };
}

export function sandUsePatch(id: string): Partial<SandValues> {
  const use = SAND_USES.find((u) => u.id === id) ?? SAND_USES[0];
  return { use: use.id, d: use.depthIn, ...sandPatch(use.sand) };
}

export function sandBag(id: string) {
  return SAND_BAGS.find((b) => b.id === id) ?? SAND_BAGS[1];
}

export function sandInputFrom(v: SandValues): SandInput {
  return {
    areas: areasFrom(v),
    count: v.count,
    volume: v.shape === "vol" ? { amount: v.vol, unit: v.vu === "ton" ? "ton" : "yd" } : undefined,
    depthIn: v.d,
    extraPct: v.extra,
    tonsPerYd: v.den,
    bag: sandBag(v.bag),
    bagOptions: SAND_BAGS,
    bagPrice: v.bp,
    bulk: v.bulkp > 0 ? { price: v.bulkp, per: v.bulku === "yd" ? "yd" : "ton" } : undefined,
    deliveryFee: v.del,
    payloadLb: v.payload,
  };
}
