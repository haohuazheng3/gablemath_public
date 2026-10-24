// Shared (server + client) model for the interior paint calculator: defaults and input mapping.

import type { RoomInput } from "./compute";
import { OPENING, scenario, type PrimerUse, type TextureId } from "./data";

export const ROOM_DEFAULTS = {
  rooms: 1,
  l1: 12,
  w1: 12,
  l2: 12,
  w2: 10,
  l3: 10,
  w3: 10,
  l4: 10,
  w4: 10,
  h: 8,
  doors: 1,
  windows: 2,
  doorW: OPENING.doorW as number,
  doorH: OPENING.doorH as number,
  winW: OPENING.windowW as number,
  winH: OPENING.windowH as number,
  blocked: 0,
  walls: true,
  ceiling: false,
  trim: false,
  closet: false,
  closetW: 5,
  closetD: 2,
  base: 6,
  casing: 3,
  doorSlabs: false,
  extraLf: 0,
  extraIn: 4,
  scenario: "same",
  coats: 2,
  primer: "none",
  deep: false,
  product: "typical",
  cov: 350,
  ceilProduct: "same",
  trimProduct: "same",
  primerProduct: "kilz2",
  texture: "smooth",
  popcorn: false,
  method: "roller",
  loss: 0,
  touchUp: false,
  pre1978: false,
};

export type RoomValues = typeof ROOM_DEFAULTS;

const PRIMER_USES: PrimerUse[] = ["none", "porous", "sealed", "spot"];
const TEXTURES: TextureId[] = ["smooth", "light", "heavy"];

export function roomInputFrom(v: RoomValues): RoomInput {
  const dims = [
    { l: v.l1, w: v.w1 },
    { l: v.l2, w: v.w2 },
    { l: v.l3, w: v.w3 },
    { l: v.l4, w: v.w4 },
  ];
  return {
    rooms: dims.slice(0, Math.min(4, Math.max(1, Math.round(v.rooms)))),
    heightFt: v.h,
    doors: v.doors,
    windows: v.windows,
    door: { w: v.doorW, h: v.doorH },
    window: { w: v.winW, h: v.winH },
    blockedSqFt: v.blocked,
    closet: v.closet ? { w: v.closetW, d: v.closetD } : null,
    walls: v.walls,
    ceiling: v.ceiling,
    trim: v.trim,
    baseboardIn: v.base,
    casingIn: v.casing,
    doorSlabs: v.doorSlabs,
    extraTrimLf: v.extraLf,
    extraTrimIn: v.extraIn,
    coats: v.coats,
    deepColor: v.deep,
    primer: PRIMER_USES.includes(v.primer as PrimerUse) ? (v.primer as PrimerUse) : scenario(v.scenario).primer,
    wallProductId: v.product,
    wallRate: v.cov,
    ceilingProductId: v.ceilProduct,
    trimProductId: v.trimProduct,
    primerProductId: v.primerProduct,
    texture: TEXTURES.includes(v.texture as TextureId) ? (v.texture as TextureId) : "smooth",
    popcornCeiling: v.popcorn,
    lossPct: v.loss,
    touchUp: v.touchUp,
    pre1978: v.pre1978,
  };
}
