import type { CalculatorEntry } from "@/calculators/types";
import { backerBoardCalculator } from "./backer-board";
import { groutCalculator } from "./grout";
import { thinsetCalculator } from "./thinset";
import { tileCalculator } from "./tile";

// Calculators for this family are registered here.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const calculators: CalculatorEntry<any>[] = [tileCalculator, thinsetCalculator, groutCalculator, backerBoardCalculator];
