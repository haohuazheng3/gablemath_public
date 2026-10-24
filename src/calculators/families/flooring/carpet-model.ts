// Shared (server + client) model for the carpet calculator: defaults and input mapping.

import type { CarpetInput, RunAlong } from "./compute";
import { CARPET, STAIR_DEFAULTS } from "./data";

export const CARPET_DEFAULTS = {
  mode: "room",
  l: 14,
  w: 12,
  roll: 12,
  orient: "auto",
  trim: CARPET.trimIn,
  doors: 1,
  doorW: 32,
  pad: true,
  padIn: 0.4375,
  steps: 13,
  stairW: STAIR_DEFAULTS.widthIn,
  tread: STAIR_DEFAULTS.treadIn,
  riser: STAIR_DEFAULTS.riserIn,
  labor: CARPET.laborPerSqft,
  stairLabor: CARPET.stairLaborPerStep,
  removal: false,
};

export type CarpetValues = typeof CARPET_DEFAULTS;

export function carpetInputFrom(v: CarpetValues): CarpetInput {
  const room = v.mode !== "stairs";
  const stairs = v.mode !== "room";
  return {
    room: room ? { l: v.l, w: v.w } : null,
    rollFt: v.roll === 13.5 || v.roll === 15 ? v.roll : 12,
    orient: v.orient === "length" || v.orient === "width" ? (v.orient as RunAlong) : "auto",
    trimIn: v.trim,
    doors: room ? v.doors : 0,
    doorWidthIn: v.doorW,
    pad: v.pad,
    stairs: stairs ? { steps: v.steps, widthIn: v.stairW, treadIn: v.tread, riserIn: v.riser } : null,
    laborPerSqft: v.labor,
    stairLaborPerStep: v.stairLabor,
    removal: v.removal,
  };
}
