// Shared (server + client) model for the hot tub cost calculator.

import { computeHotTub, spaMaxStandbyW, stateInfo, type SpaKind } from "./compute";
import { SPA } from "./data";
import { RATE_DEFAULTS, rateOf } from "./rate-model";

export const HOT_TUB_DEFAULTS = {
  ...RATE_DEFAULTS,
  /** "standard" (hard shell) | "inflatable" */
  kind: "standard",
  gallons: 400,
  /** "max" = California Title 20 limit for this size | "label" = the tub's listed standby watts */
  standby: "max",
  labelW: Math.round(spaMaxStandbyW(400, "standard")),
  setpoint: SPA.testWaterF,
  /** "outdoor" | "indoor" */
  location: "outdoor",
  indoorF: 68,
};

export type HotTubValues = typeof HOT_TUB_DEFAULTS;

export function spaKind(v: HotTubValues): SpaKind {
  return v.kind === "inflatable" ? "inflatable" : "standard";
}

export function standbyWatts(v: HotTubValues): number {
  return v.standby === "label" ? v.labelW : spaMaxStandbyW(v.gallons, spaKind(v));
}

export function computeHotTubCalc(v: HotTubValues) {
  const rate = rateOf(v);
  const info = stateInfo(v.state);
  return {
    rate,
    info,
    maxW: spaMaxStandbyW(v.gallons, spaKind(v)),
    standbyW: standbyWatts(v),
    r: computeHotTub({
      standbyW: standbyWatts(v),
      setpointF: v.setpoint,
      location: v.location === "indoor" ? "indoor" : "outdoor",
      indoorF: v.indoorF,
      info,
      cents: rate.cents,
    }),
  };
}
