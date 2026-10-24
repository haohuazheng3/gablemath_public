import type { CalculatorEntry } from "@/calculators/types";
import { exteriorCalculator } from "./exterior";
import { roomCalculator } from "./room";
import { stainCalculator } from "./stain";

// Calculators for this family are registered here.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const calculators: CalculatorEntry<any>[] = [roomCalculator, exteriorCalculator, stainCalculator];
