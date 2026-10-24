// Shared (server + client) model for the baseboard calculator: defaults and input mapping.

import type { BaseboardInput, Rect } from "./compute";
import { BASEBOARD } from "./data";

export const MAX_ROOMS = 6;

export const BASEBOARD_DEFAULTS = {
  rooms: 1,
  l1: 12,
  w1: 12,
  l2: 10,
  w2: 10,
  l3: 10,
  w3: 10,
  l4: 10,
  w4: 10,
  l5: 10,
  w5: 10,
  l6: 10,
  w6: 10,
  extra: 0,
  doors: 1,
  doorW: 36,
  skip: 0,
  outside: 0,
  stock: 12,
  waste: BASEBOARD.wastePct,
  height: 5.25,
  coats: 2,
  qr: false,
  paint: true,
  labor: BASEBOARD.laborPerLf,
};

export type BaseboardValues = typeof BASEBOARD_DEFAULTS;

export function baseboardRooms(v: BaseboardValues): Rect[] {
  const dims: [number, number][] = [
    [v.l1, v.w1],
    [v.l2, v.w2],
    [v.l3, v.w3],
    [v.l4, v.w4],
    [v.l5, v.w5],
    [v.l6, v.w6],
  ];
  const n = Math.min(MAX_ROOMS, Math.max(1, Math.round(v.rooms)));
  return dims.slice(0, n).map(([l, w]) => ({ l, w }));
}

export function baseboardInputFrom(v: BaseboardValues): BaseboardInput {
  return {
    rooms: baseboardRooms(v),
    extraFt: v.extra,
    doors: v.doors,
    doorWidthIn: v.doorW,
    skipFt: v.skip,
    outsideCorners: v.outside,
    stockFt: v.stock === 8 || v.stock === 16 ? v.stock : 12,
    wastePct: v.waste,
    heightIn: v.height,
    coats: v.coats,
    quarterRound: v.qr,
    paint: v.paint,
    laborPerLf: v.labor,
  };
}
