import type { CalculatorEntry } from "@/calculators/types";
import { airConditionerCalculator } from "./air-conditioner";
import { clothesDryerCalculator } from "./clothes-dryer";
import { dehumidifierCalculator } from "./dehumidifier";
import { electricityCostCalculator } from "./electricity-cost";
import { evChargingCalculator } from "./ev-charging";
import { hotTubCalculator } from "./hot-tub";
import { poolPumpCalculator } from "./pool-pump";
import { ratesCalculator } from "./rates";
import { refrigeratorCalculator } from "./refrigerator";
import { spaceHeaterCalculator } from "./space-heater";

// Calculators for this family are registered here.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const calculators: CalculatorEntry<any>[] = [
  electricityCostCalculator,
  ratesCalculator,
  spaceHeaterCalculator,
  airConditionerCalculator,
  evChargingCalculator,
  refrigeratorCalculator,
  clothesDryerCalculator,
  dehumidifierCalculator,
  poolPumpCalculator,
  hotTubCalculator,
];
