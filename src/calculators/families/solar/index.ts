import type { CalculatorEntry } from "@/calculators/types";
import { solarPanelCalculator } from "./panel";
import { solarPaybackCalculator } from "./payback";

// Calculators for this family are registered here.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const calculators: CalculatorEntry<any>[] = [solarPanelCalculator, solarPaybackCalculator];
