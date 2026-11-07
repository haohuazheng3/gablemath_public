import type { CalculatorEntry } from "@/calculators/types";
import { chainLinkCalculator } from "./chain-link";
import { fenceCalculator } from "./fence";
import { fenceCostCalculator } from "./fence-cost";

// Calculators for this family are registered here.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const calculators: CalculatorEntry<any>[] = [fenceCalculator, chainLinkCalculator, fenceCostCalculator];
