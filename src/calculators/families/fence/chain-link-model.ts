// Shared (server + client) model for the chain-link fence calculator.

import type { ChainLinkInput } from "./compute";
import { CHAIN_LINK, type MixId } from "./data";
import { LAYOUT_DEFAULTS, gatesFrom, runsFrom } from "./layout-model";

export const CHAIN_LINK_DEFAULTS = {
  ...LAYOUT_DEFAULTS,
  h: 4,
  sp: CHAIN_LINK.maxLineSpacingFt as number,
  tw: true,
  frost: 0,
  mix: "fs50",
};

export type ChainLinkValues = typeof CHAIN_LINK_DEFAULTS;

export function chainLinkInputFrom(v: ChainLinkValues): ChainLinkInput {
  return {
    runs: runsFrom(v),
    loop: v.loop,
    heightFt: v.h,
    spacingFt: v.sp,
    gates: gatesFrom(v),
    tensionWire: v.tw,
    frostIn: v.frost,
    mixId: (v.mix === "cm80" ? "cm80" : "fs50") as MixId,
  };
}
