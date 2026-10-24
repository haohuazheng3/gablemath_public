// Shared (server + client) model for the topsoil calculator: defaults, material pricing and input mapping.

import { AREA_DEFAULTS, areasFrom } from "./area-model";
import { bagPriceFor, type SoilInput } from "./compute";
import { DEFAULT_DELIVERY, DEFAULT_EXTRA_PCT, DEFAULT_PAYLOAD_LB, SOIL_TYPES, SOIL_USES, soilType, type SoilId } from "./data";

const TOPSOIL = soilType("topsoil");

export const TOPSOIL_DEFAULTS = {
  ...AREA_DEFAULTS,
  l1: 20,
  w1: 10,
  a1: 200,
  mode: "area",
  use: "lawn",
  d: 4,
  /** Raised beds: inside length & width (ft), soil depth (in), number of beds. */
  bl: 8,
  bw: 4,
  bh: 12,
  beds: 1,
  mat: TOPSOIL.id as string,
  bag: 1,
  bp: TOPSOIL.bagPrice[1],
  bulk: TOPSOIL.bulkPerYd,
  del: DEFAULT_DELIVERY,
  settle: DEFAULT_EXTRA_PCT,
  payload: DEFAULT_PAYLOAD_LB,
  buy: "auto",
};

export type TopsoilValues = typeof TOPSOIL_DEFAULTS;

/**
 * Bag price for a soil and size. A 50/50 blend has no bagged product with a dated price, so it is
 * costed as half bagged topsoil and half bagged compost, per cubic foot (flagged as an estimate).
 */
export function soilBagPrice(id: string, size: number): { price?: number; estimated: boolean } {
  const s = soilType(id);
  if (s.id !== "blend") return bagPriceFor(s.bagPrice, size);
  const top = bagPriceFor(soilType("topsoil").bagPrice, 1).price;
  const comp = bagPriceFor(soilType("compost").bagPrice, 1).price;
  if (top == null || comp == null) return { estimated: true };
  return { price: Math.round(((top + comp) / 2) * size * 100) / 100, estimated: true };
}

export function materialPatch(id: string, bag: number): Partial<TopsoilValues> {
  const s = soilType(id);
  return { mat: s.id, bp: soilBagPrice(s.id, bag).price ?? 0, bulk: s.bulkPerYd };
}

export function soilUsePatch(id: string, bag: number): Partial<TopsoilValues> {
  const use = SOIL_USES.find((u) => u.id === id) ?? SOIL_USES[0];
  return { use: use.id, d: use.depthIn, ...materialPatch(use.material, bag) };
}

export function modePatch(mode: string): Partial<TopsoilValues> {
  return mode === "beds"
    ? { mode: "beds", bag: 1.5, buy: "bags", ...materialPatch("blend", 1.5) }
    : { mode: "area", bag: 1, buy: "auto", ...materialPatch("topsoil", 1) };
}

export function topsoilInputFrom(v: TopsoilValues): SoilInput {
  return {
    mode: v.mode === "beds" ? "beds" : "area",
    areas: areasFrom(v),
    count: v.count,
    depthIn: v.d,
    bed: { l: v.bl, w: v.bw, hIn: v.bh, count: v.beds },
    material: SOIL_TYPES.some((s) => s.id === v.mat) ? (v.mat as SoilId) : "topsoil",
    settlePct: v.settle,
    bagCuft: v.bag,
    bagPrice: v.bp,
    bulkPerYd: v.bulk,
    deliveryFee: v.del,
    payloadLb: v.payload,
  };
}
