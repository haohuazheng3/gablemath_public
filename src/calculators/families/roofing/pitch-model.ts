// Shared (server + client) model for the roof pitch calculator.

import type { PitchInput } from "./compute";

export const PITCH_DEFAULTS = {
  mode: "pitch",
  rise: 6,
  angle: 26.57,
  mRise: 6,
  mRun: 12,
  span: 28,
  oh: 12,
};

export type PitchValues = typeof PITCH_DEFAULTS;

export function pitchInputFrom(v: PitchValues): PitchInput {
  return {
    mode: v.mode === "angle" || v.mode === "measure" ? v.mode : "pitch",
    rise: v.rise,
    angleDeg: v.angle,
    measuredRiseIn: v.mRise,
    measuredRunIn: v.mRun,
    spanFt: v.span,
    overhangIn: v.oh,
  };
}
