import type { CalculatorEntry } from "@/calculators/types";
import { metalCalculator } from "./metal";
import { pitchCalculator } from "./pitch";
import { roofingCalculator } from "./roofing";

// Calculators for this family are registered here.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const calculators: CalculatorEntry<any>[] = [roofingCalculator, pitchCalculator, metalCalculator];
