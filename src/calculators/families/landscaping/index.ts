import type { CalculatorEntry } from "@/calculators/types";
import { gravelCalculator } from "./gravel";
import { mulchCalculator } from "./mulch";
import { paverBaseCalculator } from "./paver-base";
import { sandCalculator } from "./sand";
import { topsoilCalculator } from "./topsoil";

// Calculators for this family are registered here.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const calculators: CalculatorEntry<any>[] = [gravelCalculator, mulchCalculator, topsoilCalculator, sandCalculator, paverBaseCalculator];
