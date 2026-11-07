// Display helpers shared by the client calculators and server answers (imperial or metric).

import { fmt, fmtInt } from "@/lib/format";
import { CUFT_PER_CUM, CUFT_PER_CUYD, LB_PER_KG, LB_PER_SHORT_TON, SQFT_PER_SQM } from "@/lib/units";

const TONNES_PER_SHORT_TON = LB_PER_SHORT_TON / (LB_PER_KG * 1000);

export function volumeText(cuyd: number, metric: boolean, digits = 2): string {
  return metric ? `${fmt((cuyd * CUFT_PER_CUYD) / CUFT_PER_CUM, digits)} m³` : `${fmt(cuyd, digits)} cu yd`;
}

export function volumeValue(cuyd: number, metric: boolean): number {
  return metric ? (cuyd * CUFT_PER_CUYD) / CUFT_PER_CUM : cuyd;
}

export function cuftText(cuft: number, metric: boolean): string {
  return metric ? `${fmt(cuft / CUFT_PER_CUM, 2)} m³` : `${fmt(cuft, 1)} cu ft`;
}

export function tonsText(tons: number, metric: boolean, digits = 1): string {
  if (metric) return `${fmt(tons * TONNES_PER_SHORT_TON, digits)} t`;
  return `${fmt(tons, digits)} ${Math.abs(tons - 1) < 0.05 ? "ton" : "tons"}`;
}

export function tonsValue(tons: number, metric: boolean): number {
  return metric ? tons * TONNES_PER_SHORT_TON : tons;
}

export function areaText(sqft: number, metric: boolean): string {
  return metric ? `${fmt(sqft / SQFT_PER_SQM, 1)} m²` : `${fmtInt(sqft)} sq ft`;
}

export function weightText(lb: number, metric: boolean): string {
  return metric ? `${fmtInt(lb / LB_PER_KG)} kg` : `${fmtInt(lb)} lb`;
}

export function inchText(inches: number, metric: boolean): string {
  return metric ? `${fmt(inches * 2.54, 1)} cm` : `${fmt(inches, 2)} in`;
}

/** Indefinite article for a spoken number: "an 8-ft ring", "a 6-ft ring". */
export function article(n: number): "a" | "an" {
  const s = String(Math.round(n));
  return s.startsWith("8") || s === "11" || s === "18" ? "an" : "a";
}

/** Bag size label: 1.5 → "1.5 cu ft". */
export function bagSizeLabel(cuft: number): string {
  return `${fmt(cuft, 2)} cu ft`;
}

/** How the visitor plans to buy: cheapest of delivered bulk vs bags, or a fixed choice. */
export const BUY_OPTIONS = [
  { value: "auto", label: "Cheapest" },
  { value: "delivered", label: "Delivered" },
  { value: "pickup", label: "I'll haul" },
  { value: "bags", label: "Bags" },
];
