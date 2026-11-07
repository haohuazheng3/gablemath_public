import type { CalculatorEntry } from "@/calculators/types";
import { columnCalculator } from "./column";
import { footingCalculator } from "./footing";
import { postHoleCalculator } from "./post-hole";
import { slabCalculator } from "./slab";
import { stepsCalculator } from "./steps";

// Calculators for this family are registered here.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const calculators: CalculatorEntry<any>[] = [slabCalculator, footingCalculator, postHoleCalculator, columnCalculator, stepsCalculator];
