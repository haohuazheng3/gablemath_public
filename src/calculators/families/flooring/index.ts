import type { CalculatorEntry } from "@/calculators/types";
import { baseboardCalculator } from "./baseboard";
import { carpetCalculator } from "./carpet";
import { flooringCalculator } from "./flooring";

// Calculators for this family are registered here.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const calculators: CalculatorEntry<any>[] = [flooringCalculator, carpetCalculator, baseboardCalculator];
