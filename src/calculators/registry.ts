import type { CalculatorEntry, CategorySlug } from "./types";
import { calcKey } from "./types";
import { calculators as concrete } from "./families/concrete";
import { calculators as landscaping } from "./families/landscaping";
import { calculators as paint } from "./families/paint";
import { calculators as flooring } from "./families/flooring";
import { calculators as tile } from "./families/tile";
import { calculators as fence } from "./families/fence";
import { calculators as roofing } from "./families/roofing";
import { calculators as electricity } from "./families/electricity";
import { calculators as solar } from "./families/solar";
import { calculators as quick } from "./quick";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const CALCULATORS: CalculatorEntry<any>[] = [
  ...concrete,
  ...landscaping,
  ...paint,
  ...flooring,
  ...tile,
  ...fence,
  ...roofing,
  ...electricity,
  ...solar,
  ...quick,
];

export function getCalculator(category: string, slug: string) {
  return CALCULATORS.find((c) => c.meta.category === category && c.meta.slug === slug);
}

export function getByKey(key: string) {
  return CALCULATORS.find((c) => calcKey(c.meta) === key);
}

export function calculatorsIn(category: CategorySlug) {
  return CALCULATORS.filter((c) => c.meta.category === category);
}
