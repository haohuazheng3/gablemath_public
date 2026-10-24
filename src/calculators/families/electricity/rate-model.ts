// Rate inputs shared by every electricity calculator (serialised to the URL like any other value).

import { resolveRate } from "./compute";
import { RATES } from "./data";

export const RATE_DEFAULTS = {
  /** "US" or a state code */
  state: "US",
  /** "ytd" | "month" | "custom" */
  rateMode: "ytd",
  /** user's own cents/kWh when rateMode is "custom" */
  cents: RATES.us.ytdCents,
};

export type RateValues = typeof RATE_DEFAULTS;

export function rateOf(v: RateValues) {
  return resolveRate(v);
}
