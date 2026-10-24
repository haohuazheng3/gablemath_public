// Shared (server + client) model for the EV charging cost calculator.

import { computeEv, kwh100FromMiPerKwh, stateInfo } from "./compute";
import { EV_MILES_DEFAULT, EV_MODELS, GAS_MPG_DEFAULT } from "./data";
import { RATE_DEFAULTS, rateOf } from "./rate-model";
import { US_INFO } from "./state-data";

export const EV_DEFAULTS = {
  ...RATE_DEFAULTS,
  /** an EV_MODELS id or "custom" */
  vehicle: "model-y-lr",
  /** custom efficiency unit: "kwh100" | "mikwh" */
  effUnit: "kwh100",
  customEff: 30,
  miles: EV_MILES_DEFAULT,
  /** "l2" | "l1" */
  level: "l2",
  /** use the state's EIA gasoline price */
  gasAuto: true,
  gasPrice: US_INFO.gasoline,
  mpg: GAS_MPG_DEFAULT,
};

export type EvValues = typeof EV_DEFAULTS;

export function evModel(id: string) {
  return EV_MODELS.find((m) => m.id === id);
}

export function evKwh100(v: EvValues): number {
  const m = evModel(v.vehicle);
  if (m) return m.kwh100;
  return v.effUnit === "mikwh" ? kwh100FromMiPerKwh(v.customEff) : v.customEff;
}

export function evGasPrice(v: EvValues): number {
  return v.gasAuto ? stateInfo(v.state).gasoline : v.gasPrice;
}

export function computeEvCalc(v: EvValues) {
  const rate = rateOf(v);
  const model = evModel(v.vehicle);
  return {
    rate,
    model,
    kwh100: evKwh100(v),
    gasPrice: evGasPrice(v),
    info: stateInfo(v.state),
    r: computeEv({
      kwh100: evKwh100(v),
      miles: v.miles,
      level: v.level === "l1" ? "l1" : "l2",
      cents: rate.cents,
      gasPrice: evGasPrice(v),
      mpg: v.mpg,
      range: model?.range,
    }),
  };
}
