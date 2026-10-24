import { blownIn } from "./tools/blown-in";
import { boardFoot } from "./tools/board-foot";
import { cubicYard } from "./tools/cubic-yard";
import { deck } from "./tools/deck";
import { drywall } from "./tools/drywall";
import { framing } from "./tools/framing";
import { insulation } from "./tools/insulation";
import { plywood } from "./tools/plywood";
import { squareFootage } from "./tools/square-footage";
import { tonsToYards } from "./tools/tons-yards";
import { balusters } from "./tools/balusters";
import { concreteWeight } from "./tools/concrete-weight";
import { epoxy, selfLeveler } from "./tools/floor-coatings";
import { brick, concreteBlock, mortar } from "./tools/masonry";
import { rebar } from "./tools/rebar";
import { stairs } from "./tools/stairs";
import { wallpaper } from "./tools/wallpaper";
import { btu, generator, heatingBtu } from "./tools/hvac";
import { electricBill, kwh, wattsAmps } from "./tools/power";
import { solarBattery } from "./tools/solar-battery";
import { gutter, siding } from "./tools/exterior";
import { pavers, retainingWall } from "./tools/hardscape";
import { grassSeed, sod } from "./tools/lawn";
import { asphalt, driveSealer, peaGravel, riverRock } from "./tools/stone-paving";
import type { QuickDef, QValues } from "./types";

// Every quick tool, keyed "category/slug". Imported by the QuickCalc client renderer.
const ALL = [
  squareFootage, cubicYard, tonsToYards, drywall, insulation, blownIn, boardFoot, framing, plywood, deck,
  concreteWeight, brick, concreteBlock, mortar, rebar, stairs, balusters, wallpaper, selfLeveler, epoxy,
  sod, grassSeed, pavers, retainingWall, peaGravel, riverRock, asphalt, driveSealer, siding, gutter,
  wattsAmps, kwh, electricBill, btu, heatingBtu, generator, solarBattery,
];

export const QUICK_DEFS: Record<string, QuickDef<QValues>> = Object.fromEntries(ALL.map((d) => [d.key, d as unknown as QuickDef<QValues>]));
